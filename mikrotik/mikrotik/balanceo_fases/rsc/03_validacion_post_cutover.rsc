:put "=== FASE 03: VALIDACION POST-CUTOVER ==="

:put "--- LEASES EN 10.50.x ---"
/ip dhcp-server lease print count-only where status=bound and address~"10.50."
/ip dhcp-server lease print where status=bound and address~"10.50."

:put "--- MARCAS PCC WAN1/WAN2 ---"
/ip firewall connection print count-only where connection-mark=WAN1_conn
/ip firewall connection print count-only where connection-mark=WAN2_conn

:put "--- NAT STATS SRCNAT ---"
/ip firewall nat print stats where chain=srcnat

:put "--- PING INTERNET DESDE ROUTER ---"
/ping 1.1.1.1 count=5

:put "--- TRAFICO WAN2 ---"
/interface monitor-traffic 11-WAN2 once

:put "--- RUTAS DEFAULT (main + tablas) ---"
/ip route print detail where dst-address="0.0.0.0/0"

:put "--- EJECUTAR MONITOR ONCE ---"
/system script run pcc_monitor_once

:put "=== FASE 03 COMPLETADA ==="