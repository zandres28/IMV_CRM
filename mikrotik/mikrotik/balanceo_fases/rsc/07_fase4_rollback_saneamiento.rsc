:put "=== FASE 07: ROLLBACK DEL SANEAMIENTO (devuelve puertos/IP a bridge1) ==="
:put "Solo si la FASE 1 fallo. Restaura el estado huerfano original."

:put "--- Devolver puertos bridge_lan -> bridge1 ---"
/interface bridge port set [find where interface="1-LAN-OLT"] bridge="bridge1"
/interface bridge port set [find where interface="ether2"] bridge="bridge1"
/interface bridge port set [find where interface="ether3"] bridge="bridge1"
/interface bridge port set [find where interface="ether7"] bridge="bridge1"
/interface bridge port set [find where interface="ether8"] bridge="bridge1"
/interface bridge port set [find where interface="ether9"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus2"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus3"] bridge="bridge1"
/interface bridge port set [find where interface="sfp-sfpplus4"] bridge="bridge1"

:put "--- Devolver IP 192.168.10.1 y dhcp1 a bridge1 ---"
/ip address set [find where address="192.168.10.1/24"] interface="bridge1"
/ip dhcp-server set [find where name="dhcp1"] interface="bridge1"

:put "--- Eliminar bridge_lan (dejar de usarlo) ---"
/interface bridge remove [find where name="bridge_lan"]

:put "--- VERIFICAR puertos en bridge1 y IPs ---"
/interface bridge port print detail where bridge="bridge1"
/ip address print detail where interface="bridge1"

:put "=== FASE 07 COMPLETADA ==="