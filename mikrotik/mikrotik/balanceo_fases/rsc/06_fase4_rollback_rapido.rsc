:put "=== FASE 06: ROLLBACK RAPIDO (balanceo -> Movistar puro, logico) ==="

:put "--- Deshabilitar marcas de ruta Claro ---"
/ip firewall mangle disable [find where comment="PCC CLARO1 2/0"]
/ip firewall mangle disable [find where comment="PCC CLARO2 2/1"]
/ip firewall mangle disable [find where comment="Route WAN2"]
/ip firewall mangle disable [find where comment="Route WAN3"]
/ip firewall mangle disable [find where comment="Mark WAN3"]

:put "--- Quitar NAT de Claro ---"
/ip firewall nat disable [find where comment="Masq CLARO_1"]
/ip firewall nat disable [find where comment="Masq CLARO_2"]

:put "--- Deshabilitar WAN fisicas ---"
/interface ethernet disable [find where name="11-WAN2"]
/interface ethernet disable [find where name="10-WAN3"]

:put "--- VERIFICAR: main default Movistar debe ser la salida ---"
/ip route print detail where dst-address="0.0.0.0/0"
/ping 1.1.1.1 count=5

:put "=== FASE 06 COMPLETADA ==="
:put "NOTA: bridge_lan NO se toca en este rollback. Solo se revierte el balanceo."