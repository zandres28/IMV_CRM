# Checklist de Migración — Balanceo PCC Real (Madrugada)

**Router:** MikroTik CCR2116-12G-4S+ — IP: 192.168.1.9 — RouterOS 7.19.1  
**Objetivo:** Mover `1-LAN-OLT` de `bridge1` a `bridge_lan_nueva` para que el balanceo PCC (WAN1/WAN2 50/50) aplique a todos los clientes de la OLT.  
**Ventana de corte estimada:** 1–3 minutos (tiempo que tardan los CPEs en renovar DHCP)

---

## FASE 0 — PREPARACIÓN (antes del cambio, sin impacto en clientes)

### 1. Backup obligatorio

```routeros
/export file=pre_migracion_pcc_final
/system backup save name=pre_migracion_pcc_final
```

> Guarda dos copias: un export de texto plano y un backup binario completo.
> Si algo sale mal, el rollback total es cargar este backup.

---

### 2. Ampliar red de bridge_lan_nueva de /24 a /22

La red actual `10.50.0.0/24` soporta hasta 253 clientes. Para soportar todos los clientes de la OLT se amplía a `/22` (1022 hosts).

```routeros
/ip address set [find where interface=bridge_lan_nueva] address=10.50.0.1/22
/ip pool set [find where name=pool_lan_nueva] ranges=10.50.0.10-10.50.3.254
/ip dhcp-server network set [find where address~"10.50.0.0"] address=10.50.0.0/22 gateway=10.50.0.1 dns-server=8.8.8.8,8.8.4.4
```

---

### 3. Verificar baseline antes del cambio

Anotar estos valores para comparar después de la migración.

```routeros
# Cuántos clientes tiene DHCP actualmente
/ip dhcp-server lease print count-only

# Estado de las reglas PCC PILOTO
/ip firewall mangle print stats where comment~"PILOTO"

# Conexiones marcadas en WAN1 y WAN2 (deben ser similares para balanceo OK)
/ip firewall connection print count-only where connection-mark=WAN1_conn
/ip firewall connection print count-only where connection-mark=WAN2_conn
```

---

## FASE 1 — EJECUCIÓN (ventana de corte, ~1-3 min de interrupción)

> ⚠️ **A partir de este comando, los clientes pierden conexión brevemente hasta renovar DHCP.**

### Comando crítico único: mover 1-LAN-OLT al bridge de clientes

```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge_lan_nueva
```

**Qué hace este comando:**
- Saca `1-LAN-OLT` (ether1, uplink desde la OLT) del `bridge1` donde estaba mezclada con `12-WAN1`
- La agrega a `bridge_lan_nueva` donde ya están configuradas las reglas PCC PILOTO
- Los clientes pasan a recibir IPs en rango `10.50.x.x` en vez de `192.168.1.x`
- El DHCP server `dhcp_lan_nueva` comienza a atender a todos los clientes de la OLT

---

## FASE 2 — VALIDACIÓN (primeros 5 minutos post-cambio)

### Verificar que los clientes están llegando con IP nueva

```routeros
/ip dhcp-server lease print where address~"10.50."
```

### Verificar que el balanceo está funcionando

```routeros
/ip firewall connection print count-only where connection-mark=WAN1_conn
/ip firewall connection print count-only where connection-mark=WAN2_conn
```

> Ambos contadores deben crecer. No tienen que ser exactamente iguales (PCC balancea por sesión, no por byte).

### Verificar salida a internet desde el router

```routeros
/ping 1.1.1.1 count=5
```

### Verificar que las reglas NAT están procesando paquetes

```routeros
/ip firewall nat print stats where chain=srcnat
```

> Buscar la regla "Masq LAN nueva piloto" con `src-address=10.50.0.0/22`. Los bytes deben aumentar.

**Lo que se espera ver:**
- Leases con `10.50.x.x` aumentando progresivamente
- Ambos `connection-mark` con conteos similares
- Ping a `1.1.1.1` responde OK
- NAT procesando paquetes de `10.50.0.0/22`

---

## FASE 3 — ROLLBACK

### Rollback rápido (1 comando, revierte solo el cambio crítico)

```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge1
```

> Devuelve `1-LAN-OLT` al `bridge1` original. Los clientes recuperan IPs `192.168.1.x` al renovar DHCP.

### Rollback total (último recurso)

```routeros
/system backup load name=pre_migracion_pcc_final.backup
```

> Restaura toda la configuración al estado previo a la migración. **Requiere reinicio del router.**

---

## ESTADO EJECUTADO — 28 de abril de 2026

### Fase 0 completada

- `bridge_lan_nueva` quedó en `10.50.0.1/22`
- `pool_lan_nueva` quedó en `10.50.0.10-10.50.3.254`
- DHCP network quedó en `10.50.0.0/22`
- Reglas NAT y firewall de LAN nueva quedaron alineadas a `/22`
- Backup previo generado: `pre_phase0_expand_to_22`

### Fase 1 ejecutada

El cambio crítico ya fue aplicado:

```routeros
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge_lan_nueva
```

Estado confirmado:

- `1-LAN-OLT` ya pertenece a `bridge_lan_nueva`
- `12-WAN1` permanece en `bridge1`

### Fase 2 validada

Resultado observado inmediatamente después del cambio:

- DHCP entregando leases en `10.50.0.x`
- PCC marcando conexiones por ambas WAN
- NAT de LAN nueva procesando tráfico
- Ping a `1.1.1.1` exitoso
- OLT `192.168.100.1` accesible por ping y HTTP desde MikroTik
- Rutas `to_WAN1` y `to_WAN2` con `check-gateway=ping`
- Backups cruzados activos por tabla

Ejemplo de validación usada:

```routeros
/ip dhcp-server lease print where address~"10.50."
/ip firewall connection print count-only where connection-mark=WAN1_conn
/ip firewall connection print count-only where connection-mark=WAN2_conn
/ping 1.1.1.1 count=5
/ping 192.168.100.1 count=5
/tool fetch url="http://192.168.100.1" keep-result=no mode=http
```

### Observación operativa

- Los clientes migran al rango `10.50.x.x` a medida que renuevan DHCP.
- Si algún CPE sigue con IP vieja o presenta navegación parcial, normalmente requiere renovación DHCP o reinicio del equipo.

---

## NOTAS IMPORTANTES

| Punto | Detalle |
|-------|---------|
| **Renovación DHCP** | La mayoría de CPEs/ONTs renuevan automáticamente al recuperar link. Los que no, requieren reinicio manual del CPE |
| **IPs nuevas** | Clientes pasan de `192.168.1.x` → `10.50.x.x`. Avisar al equipo de soporte antes del cambio |
| **PCC activo automático** | Las reglas PILOTO ya están configuradas con `in-interface=bridge_lan_nueva`. Funcionan automáticamente cuando la OLT entre por ese bridge |
| **Rango 10.50.x.x y exclusión PCC** | La regla "Exclude LAN" excluye `192.168.0.0/16`. El rango `10.50.x.x` **no está excluido** — correcto, entra al balanceo |
| **vlan1 (192.168.101.x)** | Puede quedar huérfana temporalmente. Revisar si hay dispositivos de gestión en esa red antes del cambio |
| **bridge1 después del cambio** | Queda solo con `12-WAN1`. Esto es el estado deseado para la siguiente fase de limpieza |
| **OLT DHCP snooping** | La OLT tiene `dhcp snooping trust` en `ge 0/0/4` (uplink hacia MikroTik). El DHCP server `dhcp_lan_nueva` en MikroTik responde correctamente por ese uplink |

---

## POST-MIGRACIÓN (días siguientes, sin urgencia)

Una vez confirmado que todo funciona correctamente:

1. **Eliminar/deshabilitar reglas PCC viejas** — reglas 0, 4, 6, 7, 8 (actualmente deshabilitadas con `X`)
2. **Renombrar reglas "PILOTO"** → nombres definitivos (quitar sufijo PILOTO)
3. **Sacar `12-WAN1` de `bridge1`** y asignarle IP directamente (Fase 4 del plan original)
4. **Ajustar NAT** — dejar solo masquerade por `12-WAN1` + `11-WAN2` físicas, eliminar masquerade por `bridge1`
5. **Limpiar bridge1** — quedará vacío o se puede eliminar

---

## Resumen de arquitectura resultante

```
OLT (192.168.100.1)
  └── ge 0/0/4 (uplink, VLAN 100, access)
        └── 1-LAN-OLT (ether1 MikroTik)
              └── bridge_lan_nueva (10.50.0.1/22)
                    ├── DHCP server: dhcp_lan_nueva (pool 10.50.0.10–10.50.3.254)
                    ├── PCC PILOTO → mark WAN1_conn / WAN2_conn
                    ├── Routing: tabla to_WAN1 (gateway 192.168.1.1)
                    └── Routing: tabla to_WAN2 (gateway 192.168.40.1)

WAN1 (12-WAN1) → bridge1 → gateway 192.168.1.1
WAN2 (11-WAN2) → directo → gateway 192.168.40.1
```

---

## ANEXO — Estabilización previa (Speedtest y failover PCC)

### Cambios aplicados hoy en MikroTik

1. Se creó respaldo previo a los ajustes:

```routeros
/export file=pre_hardening_speedtest_fix
/system backup save name=pre_hardening_speedtest_fix
```

2. Se añadieron rutas de respaldo cruzadas para las tablas PCC:

```routeros
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN1 gateway=192.168.40.1 distance=2 check-gateway=ping comment="Backup to_WAN1 via WAN2"
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN2 gateway=192.168.1.1 distance=2 check-gateway=ping comment="Backup to_WAN2 via WAN1"
```

3. Se añadió ajuste de MSS para reducir errores de socket en flujos TCP:

```routeros
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS WAN"
```

### Estado verificado

- Regla `Clamp MSS WAN` activa y con contadores incrementando.
- Rutas backup de `to_WAN1` y `to_WAN2` activas con `distance=2` y `check-gateway=ping`.
- Conectividad por ambas WAN validada con ping desde IP origen de cada WAN.

### Nota operativa importante

- Las rutas primarias `Default WAN1` y `Default WAN2` quedaron en `check-gateway=none`.
- Aun así, el failover por tabla ya mejora gracias a las rutas backup cruzadas.

---

## ANEXO — Laboratorio WAN2 Aislado (sin impacto a clientes)

Objetivo: validar estabilidad real de WAN2 antes de volver a ponerla en rotacion PCC.

### Principios de seguridad

1. No mover bridges, no tocar DHCP, no habilitar reglas PCC de WAN2 para clientes.
2. Ejecutar pruebas desde la propia MikroTik usando `interface=11-WAN2`.
3. Iniciar en modo solo monitoreo (logs), sin acciones automaticas sobre rutas.

### Scheduler de monitoreo WAN2 (solo logs)

Se deja un scheduler directo (sin script intermedio) para evitar errores de parseo y mantener el laboratorio estable.

```routeros
/system scheduler add name="wan2_test_every_2m" interval=2m disabled=no on-event=":log info \"WAN2_LAB START\"; /ping 1.1.1.1 interface=11-WAN2 count=10 interval=300ms; /ping 8.8.8.8 interface=11-WAN2 count=10 interval=300ms; /ping 9.9.9.9 interface=11-WAN2 count=10 interval=300ms; :log info \"WAN2_LAB END\";"
```

### Verificacion del laboratorio

```routeros
/system scheduler print where name="wan2_test_every_2m"
/log print where message~"WAN2_LAB"
```

### Estado ejecutado (28-abr-2026) - Prueba WAN2 en ether10

Se migro el laboratorio de WAN2 desde `11-WAN2` hacia `ether10` para aislar posibles fallas fisicas del puerto original.

Cambios aplicados:

1. `ether10` se saco del `bridge1` para uso dedicado WAN2.
2. DHCP client de laboratorio se configuro en `ether10` con comentario `WAN2 DHCP LAB ether10`.
3. En WinBox quedo validado: `Enabled`, `Use Peer DNS=yes`, `Use Peer NTP=yes`, `Add Default Route=yes`, `Status=bound`.
4. El scheduler `wan2_test_every_2m` se actualizo para probar por `interface=ether10`.

Estado validado en pruebas recientes:

1. DHCP en `ether10`: `bound` con IP dinamica `192.168.40.4/24`.
2. Gateway `192.168.40.1`: 0% perdida en ping.
3. Internet por `ether10` (1.1.1.1, 8.8.8.8, 9.9.9.9): respuesta correcta en la ultima verificacion (0% perdida).

Comandos de verificacion usados:

```routeros
/ip dhcp-client print detail where interface="ether10"
/ip address print detail where interface="ether10"
/ping 192.168.40.1 interface=ether10 count=10
/ping 1.1.1.1 interface=ether10 count=10
/ping 8.8.8.8 interface=ether10 count=10
/ping 9.9.9.9 interface=ether10 count=10
```

Comando de prueba manual aislada desde WAN2:

```routeros
/ping 1.1.1.1 interface=11-WAN2 count=20
```

### Ventana de observacion recomendada

1. Ejecutar 48 a 72 horas sin cambios de produccion.
2. Revisar que no haya rafagas de fallas repetitivas (por ejemplo, `ok-targets=0/3` o `1/3` de forma recurrente).
3. Si WAN2 es estable durante toda la ventana, recien pasar a una fase controlada de failout/failback.

### Prueba con punto fisico dedicado (opcional)

Si deseas validar con un equipo de laboratorio fisico:

1. Conectar una laptop/miniPC a un puerto LAN libre de MikroTik.
2. Crear una marca de ruteo temporal solo para la IP de laboratorio y enviarla por `to_WAN2`.
3. Ejecutar pruebas de navegacion, DNS y latencia en ese equipo.
4. Al finalizar, deshabilitar la regla temporal para que no quede activa.

Ejemplo de regla temporal (ajustar IP del equipo de laboratorio):

```routeros
/ip firewall mangle add chain=prerouting src-address=10.50.3.250 action=mark-routing new-routing-mark=to_WAN2 passthrough=no comment="LAB_ONLY force WAN2"
```

Limpieza al terminar:

```routeros
/ip firewall mangle disable [find where comment="LAB_ONLY force WAN2"]
```
- Si se requiere failover estricto de primarias, conviene programar una ventana corta para re-crear esas 2 rutas con `check-gateway=ping` desde consola interactiva y validar en vivo.

---

*Generado: 27 de abril de 2026*
