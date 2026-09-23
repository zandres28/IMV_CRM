:put "=== FASE 04: HABILITAR INTERFACES WAN (MOMENTO DEL CUTOVER) ==="

:put "--- 2.5 HABILITAR WANs FISICAS ---"
/interface ethernet enable [find where name="11-WAN2"]
/interface ethernet enable [find where name="10-WAN3"]
:delay 15s
:put "12-WAN2 y 10-WAN3 habilitadas (15s para DHCP)"

:put "--- VERIFICAR IPs WAN ---"
/ip address print detail where interface="11-WAN2" or interface="10-WAN3"
/ip dhcp-client print detail where interface="11-WAN2"

:put "--- RUTAS DEFAULT ACTIVAS ---"
/ip route print detail where dst-address="0.0.0.0/0"

:put "=== FASE 04 COMPLETADA ==="