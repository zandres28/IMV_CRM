:put "=== FASE 02: HABILITAR MONITOREO + CUTOVER ==="

:put "--- HABILITAR MONITOREO CADA 2 MIN ---"
/system scheduler enable [find where name="pcc_monitor_every_2m"]
/system scheduler print detail where name="pcc_monitor_every_2m"

:put "--- ESTADO ANTES DEL CUTOVER ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/ip dhcp-server lease print count-only where status=bound

:put "--- CUTOVER: MOVER 1-LAN-OLT A bridge_lan_nueva ---"
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge_lan_nueva

:put "--- ESTADO DESPUES DEL CUTOVER ---"
/interface bridge port print detail where interface="1-LAN-OLT"

:put "=== FASE 02 COMPLETADA ==="