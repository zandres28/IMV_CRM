:put "=== VALIDACION OLT 10G (SOLO LECTURA) ==="

:put "--- PUERTOS DEL BRIDGE ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/interface bridge port print detail where interface="sfp-sfpplus1"

:put "--- TRAFICO NUEVO UPLINK (sfp-sfpplus1) ---"
/interface monitor-traffic sfp-sfpplus1 once

:put "--- TRAFICO AGREGADO CLIENTES (metricas fiables) ---"
/queue simple print stats where name="QoS-Clientes"
:delay 5s
/queue simple print stats where name="QoS-Clientes"

:put "--- MACs CLIENTES aprendidas en puerto nuevo ---"
/interface bridge host print where interface=sfp-sfpplus1

:put "--- ARP CLIENTES (evitar 'failed' masivos) ---"
/ip arp print where interface="bridge1"

:put "--- CONECTIVIDAD ROUTER ---"
/ping 1.1.1.1 count=3
/ping 192.168.100.1 count=3

:put "--- DHCP: count leases y eventos recientes ---"
/ip dhcp-server lease print count-only
/log print where topics~"dhcp" count=20

:put "--- vlan1 (NO debe estar en sfp-sfpplus1) ---"
/interface vlan print detail where name=vlan1

:put "Esperado: sfp-sfpplus1 habilitado con trafico, MACs 80:F7 aprendidas, "
:put "1-LAN-OLT deshabilitado, QoS-Clientes > 0 y sin deassigns masivos."
:put "=== FIN VALIDACION ==="
