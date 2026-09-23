# Migración Uplink OLT: GE4 (1G) → SFP+ (10G) — PLAN DEFINITIVO

**Fecha de revisión:** 2026-08-11 (tarde) — **Estado: NO EJECUTAR AÚN. Aplicar en madrugada.**

> Este plan reemplaza las versiones anteriores y recoge **toda** la evidencia de los 2 intentos fallidos del 2026-08-11. El objetivo es que el próximo cutover sea a prueba de errores.

---

## 1. Cronología real de los intentos (del log del router)

| Hora | Evento | Resultado |
|------|--------|-----------|
| 10:06–10:16 | Links flapping (1-LAN-OLT, ether2, ether5, 12-WAN1) y power outage previo | ONUs re-registran y renuevan DHCP a las 10:16 (~35 clientes `80:F7:A6:B7:*`) |
| 11:17:18 | Se agrega `sfp-sfpplus1` al bridge1 como bridge port **disabled** | staging OK |
| 11:17:28 | `interface set sfp-sfpplus1 disabled=no` (interfaz física activa) | link 10G a las 11:17:30 |
| 11:18:38 | **CUTOVER #1**: disable bridge port 1-LAN-OLT + enable sfp-sfpplus1 | ❌ **FALLO en ~3 min** |
| 11:21:40 | **ROLLBACK #1**: sfp-sfpplus1 off + 1-LAN-OLT on | clientes vuelven |
| 11:28–11:34 | Varios intentos de scripts con sintaxis errónea (`find`, llaves, etc.) | errores de scripting |
| 11:34:54 | **CUTOVER #2**: 1-LAN-OLT off + sfp-sfpplus1 on | ❌ **FALLO silencioso, duró 3h19m** |
| 11:42:40 | **vlan1 se mueve a sfp-sfpplus1** vía Winbox (`l3-hw-offloading=yes`) | punto de inflexión del fallo |
| 11:47 | `fetch speed.hetzner.de` → **resolving error** | DNS roto en la ruta SFP+ |
| 12:01–12:02 | **~35 leases DHCP expiran/deassign masivo** (los de las 10:16, lease 30m) | clientes sin internet |
| 14:53:50 | **ROLLBACK #2** (manual): sfp-sfpplus1 off + 1-LAN-OLT on + **vlan1 devuelta a 1-LAN-OLT** | recuperación DHCP en <60s |
| 14:54:52 | 3 clientes renuevan DHCP inmediatamente | ✅ confirmado |

**Conclusión de la cronología:** el cutover #2 funcionó a nivel de enlace físico (10G up) pero **rompió el plano de datos de los clientes** (DHCP/DNS/ARP). El único cambio config que coincide con el fallo y con la recuperación es **`vlan1`** sobre el mismo puerto físico que transporta el tráfico de clientes.

---

## 2. Causa raíz del fallo persistente (cutover #2)

La interfaz **`vlan1`** (VLAN ID 100, `use-service-tag=yes`, `l3-hw-offloading=yes`, IP `192.168.101.1/24`) se movió a **`sfp-sfpplus1`** a las 11:42:40 mientras ese puerto era bridge port de `bridge1` (vlan-filtering=no).

- Con `l3-hw-offloading=yes` sobre un puerto que además es bridge port HW-offloaded del mismo bridge, el switch del CCR2116 reconfigura el camino del puerto en hardware; el resultado es que las tramas de clientes (untagged, VLAN 100) que llegan por `sfp-sfpplus1` dejan de procesarse correctamente por el bridge.
- Evidencia: el ARP mostraba `192.168.101.1 → 80:F7:A6:B7:6A:4B` (un cliente ONU respondiendo la IP propia del router) y `192.168.10.134` con el **mismo MAC** — síntoma de conflicto/captura del tráfico de clientes por vlan1.
- En el estado actual (vlan1 en `1-LAN-OLT`) el servicio funciona porque vlan1 quedó "dormida" (0 bps, tráfico de clientes es untagged y no la toca).

**Regla de oro para el próximo cutover: `vlan1` NO se toca. Permanece en `1-LAN-OLT`.** Solo se intercambian los **bridge ports**.

---

## 3. Dato crítico de topología: la OLT puentea GE4 y XGE1 (riesgo de loop confirmado)

El vecino LLDP muestra que el router **se ve a sí mismo** por ambos puertos:

```
sfp-sfpplus1   → neighbor CCR2116, interface-name "bridge1/1-LAN-OLT"
1-LAN-OLT      → neighbor CCR2116, interface-name "sfp-sfpplus1"
```

Esto confirma que **GE4 y XGE1 de la OLT están en el mismo dominio L2** (la OLT reenvía tramas entre ambos). Consecuencias:

1. **Nunca habilitar ambos bridge ports simultáneamente.** El orden correcto es deshabilitar uno ANTES de habilitar el otro (los scripts ya lo hacen). RSTP (bridge1 `protocol-mode=rstp`) es el respaldo si algo falla, pero NO se depende de él.
2. Durante el cutover, la OLT seguirá reenviando tráfico hacia el puerto GE4 (que queda como bridge port deshabilitado). El router lo descarta. Es seguro pero desperdicia backplane de la OLT.
3. **Optimización post-cutover (una vez confirmado el 10G estable):** deshabilitar `ge 0/0/4` en la OLT (vía API `port_vlan_modify` o UI) o desconectar el cable. Elimina por completo el camino de loop y el eco. **No hacerlo durante el mismo cutover** — mantener GE4 como respaldo físico hasta validar.

---

## 4. Estado verificado AHORA (baseline de certeza, 2026-08-11 15:10)

### Router (CCR2116, RouterOS 7.23.2, uptime 7h, admin@192.168.1.94)
- `bridge1`: `vlan-filtering=no`, `protocol-mode=rstp`, HW-offload activo. Raíz RSTP = el propio bridge1.
- Bridge port `1-LAN-OLT`: **enabled**, `pvid=100`, HW-offload. ← activo
- Bridge port `sfp-sfpplus1`: **disabled**, `pvid=100`, comentario `nexum-stage-olt10g`. ← inactivo
- Interfaz `sfp-sfpplus1`: link **10Gbps full duplex**, DAC `CAB-10GSFP-P1M` (OEM, 1m), `sfp-rx-loss=no`, `sfp-tx-fault=no`. Link físico PERFECTO.
- `vlan1`: VLAN 100, `use-service-tag=yes`, `l3-hw-offloading=yes`, IP `192.168.101.1/24`, **interface=1-LAN-OLT** (correcto, NO mover).
- DHCP: `dhcp1` en bridge1, lease 30m, pool 192.168.10.2-254, DNS 8.8.8.8/8.8.4.4. Lease actuales: 5 `bound`.
- `QoS-Clientes` (192.168.10.0/24): tráfico real activo (rate ~700kbps a la hora de la medición). Métrica fiable de navegación de clientes.
- Backups en router: `nexum-pre-cutover-0811-1118.backup`, `nexum-olt10g-0811-1136.backup` + export, `nexum-ok-qos-0806-0912.backup`.

### OLT (C-Data, vía API `http://192.168.10.1:8080/cgi-bin/h.cgi`)
- **`xge 0/0/1` (Index 786433): `VlanMode=1` (access), `Pvid=100`, `Tag=""`, `Untag="100"`** ✅ IDÉNTICO a GE4
- **`ge 0/0/4` (Index 786432): `VlanMode=1`, `Pvid=100`, `Tag=""`, `Untag="100"`** ✅
- `vlan_list`: VLAN 100 → `Untag=[ge 0/0/4, xge 0/0/1]`, `Tag=[gpon 0/0/1..16]`. ✅
- GPONs: `VlanMode=2` (trunk), `Tag="1,100"`, `Untag=""`. PVID varía (100 en 1,2,3,4,7,11,12,14; 1 en el resto) — **no bloqueante**.
- 88 ONUs registradas. Online por puerto: 0/0/2=25, 0/0/4=13, 0/0/1=9, 0/0/11=2, 0/0/12=1, 0/0/14=1, 0/0/10=1, 0/0/5=1.
- Backup OLT generado: `WK-OLT-16PG-B2_20260811-1515_config.cfg` (+ tar.gz).

**Ambos puertos uplink están configurados idénticos. El problema NO está en la OLT.**

---

## 5. Pre-check de certeza (ejecutar justo antes del cutover)

Todo debe dar OK antes de tocar nada. Checklist:

1. **Link SFP+:** `/interface ethernet monitor sfp-sfpplus1 once` → `link-ok`, `10Gbps`, `full-duplex`.
2. **Bridge ports:** `/interface bridge port print where interface="1-LAN-OLT"` (enabled, pvid=100) y `... sfp-sfpplus1` (disabled, pvid=100).
3. **`vlan1` NO está en sfp-sfpplus1:** `/interface vlan print detail` → `interface=1-LAN-OLT`. Si apunta a sfp-sfpplus1, **corregir ANTES de cortar**.
4. **OLT XGE1 == GE4:** verificar vía API `port_vlan_list` que `786433` (xge 0/0/1) y `786432` (ge 0/0/4) sean `VlanMode=1, Pvid=100, Untag=100`.
5. **Baseline DHCP:** `/ip dhcp-server lease print count-only` (anotar el número actual, hoy ~5).
6. **Baseline tráfico:** `/queue simple print stats where name="QoS-Clientes"` (anotar rate actual).
7. **Backup fresco:** crear backup inmediato antes de cortar:
   ```
   /system backup save name=nexum-pre-cutover-final
   /export file=nexum-pre-cutover-final-export
   ```
8. **Confirmar ventana:** madrugada, cliente XVR renueva cada 15m (normal). Sin otras tareas WAN/OLT en curso.

---

## 6. Procedimiento de cutover (orden estricto)

### 6.1 Ejecutar pre-check (sección 5)
Si algún punto falla → **detenerse y revisar**, NO cortar.

### 6.2 Cutover (script `01_CUTOVER_OLT_10G.rsc`)
```
/interface bridge port disable [find interface=1-LAN-OLT]
:delay 500ms
/interface bridge port enable [find interface=sfp-sfpplus1]
```
**NO ejecutar ningún otro comando sobre `vlan1` ni sobre la interfaz `sfp-sfpplus1`** (solo el bridge port). `vlan1` queda donde está (1-LAN-OLT).

### 6.3 Validación (script `03_VALIDAR_OLT_10G.rsc`, ventana crítica 5–10 min)
Indicadores de éxito (en orden de fiabilidad):
1. **DHCP sigue renovando:** monitorear log ~5 min buscando `assigned`/`deassigned` de MACs `80:F7:A6:B7:*`. Si se ven deassigns masivos → fallo.
2. **Tráfico de clientes:** `/queue simple print stats where name="QoS-Clientes"` → rate NO debe caer a 0 sostenidamente.
3. **MACs de clientes aprendidas en el puerto nuevo:** `/interface bridge host print where interface=sfp-sfpplus1` → debe listar MACs `80:F7:A6:B7:*`.
4. **ARP resuelve:** `/ip arp print where interface="bridge1"` → sin estados `failed` masivos.
5. **1-LAN-OLT deshabilitado:** `/interface bridge port print where interface="1-LAN-OLT"` → flag `X`.
6. **Interfaz física OK:** `/interface monitor-traffic sfp-sfpplus1 once` → tráfico real > 0.

**Regla de decisión:** si tras 5 min el tráfico de `QoS-Clientes` es 0 y/o hay deassigns DHCP masivos → **ROLLBACK inmediato** (script `02`).

### 6.4 Post-validación (30 min después)
- Confirmar que las ONUs renovaron DHCP (lease count estable, sin deassigns masivos).
- Medir velocidad: fetch a Cloudflare / clientes con `80:F7:A6:B7:*` navegando.
- **Solo entonces** considerar deshabilitar `ge 0/0/4` en la OLT (opcional, en ventana posterior).

---

## 7. Rollback (script `02_ROLLBACK_OLT_10G.rsc`) — < 2s

```
/interface bridge port disable [find interface=sfp-sfpplus1]
:delay 500ms
/interface bridge port enable [find interface=1-LAN-OLT]
```
- **NO tocar `vlan1`** (queda en 1-LAN-OLT, que es el estado que funciona).
- Verificación post-rollback: `QoS-Clientes` con tráfico > 0 y DHCP renovando (hoy confirmado: recupera en <60s).

---

## 8. Gotchas de RouterOS (ya comprobados)

- **`find where interface="X"` NO funciona** en plink batch (devuelve vacío). Usar **`[find interface=X]`** sin `where` ni comillas, inline.
- **`find` en `:local`/`:set` devuelve vacío** aunque `:put` muestre el ID. Usar disable/enable inline.
- El ping a IPs de clientes individuales da timeout (bloquean ICMP). La métrica fiable es **tráfico agregado `QoS-Clientes`** + **eventos DHCP en el log**.
- `bridge1` con `vlan-filtering=no` reenvía L2 puro sin tags. La segmentación VLAN vive en la **OLT**.
- `vlan1` (`use-service-tag=yes`, `l3-hw-offloading=yes`) en el puerto activo = **interferencia comprobada**. Es el error que rompió el cutover #2.

---

## 9. Qué NO hacer (lecciones de los intentos fallidos)

- ❌ **NO mover `vlan1` a `sfp-sfpplus1`.** Causa del fallo #2. Queda en `1-LAN-OLT`.
- ❌ **NO habilitar ambos bridge ports a la vez.** Riesgo de loop (la OLT puentea GE4↔XGE1).
- ❌ **NO usar `find where`** en scripts de plink (devuelve vacío).
- ❌ **NO desconectar GE4 en la OLT durante el cutover** — solo tras validar 10G estable.
- ❌ **NO juzgar el cutover por el ping a clientes** (bloquean ICMP) ni por el link del SFP+ (sube aunque falle el plano de datos).

---

## 10. Respaldo de referencia

- `nexum-pre-cutover-0811-1118.backup` — estado antes del cutover #1
- `nexum-olt10g-0811-1136.backup` / `-export.rsc` — estado con SFP+ activo (cutover #2)
- `nexum-ok-qos-0806-0912.backup` — QoS corregido (pcq-rate 900M)
- Backup OLT: `WK-OLT-16PG-B2_20260811-1515_config.cfg` / `.tar.gz`
