:put "=== PRECHECK OLT 10G (SOLO LECTURA) ==="

:put "--- UPLINK ACTUAL (GE4/1-LAN-OLT) ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/interface monitor-traffic 1-LAN-OLT once

:put "--- NUEVO UPLINK SFP1 (debe estar disabled como bridge port) ---"
/interface ethernet monitor sfp-sfpplus1 once
/interface bridge port print detail where interface="sfp-sfpplus1"
/interface monitor-traffic sfp-sfpplus1 once

:put "--- vlan1: DEBE apuntar a 1-LAN-OLT (nunca a sfp-sfpplus1) ---"
/interface vlan print detail where name=vlan1

:put "--- VALIDAR SIN LOOP ---"
:put "Esperado: 1-LAN-OLT habilitado y sfp-sfpplus1 deshabilitado en bridge1"

:put "--- BASELINE DHCP (anotar count) ---"
/ip dhcp-server lease print count-only
/ip dhcp-server lease print brief

:put "--- BASELINE TRAFICO CLIENTES (anotar rate) ---"
/queue simple print stats where name="QoS-Clientes"

:put "--- CONECTIVIDAD ---"
/ping 1.1.1.1 count=3
/ping 192.168.100.1 count=3

:put "NOTA: verificar en OLT que xge 0/0/1 (Index 786433) == ge 0/0/4 (Index 786432)"
:put "      VlanMode=1, Pvid=100, Tag='', Untag='100' vía API port_vlan_list."
:put "NOTA: crear backup fresco ANTES del cutover:"
:put "      /system backup save name=nexum-pre-cutover-final"
:put "=== FIN PRECHECK ==="
