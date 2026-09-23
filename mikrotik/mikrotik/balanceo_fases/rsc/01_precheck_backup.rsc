:put "=== FASE 01: BACKUP OBLIGATORIO + PRECHECK ==="
:put "--- 0.1 BACKUP (obligatorio antes de tocar nada) ---"
/export file=pre_balanceo_claro_export
/system backup save name=pre_balanceo_claro
:put "-- Archivos creados --"
/file print where name~"pre_balanceo"

:put "--- 0.2 VERIFICAR BASELINE ---"
:put "-- Tablas (esperado main, to_WAN1, to_WAN2; falta to_WAN3) --"
/routing table print

:put "-- Rutas default --"
/ip route print detail where dst-address="0.0.0.0/0"

:put "-- IPs WAN Claro --"
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"

:put "-- Bridge ports (bridge_lan NO debe existir aun) --"
/interface bridge print detail
/interface bridge port print detail where interface="1-LAN-OLT"

:put "-- Mangle prerouting (estado antes) --"
/ip firewall mangle print detail where chain="prerouting"

:put "-- NAT srcnat (NO debe existir masq 11-WAN2/10-WAN3) --"
/ip firewall nat print detail where chain="srcnat"

:put "=== FASE 01 COMPLETADA ==="