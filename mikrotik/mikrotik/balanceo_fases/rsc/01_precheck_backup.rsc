:put "=== FASE 01: PRECHECK + BACKUP ==="
:put "Fecha/Hora del router:"
/system clock print

:put "--- BRIDGE SETTINGS ---"
/interface bridge settings print

:put "--- BRIDGE PORTS CLAVE ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/interface bridge port print detail where interface="12-WAN1"

:put "--- DHCP POOLS ---"
/ip pool print detail

:put "--- DHCP SERVERS ---"
/ip dhcp-server print detail

:put "--- DHCP NETWORKS ---"
/ip dhcp-server network print detail

:put "--- SANITY DHCP (debe ser 0) 192.168.10.x ---"
/ip dhcp-server lease print count-only where status=bound and address~"192.168.10."

:put "--- LEASES BOUND TOTALES ---"
/ip dhcp-server lease print count-only where status=bound

:put "--- RUTA 192.168.10.0/24 (debe no existir) ---"
/ip route print detail where dst-address="192.168.10.0/24"

:put "--- WAN2 STATUS PREVIO ---"
/interface ethernet print detail where name="11-WAN2"
/ip dhcp-client print detail where interface="11-WAN2"

:put "--- SCHEDULERS CLAVE ---"
/system scheduler print detail where name="pcc_monitor_every_2m"
/system scheduler print detail where name="wan2_test_every_2m"

:put "--- BASELINE PCC ---"
/system script run pcc_baseline_precheck

:local ts ( [/system clock get date] . "_" . [/system clock get time] )
:local safeTs [:pick $ts 0 3]
:set safeTs ($safeTs . [:pick $ts 4 6] . [:pick $ts 7 11] . "_" . [:pick $ts 12 14] . [:pick $ts 15 17] . [:pick $ts 18 20])
:local backupName ("pre_balanceo_" . $safeTs)

:put ("--- CREANDO EXPORT: " . $backupName . ".rsc ---")
/export file=$backupName

:put ("--- CREANDO BACKUP BINARIO: " . $backupName . ".backup ---")
/system backup save name=$backupName

:put "--- VERIFICAR ARCHIVOS CREADOS ---"
/file print where name~"pre_balanceo_"

:put "=== FASE 01 COMPLETADA ==="