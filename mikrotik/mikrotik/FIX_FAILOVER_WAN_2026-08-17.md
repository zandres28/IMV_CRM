# Fix Failover WAN Automático + Rename 11-WAN2 + Lecciones Sintaxis (2026-08-17)

> Sesión de trabajo completa del 2026-08-17 sobre la MikroTik CCR2116-12G-4S+ (192.168.1.94). Detalle del incidente CLARO_1 en `INCIDENTE_CLARO1_2026-08-17.md`.

## CONTEXTO DEL PROYECTO
- Router: MikroTik CCR2116-12G-4S+, RouterOS 7.23.2, IP 192.168.1.94, usuario admin, clave IMV*2025*
- plink: `C:\Program Files\PuTTY\plink.exe`
- Hostkey SSH: `ssh-rsa 2048 SHA256:xHR9VAY1bfITBTvkucySm9Qdz5omAwcNqHJ5c1XjFHg`
- Patrón de conexión:
  ```
  & 'C:\Program Files\PuTTY\plink.exe' -batch -hostkey 'ssh-rsa 2048 SHA256:xHR9VAY1bfITBTvkucySm9Qdz5omAwcNqHJ5c1XjFHg' -ssh -pw 'IMV*2025*' 'admin@192.168.1.94' '<comando>'
  ```
  (también funciona con `-m archivo.rsc`)
- WANs:
  - `11-WAN2` = CLARO_1 (DHCP 192.168.40.2/24, gw 192.168.40.1)
  - `10-WAN3` = CLARO_2 (estática 192.168.50.2/24, gw 192.168.50.1)
  - `12-WAN1-BACKUP` = Movistar (gw 192.168.1.1)
- Clientes por `1-LAN-OLT` (bridge_lan, 192.168.10.0/24)

## DIAGNÓSTICO REALIZADO (solo-lectura, luego los cambios fueron aprobados)
- Balanceo PCC sano: reparto 50/50 de conexiones nuevas (contadores 671M vs 668M paquetes), pcq-rate=900M correcto, sin drops ni errores.
- Pruebas de velocidad reales:
  - CLARO_1 (11-WAN2): 93-126 Mbps bajada.
  - CLARO_2 (10-WAN3): hasta 137 Mbps con speed.hetzner.de (speedtest.tele2.net daba 24-44 Mbps por limitación del servidor).
- Plans contratados supuestos: CLARO_1=950M, CLARO_2=900M (NO validados; un solo flujo TCP no satura).
- El reparto de ancho de banda fluctúa 23-77% porque PCC divide por conexión, no por bytes.

## INCIDENTE DE LA MAÑANA (2026-08-17)
- Secuencia del log:
  - 08:55:23 → `12-WAN1-BACKUP` link down
  - 08:56:14 → `11-WAN2` (CLARO_1) link down
  - 08:56:41 → `12-WAN1-BACKUP` link up
  - 09:38:24 → `11-WAN2` link up (CLARO_1 caído ~42 min)
- Causa raíz: el script **WAN-Check** estaba roto (ping a interfaz inexistente `12-WAN1`, y manipulaba rutas equivocadas deshabilitando el respaldo de tabla main). Ese script nunca se ejecutaba (run-count=0, sin scheduler) pero era una bomba de tiempo.
- `check-gateway=ping` a gateway local NO detecta caída silenciosa (módem con link pero sin internet).
- Ping con `interface=ether11` da falso negativo (usa tabla main, sin ruta a 8.8.8.8 por esa interfaz).
- `routing-table` NO es parámetro válido en `/ping` ni en `/tool netwatch` de RouterOS 7.23.2.

## CAMBIOS APLICADOS (fix failover WAN, hoy)
1. **ELIMINADO** el script WAN-Check.
2. **CREADAS rutas host de prueba en main:**
   - `1.1.1.1/32` → gw 192.168.40.1 (Probe CLARO1, sale por 11-WAN2)
   - `9.9.9.9/32` → gw 192.168.50.1 (Probe CLARO2, sale por 10-WAN3)
3. **CREADOS scripts de failover:** `WAN2-down`, `WAN2-up`, `WAN3-down`, `WAN3-up` (policy=`read,write,test,policy,sensitive`). Cada uno verifica con 3 pings (interval 0.3s) a su IP de prueba y desactiva/activa la ruta primaria de la tabla `to_WAN*` por comment (`"Default WAN2 CLARO1"` / `"Default WAN3 CLARO2"`).
4. **CREADO netwatch:**
   - host `1.1.1.1` (interval 10s, timeout 3s, start-delay 30s, up-script=`WAN2-up`, down-script=`WAN2-down`)
   - host `9.9.9.9` (similar, scripts WAN3)
   - Ambos status=up.
- Comportamiento: cuando Claro cae silenciosamente, se deshabilita la ruta primaria y el backup **MOVISTAR (distancia 2)** toma el relevo en ~10s. Los clientes ven menos velocidad (por Movistar) pero sin cortes.
- Backup previo a cambios: `pre-fix-wancheck-20260817.backup`.
- Scripts .rsc usados:
  - `C:\Users\PC\AppData\Local\Temp\opencode\fix_fase1.rsc` (eliminar WAN-Check + rutas probe)
  - `fix_fase2.rsc` (scripts + netwatch)
- Nota: la primera versión de fase2 falló porque `log` no es policy válida; la versión final usa policy=`read,write,test,policy,sensitive`.

## RENAME DE INTERFAZ (ether11 → 11-WAN2)
- El usuario renombró la interfaz `ether11` → `11-WAN2`.
- VERIFICADO que no rompió nada:
  - Las rutas probe usan gateway por IP (RouterOS actualizó `immediate-gw` automáticamente a `11-WAN2`, siguen As/activas).
  - Netwatch apunta a IPs.
  - Scripts usan comments y pings por tabla de rutas.
  - Mangle/NAT/DHCP se actualizaron solos a `11-WAN2`.
  - No queda ninguna referencia a `ether11` en la config exportada.
- El rename también "arregló" el script `DDNS-WAN2-NoIP` que usaba `interface=11-WAN2` (antes apuntaba a nombre inexistente).

## LECCIONES DE SINTAXIS RouterOS 7.23.2
- `/ping` NO acepta `routing-table`.
- `/tool netwatch` NO acepta `routing-table`.
- `/interface monitor-traffic` usa flag `once` (no `once=yes`): `/interface monitor-traffic interface=X once`.
- `/queue simple monitor` falla con "bad command name monitor" → usar `/queue simple print stats`.
- Policy de scripts válidas: `read,write,test,policy,sensitive` (log NO es válida).
- `/system script add` con policy vía `:local` variable también falla → hardcodear la policy.