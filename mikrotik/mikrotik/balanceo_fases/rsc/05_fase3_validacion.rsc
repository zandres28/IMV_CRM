:put "=== FASE 05: VALIDACION POST-CUTOVER (primeros 5 min) ==="

:put "--- 1. RUTAS DEFAULT activas y backups ---"
/ip route print detail where dst-address="0.0.0.0/0"

:put "--- 2. IPs WAN (ambas activas A) ---"
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"

:put "--- 3. BALANCEO: conteo conexiones por marca ---"
:put ("> WAN2_conn count: ")
/ip firewall connection print count-only where connection-mark="WAN2_conn"
:put ("> WAN3_conn count: ")
/ip firewall connection print count-only where connection-mark="WAN3_conn"
:put ("> WAN1_conn count (respaldo/local): ")
/ip firewall connection print count-only where connection-mark="WAN1_conn"

:put "--- 4. NAT de las Claro procesando ---"
/ip firewall nat print stats where out-interface="11-WAN2" or out-interface="10-WAN3"

:put "--- 5. EGRESO desde el router ---"
/ping 1.1.1.1 count=5
/ping 8.8.8.8 count=5

:put "--- 6. MANGLE con contadores (PCC CLARO) ---"
/ip firewall mangle print stats where comment~"PCC CLARO" or comment~"Mark WAN" or comment~"Route WAN"

:put "--- 7. LEASES CLIENTES 192.168.10.x ---"
/ip dhcp-server lease print count-only where status=bound and address~"192.168.10."

:put "-- GESTION Y OLT (validar desde PC admin: http://192.168.1.94:8080 y ssh -p 2222) --"
/ping 192.168.1.94 count=3

:put "=== FASE 05 COMPLETADA ==="
:put "CRITERIO DE EXITO: 0% perdida en pings, conteos WAN2/WAN3 similares y creciendo, NAT con bytes."