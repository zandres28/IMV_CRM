# Plan de Balanceo — Dos Planes Claro (PCC) + Movistar como Respaldo Automático

**Router:** MikroTik CCR2116-12G-4S+ — Gestión única: **192.168.1.94** (bridge1) — RouterOS 7.23.2
**Objetivo:** Activar DOS planes de internet Claro en **balanceo de carga PCC 50/50** dejando **Movistar como respaldo automático** (solo si ambos Claro fallan).
**Ventana de corte estimada:** 5–10 min. La FASE 1 (saneamiento de gestión) desconecta clientes brevemente (renovación DHCP e IP nueva); la FASE 2 (balanceo) solo renueva conexiones.
**Estado del router previo (auditado 2026-08-11):** interfaces WAN deshabilitadas, IP de CLARO_2 estática `192.168.50.2` configurada y a la espera, huérfano `192.168.10.1/24` + `dhcp1` sobre bridge1.

---

## ✅ EJECUTADO — 2026-08-13 (contingencia: Movistar caído)

> **Motivo:** Movistar (WAN1) presentó caída; se activó el balanceo Claro en horario de servicio para mantener internet de clientes. Operación completa y validada con ONU de pruebas navegando normal.

### Cambios aplicados al router (estado final verificado 21:35)
1. **Backups previos:** `pre_balanceo_claro.backup/.rsc` (20:14). Post-operación: `post_balanceo_claro.backup/.rsc` (21:35, 150.5KiB).
2. **FASE 1 saneamiento:** recreado `bridge_lan` (bridge de clientes, protocol-mode=rstp). Puertos movidos bridge1→bridge_lan: `1-LAN-OLT`, `ether2/3/7/8/9`, `sfp-sfpplus2/3/4`. IP `192.168.10.1/24` y servidor `dhcp1` movidos a bridge_lan. `12-WAN1`, `13-conf`, `sfp-sfpplus1` quedaron en bridge1.
3. **FASE 2 balanceo:** tabla `to_WAN3` creada; rutas `Default WAN2 CLARO1` (192.168.40.1, d1) + `Backup WAN2 via MOVISTAR` (d2); `Default WAN3 CLARO2` (192.168.50.1, d1) + `Backup WAN3 via MOVISTAR` (d2). Interface list `LAN` = bridge_lan (se removió bridge1). Mangle: PCC retageado `PCC CLARO1 2/0`→WAN2_conn, `PCC CLARO2 2/1`→WAN3_conn (habilitado), `Route WAN1 MOVISTAR`, `Mark WAN3` (in-interface=10-WAN3) insertada antes de `Mark WAN1`, `Route WAN3` nueva; habilitado `Route WAN2`. NAT: `Masq CLARO_1` (11-WAN2) y `Masq CLARO_2` (10-WAN3) agregadas. `Clamp MSS WAN` (forward) agregada.
4. **FASE 2.5:** `11-WAN2` (DHCP → 192.168.40.4/24, gw 192.168.40.1) y `10-WAN3` (estática 192.168.50.2/24, gw 192.168.50.1) habilitadas.
5. **Rutas main del router (invertidas tras el incidente de WAN1):** `main`→CLARO_2 (192.168.50.1) **distance=5** (primaria local, ACTIVE) y `main`→Movistar (192.168.1.1) **distance=6** (respaldo, INACTIVE). Antes: Movistar d5 / CLARO_2 d6. Este cambio evita que al habilitar WAN1 el router desvíe su tráfico local a Movistar aunque siga caído.
6. **WAN1 (Movistar, 12-WAN1):** habilitada nuevamente el 2026-08-13 como **respaldo automático** (rutas d2/d6 con check-gateway=ping). Sin conflicto con el balanceo.
7. **Scripts .rsc por fase:** regenerados en `balanceo_fases/rsc/` (00-07) compatibles con `plink -m` (una línea por comando, sin `:foreach`/`:local` que rompen el parseo por SSH). Runner `run_balanceo_fase.ps1` actualizado a host `192.168.1.94` con fases: prerevision, backup, saneamiento, cutover, habilitar_wan, validacion, rollback, rollback_saneamiento.

### Notas de la operación
- **Gotcha plink -m:** los scripts con bucles `:foreach`/`:if` dan "expected closing brace" al pasarlos por SSH interactivo. Solo funcionan instrucciones lineales con `[find]` inline.
- **Incidente WAN1 (13-08):** al habilitar WAN1 con Movistar aún caído, la ruta `main`→Movistar (d5) se activó y el router desvió su tráfico local a un camino sin internet → inestabilidad percibida. NO afectó a clientes (usan PCC). Fix: invertir distancias de `main` (CLARO_2 d5, Movistar d6).
- **Leases clientes:** tras el saneamiento, los ONTs renuevan solos en `192.168.10.x` (~10-20 bound en los primeros 30 min). Reinicio manual solo para ONU aisladas que no renueven.
- **Balanceo verificado:** WAN2_conn≈WAN3_conn (~50/50, 1892 vs 2020), NAT Claro acumulando, egreso 0% pérdida (8.8.8.8 ~10ms), ONU de pruebas navegando normal.

---

## Contexto — saneamiento de gestión (raíz del problema "IP que cambia")

**Causa raíz encontrada (2026-08-12):** `bridge_lan_nueva` (bridge de clientes) **no existe** en el router — se perdió al restaurar un backup. Quedaron huérfanos sobre `bridge1`:
- IP `192.168.10.1/24` (asignada a bridge1, pero su bridge de origen desapareció)
- `dhcp1` (serve `192.168.10.x`) sobre bridge1

Como `bridge1` contiene también `12-WAN1` (cable del módem **Movistar 192.168.1.1**), el **DHCP del módem compite con `dhcp1`** en el mismo L2. Los clientes/PC de admin caen aleatoriamente en `192.168.1.x` o `192.168.10.x` → según cual tome tu PC, unas IPs de gestión "funcionan" y otras no (alternancia entre `192.168.1.94` y `192.168.10.1`).

**FASE 1 ya ejecutada hoy (2026-08-12, sin impacto a clientes):**
- Backup: `pre_fase1_gestion.backup` / `.rsc`
- DNAT principal OLT ampliado: `192.168.1.94:8080 → 192.168.100.1:80` ahora acepta `src 192.168.0.0/16` (antes solo `192.168.1.0/24`) → **la OLT ya se administra desde cualquier subred vía `.1.94`**. SSH OLT sigue por puerto `2222` (genérico).

**Meta de gestión resultante:** una sola IP de acceso **`192.168.1.94`** para el MikroTik (web/SSH/API) y para la OLT (`http://192.168.1.94:8080`, SSH `2222`).

---

## Topología de WANs (mapeo de puertos)

| WAN | Plan | Interfaz | IP en el router | Gateway | Método |
|-----|------|----------|-----------------|---------|--------|
| WAN1 | **Movistar** | 12-WAN1 (bridge1) | 192.168.1.94/24 | 192.168.1.1 | Estática (sin cambios) |
| WAN2 | **CLARO_1** | 11-WAN2 | 192.168.40.2/24 (dinámica) | 192.168.40.1 | DHCP client ya existe |
| WAN3 | **CLARO_2** | 10-WAN3 | 192.168.50.2/24 (estática) | 192.168.50.1 | IP ya configurada |

> Ambos módems Claro validados con **egreso real a internet** el 2026-08-11 (8.8.8.8 0% pérdida, ~11ms RTT, probado por rutas temporales `/32` sin tocar rutas globales).

---

## Arquitectura resultante (después de la noche)

```
bridge1  (WAN + gestión)            bridge_lan  (clientes, NUEVO/restaurado)
  12-WAN1 → Movistar 192.168.1.1        1-LAN-OLT (uplink OLT, pvid 100)
  192.168.1.94/24 (gestión única)       ether2, ether3, ether7, ether8, ether9
  13-conf, sfp-sfpplus1 (disabled)      sfp-sfpplus2/3/4
         │                              192.168.10.1/24 + dhcp1 (192.168.10.2-254)
         │  · puerto web OLT: 192.168.1.94:8080 → 192.168.100.1:80
         │  · SSH OLT:        192.168.1.94:2222  → 192.168.100.1:22
         ▼
   PCC prerouting (in-interface-list=LAN = bridge_lan)
        ├── 2/0 → connection-mark WAN2_conn → tabla to_WAN2 → CLARO_1 (192.168.40.1)
        └── 2/1 → connection-mark WAN3_conn → tabla to_WAN3 → CLARO_2 (192.168.50.1)

Movistar (tabla to_WAN1, gw 192.168.1.1):
  · tráfico local del router y bypass (main table, distance 5)
  · RESPALDO automático: rutas backup distance=2 + check-gateway=ping en to_WAN2 y to_WAN3
```

**Regla de proporción:** 50% de sesiones nuevas → CLARO_1, 50% → CLARO_2. Si una ruta Claro primaria muere, ese 50% pasa a Movistar vía backup, **sin tocar la otra Claro**.

> **Ventaja adicional del saneamiento:** al separar a los clientes en `bridge_lan`, el DHCP del módem Movistar **ya no alcanza a los ONTs** → termina el doble DHCP. La cola QoS `QoS-Clientes` (target `192.168.10.0/24`) sigue aplicando porque los clientes mantienen `192.168.10.x`.

---

## FASE 0 — PREPARACIÓN (sin impacto en clientes)

### 0.1 Backup obligatorio (ejecutar ANTES de tocar nada)

```routeros
/export file=pre_balanceo_claro_export
/system backup save name=pre_balanceo_claro
```

> Ya existen además `pre_fase1_gestion.backup` (2026-08-12) como punto de restauración parcial.

### 0.2 Baseline que debe estar presente (verificado en el audit)

```routeros
# Tablas de ruteo existentes
/routing table print
#   main (fib), to_WAN1 (fib), to_WAN2 (fib)  ← to_WAN3 hay que CREARLA

# Rutas default actuales
/ip route print detail where dst-address="0.0.0.0/0"
#   main     → 192.168.1.1  distance=5  (Local traffic default, activa)
#   to_WAN1  → 192.168.1.1  distance=1  (Default WAN1 via Movistar)
#   to_WAN2  → 192.168.40.1 distance=1  (Default WAN2, INACTIVA hasta habilitar 11-WAN2)

# IPs de las WAN Claro
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"
#   10-WAN3 → 192.168.50.2/24  (STATIC CLARO2, lista para usarse)

# Mangle actual (para validar el estado antes de tocar)
/ip firewall mangle print detail where chain="prerouting"

# Bridges actuales (debe verificar que bridge_lan NO existe aún)
/interface bridge print detail
```

### 0.3 Confirmar egreso de cada Claro (precheck)

> **Gotcha RouterOS 7.23:** `/ping` NO acepta `routing-table=` para probar salida directa. El método fiable es crear una ruta temporal `/32` en la tabla `main` con `distance=1`, ping, y removerla:

```routeros
# CLARO_2 (10-WAN3, estática 192.168.50.2)
/ip route add dst-address=8.8.8.8/32 gateway="192.168.50.1" distance=1 comment="TEMP EGRESS CLARO2"
/ping 8.8.8.8 count=4 interval=500ms
/ip route remove [find comment="TEMP EGRESS CLARO2"]

# CLARO_1 (11-WAN2, DHCP 192.168.40.2)
/ip route add dst-address=8.8.8.8/32 gateway="192.168.40.1" distance=1 comment="TEMP EGRESS CLARO1"
/ping 8.8.8.8 count=4 interval=500ms
/ip route remove [find comment="TEMP EGRESS CLARO1"]
```

> Resultados esperados: 0% pérdida, RTT <20ms en ambos. Si uno falla, NO continuar — el plan falla o se usa ese plan solo como observación.

### 0.4 Verificación gestión unificada (hecha en Fase 1 de hoy)

```routeros
# Regla DNAT unificada (debe existir)
/ip firewall nat print detail where comment="Access OLT unificado via 192.168.1.94"
# SSH OLT genérico
/ip firewall nat print detail where comment="Forward OLT SSH from LAN"
```

---

## FASE 1 — SANEAMIENTO DE GESTIÓN: recrear bridge de clientes (DESCONEXIÓN BREVE)

> ⚠️ **A partir de aquí los clientes pierden conexión ~1-3 min** mientras los ONTs renuevan DHCP en la nueva red.

### 1.1 Crear/restaurar el bridge de clientes

```routeros
/interface bridge add name="bridge_lan" protocol-mode=rstp fast-forward=yes
```

### 1.2 Mover los puertos de clientes desde bridge1 → bridge_lan

```routeros
# Uplink OLT (crítico: es el puerto donde entran todos los ONTs)
/interface bridge port set [find where interface="1-LAN-OLT"] bridge="bridge_lan"

# Puertos LAN de clientes (ajustar según cableado real — precheck físico)
/interface bridge port set [find where interface="ether2"] bridge="bridge_lan"
/interface bridge port set [find where interface="ether3"] bridge="bridge_lan"
/interface bridge port set [find where interface="ether7"] bridge="bridge_lan"
/interface bridge port set [find where interface="ether8"] bridge="bridge_lan"
/interface bridge port set [find where interface="ether9"] bridge="bridge_lan"
/interface bridge port set [find where interface="sfp-sfpplus2"] bridge="bridge_lan"
/interface bridge port set [find where interface="sfp-sfpplus3"] bridge="bridge_lan"
/interface bridge port set [find where interface="sfp-sfpplus4"] bridge="bridge_lan"
```

> ⚠️ **NO mover `12-WAN1`, `13-conf` ni `sfp-sfpplus1`** (sfp-sfpplus1 es el puerto OLT 10G, mantiene su estado disabled `nexum-stage-olt10g`). Antes de mover, confirmar con `/interface bridge port print detail` qué puertos están en bridge1 y cuál es el cableado físico.

### 1.3 Mover IP huérfana y dhcp1 al bridge de clientes

> La IP `192.168.10.1/24` y el servidor `dhcp1` pasan de bridge1 → bridge_lan. **No se crean IPs nuevas** (se "mueven") para que los clientes mantengan `192.168.10.x` y QoS siga aplicando.

```routeros
# Mover la IP huérfana 192.168.10.1 al bridge_lan
/ip address set [find where address="192.168.10.1/24"] interface="bridge_lan"

# Mover el servidor DHCP al bridge_lan
/ip dhcp-server set [find where name="dhcp1"] interface="bridge_lan"
```

### 1.4 Deshabilitar DHCP del módem Movistar (OPCIONAL — recomendado)

- Entrar a `http://192.168.1.1` (módem Movistar) y **desactivar su servidor DHCP**.
- El módem queda solo como gateway WAN (`192.168.1.1`).
- Los clientes que hoy tienen `192.168.1.x` del módem pasarían a `192.168.10.x` al renovar. **Recomendado** para eliminar el doble DHCP definitivamente.
- **Nota:** si NO se desactiva el DHCP del módem y los clientes ya están separados en bridge_lan, el módem ya no podrá alcanzarlos por L2 (bridge_lan está fuera del dominio de broadcast de bridge1) → el conflicto desaparece igualmente.

### 1.5 Verificación del saneamiento

```routeros
# bridge_lan poblado y sin huérfanos en bridge1
/interface bridge port print detail where interface="1-LAN-OLT" or interface="ether2" or interface="ether3" or interface="ether7" or interface="ether8" or interface="ether9" or interface="sfp-sfpplus2" or interface="sfp-sfpplus3" or interface="sfp-sfpplus4"
# Las IP de gestión: 192.168.1.94 (bridge1) y 192.168.10.1 (bridge_lan)
/ip address print detail where interface="bridge1" or interface="bridge_lan"
# Leases renovando en 192.168.10.x
/ip dhcp-server lease print where address~"192.168.10."
# Gestión única alcanzable
/ping 192.168.1.94 count=3
# OLT accesible (web + ssh)
/tool fetch url="http://192.168.1.94:8080/" keep-result=yes dst-path="olt_check.txt"
```

> ⚠️ Importante: el `fetch` desde el propio router a `192.168.1.94:8080` puede dar `connection refused` por hairpin NAT — **no es señal de falla**. La validación real es desde una PC admin: `http://192.168.1.94:8080` y `ssh -p 2222 admin@192.168.1.94`.

---

## FASE 2 — CUTOVER BALANCEO (ventana de corte: renovación de conexiones)

### 2.1 Crear tabla de ruteo to_WAN3 (CLARO_2)

```routeros
/routing table add name="to_WAN3" fib
```

### 2.2 Rutas default por tabla

```routeros
# to_WAN2 (CLARO_1) — primaria + backup Movistar
/ip route set [find comment="Default WAN2"] comment="Default WAN2 CLARO1" distance=1 check-gateway=ping
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN2 gateway=192.168.1.1 distance=2 check-gateway=ping comment="Backup WAN2 via MOVISTAR"

# to_WAN3 (CLARO_2) — primaria + backup Movistar
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN3 gateway=192.168.50.1 distance=1 check-gateway=ping comment="Default WAN3 CLARO2"
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN3 gateway=192.168.1.1 distance=2 check-gateway=ping comment="Backup WAN3 via MOVISTAR"
```

### 2.3 Mangle — marcar retorno y PCC entre las dos Claro

Orden final del prerouting (índices relativos al estado post-Fase 1):

```
#0  Skip_OLT          (sin cambio)
#1  Mark WAN2         in-interface=11-WAN2     → WAN2_conn  (retorno CLARO_1)
#2  Mark WAN3  [NUEVA] in-interface=10-WAN3     → WAN3_conn  (retorno CLARO_2)
#3  Mark WAN1         in-interface=bridge1      → WAN1_conn  (retorno/local Movistar)
#4  PCC 2/0           in-interface-list=LAN     → WAN2_conn  (sesiones pares  → CLARO_1)
#5  PCC 2/1           in-interface-list=LAN     → WAN3_conn  (sesiones impares → CLARO_2)
#6  Route WAN1        connection-mark=WAN1_conn → routing to_WAN1 (passthrough=no)
#7  Route WAN2        connection-mark=WAN2_conn → routing to_WAN2 (passthrough=no)
#8  Route WAN3 [NUEVA] connection-mark=WAN3_conn → routing to_WAN3 (passthrough=no)
```

```routeros
# La interface-list LAN debe incluir bridge_lan (y ya no depender de bridge1 para clientes)
/interface list member add list="LAN" interface="bridge_lan"  # si no estuviera ya
/interface list member remove [find list="LAN" and interface="bridge1"]  # bridge1 = solo WAN/mgmt

# Ajustar PCC existentes: WAN1 → CLARO_1 (2/0), WAN2 → CLARO_2 (2/1)
/ip firewall mangle set [find comment="PCC WAN1"] new-connection-mark="WAN2_conn" comment="PCC CLARO1 2/0"
/ip firewall mangle set [find comment="PCC WAN2"] new-connection-mark="WAN3_conn" comment="PCC CLARO2 2/1"
/ip firewall mangle enable [find comment="PCC CLARO2 2/1"]
/ip firewall mangle enable [find comment="Route WAN2"]
/ip firewall mangle set [find comment="Route WAN1"] comment="Route WAN1 MOVISTAR"

# Marcar retorno de CLARO_2 (in-interface 10-WAN3)
/ip firewall mangle add chain=prerouting action=mark-connection new-connection-mark="WAN3_conn" passthrough=yes in-interface="10-WAN3" comment="Mark WAN3"
/ip firewall mangle move [find comment="Mark WAN3"] [find comment="Mark WAN1"]

# Ruta por marca de CLARO_2
/ip firewall mangle add chain=prerouting action=mark-routing new-routing-mark="to_WAN3" passthrough=no connection-mark="WAN3_conn" dst-address-type=!local comment="Route WAN3"
```

### 2.4 NAT — masquerade por cada WAN Claro (CRÍTICO: NO existen hoy)

> Audit confirmó que NO hay masquerade para `out-interface=11-WAN2` ni `10-WAN3`. Sin esto, el tráfico balanceado saldría sin NAT y se rompería.

```routeros
/ip firewall nat add chain=srcnat action=masquerade out-interface="11-WAN2" comment="Masq CLARO_1"
/ip firewall nat add chain=srcnat action=masquerade out-interface="10-WAN3" comment="Masq CLARO_2"
```

> El masquerade por `bridge1` (Movistar/actual) se mantiene — cubre local + retorno Movistar + respaldo.

### 2.5 Habilitar interfaces WAN físicas

```routeros
/interface ethernet enable [find name="11-WAN2"]
/interface ethernet enable [find name="10-WAN3"]
```

> Al habilitar 11-WAN2, el DHCP client `client1` (ya existente) renueva y obtiene `192.168.40.2/24`. La IP de 10-WAN3 ya está configurada (`192.168.50.2/24`, flag I → A).

### 2.6 MSS clamp (TCP)

```routeros
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS WAN"
```

---

## FASE 3 — VALIDACIÓN (primeros 5 min post-cutover)

```routeros
# 1. Rutas default activas y backups
/ip route print detail where dst-address="0.0.0.0/0"

# 2. IPs de las WAN (ambas deben estar A/activas)
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"

# 3. Balanceo: conteos de conexiones por marca (deben crecer similares)
/ip firewall connection print count-only where connection-mark="WAN2_conn"
/ip firewall connection print count-only where connection-mark="WAN3_conn"

# 4. NAT de las Claro procesando paquetes
/ip firewall nat print stats where out-interface="11-WAN2" or out-interface="10-WAN3"

# 5. Egreso desde el router
/ping 1.1.1.1 count=5

# 6. Mangle con contadores (PCC 2/0 y 2/1 subiendo)
/ip firewall mangle print stats where comment~"PCC CLARO"
```

**Escenario de failover (respaldo Movistar) — probar con una Claro sola:**
```routeros
# Desconectar la primaria CLARO_1 y verificar que sus sesiones pasan a Movistar
/ip route disable [find comment="Default WAN2 CLARO1"]
/ip firewall connection print count-only where connection-mark="WAN2_conn"
# Las conexiones WAN2_conn deben seguir saliendo (ahora via MOVISTAR backup)
# Re-activar
/ip route enable [find comment="Default WAN2 CLARO1"]
```

**Criterio de éxito:**
- Ambas IPs WAN activas y gateways Claro con 0% pérdida
- `WAN2_conn` y `WAN3_conn` creciendo en rangos similares
- NAT `11-WAN2` y `10-WAN3` incrementando bytes
- Ping 1.1.1.1 OK; speedtest desde LAN debe mostrar suma de los dos planes Claro
- Clientes en `192.168.10.x`, gestión única `192.168.1.94`, OLT vía `.1.94:8080`/`:2222`

---

## FASE 4 — ROLLBACK

### Rollback rápido (devuelve balanceo a Movistar puro, lógico)

```routeros
# Deshabilitar marcas de ruta Claro
/ip firewall mangle disable [find comment="PCC CLARO1 2/0"]
/ip firewall mangle disable [find comment="PCC CLARO2 2/1"]
/ip firewall mangle disable [find comment="Route WAN2"]
/ip firewall mangle disable [find comment="Route WAN3"]
/ip firewall mangle disable [find comment="Mark WAN3"]
# Quitar NAT de Claro
/ip firewall nat disable [find comment="Masq CLARO_1"]
/ip firewall nat disable [find comment="Masq CLARO_2"]
# Deshabilitar WAN físicas
/interface ethernet disable [find name="11-WAN2"]
/interface ethernet disable [find name="10-WAN3"]
```

> Con esto todo el tráfico de clientes vuelve a Movistar (main default, distance 5). Las tablas to_WAN2/to_WAN3 quedan sin uso. **El balanceo se revierte sin pérdida de servicio.**

### Rollback del saneamiento (bridge_lan)

> Solo si la FASE 1 falla. Devuelve los puertos de clientes a bridge1 y la IP/dhcp a su estado huérfano original.

```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge="bridge1"
/interface bridge port set [find where interface="ether2"] bridge="bridge1"
/interface bridge port set [find where interface="ether3"] bridge="bridge1"
/interface bridge port set [find where interface="ether7"] bridge="bridge1"
/interface bridge port set [find where interface="ether8"] bridge="bridge1"
/interface bridge port set [find where interface="ether9"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus2"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus3"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus4"] bridge="bridge1"
/ip address set [find where address="192.168.10.1/24"] interface="bridge1"
/ip dhcp-server set [find where name="dhcp1"] interface="bridge1"
/interface bridge remove [find where name="bridge_lan"]
```

### Rollback total (último recurso)

```routeros
/system backup load name=pre_balanceo_claro.backup
```
> Restaura el estado auditado previo a la noche. Requiere reinicio del router. (El punto intermedio `pre_fase1_gestion.backup` restaura solo la Fase 1 ya aprobada.)

---

## NOTAS IMPORTANTES Y GOTCHAS

| Punto | Detalle |
|-------|---------|
| **`/ping` no acepta `routing-table`** | En RouterOS 7.23.2 da `bad parameter`. Para probar egreso por un plan usa la ruta temporal `/32` (Fase 0.3) o rutas reales por tabla. |
| **Masquerade por WAN falta** | El audit mostró que hoy NO existe NAT para `11-WAN2`/`10-WAN3`. Sin la regla 2.4, el balanceo no funciona. |
| **Retorno por in-interface** | Las reglas `Mark WAN2`/`Mark WAN3` (in-interface) deben ir ANTES del `Mark WAN1` (bridge1) para que el retorno de cada Claro vuelva por su tabla. La regla `Mark WAN1` marca lo que entra por bridge1 (local + respaldo) → `to_WAN1`. |
| **check-gateway=ping en primarias** | Se cambió la primaria WAN2 a `check-gateway=ping` para que el fallback a Movistar sea automático. `to_WAN1` (Movistar) puede quedarse en `none`. |
| **PCC vs tráfico ya establecido** | PCC solo reparte sesiones NUEVAS. Las conexiones ya establecidas se mantienen por su tabla tras el cutover. |
| **CLARO_1 usa DHCP** | El DHCP client `client1` en 11-WAN2 ya existe. NO crear duplicados; la IP dinámica dependerá del módem (192.168.40.x). |
| **CLARO_2 es estática** | IP `192.168.50.2/24` ya configurada en 10-WAN3 con el módem en LAN estática `192.168.50.1`. Validado el 2026-08-11. |
| **MSS clamp** | Se agrega en cutover para evitar fragmentación en flujos TCP con MTU alta por los dos planes. |
| **vlan1 (192.168.101.x)** | Sin cambios. No interfiere con el balanceo (solo gestión OLT). |
| **Fase 1 = desconexión breve esperada** | Los ONTs pierden L2 al mover `1-LAN-OLT` y renuevan DHCP en `192.168.10.x`. Algunos CPEs pueden requerir reinicio manual (mismo comportamiento del checklist PCC de abril). |
| **Hairpin NAT en fetch** | Probar OLT desde el propio router con `fetch` a `.1.94:8080` puede dar `connection refused` — es esperado. Validar desde una PC admin. |
| **No eliminar `192.168.10.1` sin bridge_lan** | Si se elimina la IP y `dhcp1` sin recrear el bridge de clientes, los ONTs caen al DHCP del módem y **pierden QoS/balanceo** (QoS-Clientes apunta a `192.168.10.0/24`). El saneamiento MUEVE, no elimina. |
| **Gestión única `.1.94`** | Fase 1 de hoy ya unificó: DNAT OLT acepta `src 0.0.0.0/0`-ish (`192.168.0.0/16`). `192.168.10.1` deja de usarse como entrada humana (queda solo como gateway de clientes en bridge_lan). |

---

## POST-BALANCEO (días después, sin urgencia)

1. Monitorear 48–72h: counters PCC simétricos, NAT por WAN, logs de gateway down, leases `192.168.10.x` estables.
2. Validar con speedtest que la suma de throughput ≈ ambos planes Claro.
3. Confirmar que el módem Movistar no sigue entregando `192.168.1.x` (desactivar su DHCP si no se hizo en la Fase 1).
4. Limpiar reglas antiguas deshabilitadas del balanceo anterior y renombrar PCC/Route (Fase 4 del checklist PCC historico).
5. Fijar programa de mantenimiento: CLARO_1 y CLARO_2 no deberían compartir infraestructura física (evitar que el proveedor derribe ambos en un mismo corte).
6. Guardar backup nuevo tras estabilizar: `post_balanceo_claro`.

---

*Generado: 11 de agosto de 2026 — estado auditado: 2026-08-12 (Fase 1 de gestión ejecutada: DNAT OLT unificado en `.1.94`, backups `pre_fase1_gestion`). WANs deshabilitadas, IP CLARO_2 estática lista. Ejecutar en ventana segura (madrugada).*