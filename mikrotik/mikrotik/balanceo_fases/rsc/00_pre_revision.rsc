:put "=== FASE 00: PRE-REVISION ESTADO (SOLO LECTURA) ==="
:put "Fecha/Hora del router:"
/system clock print

:put "--- ROUTING TABLES ---"
/routing table print

:put "--- DEFAULT ROUTES ---"
/ip route print detail where dst-address="0.0.0.0/0"

:put "--- IPs WAN CLARO ---"
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"

:put "--- INTERFACES WAN ---"
/interface ethernet print where name~"10-WAN3" or name~"11-WAN2"

:put "--- BRIDGES ---"
/interface bridge print detail

:put "--- BRIDGE PORTS (todas) ---"
/interface bridge port print detail

:put "--- MANGLE PREROUTING ---"
/ip firewall mangle print detail where chain="prerouting"

:put "--- MANGLE FORWARD ---"
/ip firewall mangle print detail where chain="forward"

:put "--- NAT SRCNAT ---"
/ip firewall nat print detail where chain="srcnat"

:put "--- NAT DSTNAT ---"
/ip firewall nat print detail where chain="dstnat"

:put "--- DHCP CLIENTS ---"
/ip dhcp-client print detail

:put "--- IP 192.168.10.1 y DHCP ---"
/ip address print detail where address~"192.168.10.1"
/ip dhcp-server print detail

:put "--- LEASES 192.168.10.x ---"
/ip dhcp-server lease print count-only where status=bound and address~"192.168.10."

:put "--- INTERFACE LIST LAN ---"
/interface list member print detail where list="LAN"

:put "=== FASE 00 COMPLETADA ==="