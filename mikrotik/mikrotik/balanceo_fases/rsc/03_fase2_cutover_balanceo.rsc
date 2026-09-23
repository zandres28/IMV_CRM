:put "=== FASE 03: CUTOVER BALANCEO (renovacion de conexiones) ==="

:put "--- 2.1 CREAR TABLA to_WAN3 (si no existe) ---"
/routing table add name="to_WAN3" fib disabled=no

:put "--- 2.2 RUTAS DEFAULT POR TABLA ---"
:put "-- to_WAN2: primaria CLARO_1 + backup MOVISTAR --"
/ip route set [find where comment="Default WAN2"] comment="Default WAN2 CLARO1" distance=1 check-gateway=ping
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN2 gateway=192.168.1.1 distance=2 check-gateway=ping comment="Backup WAN2 via MOVISTAR"
:put "-- to_WAN3: primaria CLARO_2 + backup MOVISTAR --"
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN3 gateway=192.168.50.1 distance=1 check-gateway=ping comment="Default WAN3 CLARO2"
/ip route add dst-address=0.0.0.0/0 routing-table=to_WAN3 gateway=192.168.1.1 distance=2 check-gateway=ping comment="Backup WAN3 via MOVISTAR"

:put "--- 2.3 INTERFACE LIST LAN = bridge_lan (remover bridge1) ---"
/interface list member add list="LAN" interface="bridge_lan"
/interface list member remove [find list="LAN" and interface="bridge1"]

:put "--- 2.3 MANGLE: retag PCC + enable + nuevas reglas ---"
:put "-- Retag PCC existentes --"
/ip firewall mangle set [find where comment="PCC WAN1"] new-connection-mark="WAN2_conn" comment="PCC CLARO1 2/0"
/ip firewall mangle set [find where comment="PCC WAN2"] new-connection-mark="WAN3_conn" comment="PCC CLARO2 2/1"
:put "-- Renombrar Route WAN1 y habilitar PCC CLARO2 / Route WAN2 --"
/ip firewall mangle set [find where comment="Route WAN1"] comment="Route WAN1 MOVISTAR"
/ip firewall mangle enable [find where comment="PCC CLARO2 2/1"]
/ip firewall mangle enable [find where comment="Route WAN2"]
:put "-- Agregar Mark WAN3 (retorno CLARO_2) y moverla antes de Mark WAN1 --"
/ip firewall mangle add chain=prerouting action=mark-connection new-connection-mark="WAN3_conn" passthrough=yes in-interface="10-WAN3" comment="Mark WAN3"
/ip firewall mangle move [find where comment="Mark WAN3"] [find where comment="Mark WAN1"]
:put "-- Agregar Route WAN3 --"
/ip firewall mangle add chain=prerouting action=mark-routing new-routing-mark="to_WAN3" passthrough=no connection-mark="WAN3_conn" dst-address-type=!local comment="Route WAN3"

:put "-- Orden final prerouting --"
/ip firewall mangle print where chain="prerouting"

:put "--- 2.4 NAT MASQUERADE POR WAN CLARO (CRITICO) ---"
/ip firewall nat add chain=srcnat action=masquerade out-interface="11-WAN2" comment="Masq CLARO_1"
/ip firewall nat add chain=srcnat action=masquerade out-interface="10-WAN3" comment="Masq CLARO_2"

:put "--- 2.6 MSS CLAMP (TCP forward) ---"
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS WAN"

:put "=== FASE 03 (mangle/NAT/MSS) COMPLETADA ==="
:put "NOTA: FASE 2.5 (habilitar interfaces WAN) se ejecuta en 04_habilitar_wan.rsc"