:put "=== ROLLBACK OLT 10G ==="

:put "Deshabilitando XGE1/SFP1 antes de restaurar GE4/1-LAN-OLT"
/interface bridge port disable [find interface=sfp-sfpplus1]
:delay 500ms
/interface bridge port enable [find interface=1-LAN-OLT]

:put "--- ESTADO POST ROLLBACK ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/interface bridge port print detail where interface="sfp-sfpplus1"

:put "Verificando vlan1 (debe seguir en 1-LAN-OLT, NO se mueve)"
/interface vlan print detail where name=vlan1

:put "=== ROLLBACK COMPLETADO ==="
:put "Verificar recuperacion: tráfico QoS-Clientes > 0 y DHCP renovando (hoy: <60s)"
