:put "=== FASE 04: ROLLBACK RAPIDO ==="

:put "--- ROLLBACK: DEVOLVER 1-LAN-OLT A bridge1 ---"
/interface bridge port set [find where interface="1-LAN-OLT"] bridge=bridge1
/interface bridge port print detail where interface="1-LAN-OLT"

:put "--- DESHABILITAR MONITOREO DE CAMBIO ---"
/system scheduler disable [find where name="pcc_monitor_every_2m"]
/system scheduler print detail where name="pcc_monitor_every_2m"

:put "--- LEASES BOUND EN 192.168.1.x ---"
/ip dhcp-server lease print count-only where status=bound and address~"192.168.1."

:put "=== FASE 04 COMPLETADA ==="