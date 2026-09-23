:put "=== CUTOVER OLT 10G ==="
:put "ADVERTENCIA: vlan1 NO se toca. Solo se intercambian bridge ports."

:put "Verificando que el SFP1 tenga link antes del cambio"
/interface ethernet monitor sfp-sfpplus1 once

:put "Verificando que vlan1 NO apunte a sfp-sfpplus1"
/interface vlan print detail where name=vlan1
:if ([:find [/interface vlan get vlan1 interface] "sfp-sfpplus1"] >= 0) do={
  :error "ABORTADO: vlan1 apunta a sfp-sfpplus1. Corregir antes de cortar."
}

:put "Deshabilitando GE4/1-LAN-OLT antes de habilitar XGE1/SFP1"
/interface bridge port disable [find interface=1-LAN-OLT]
:delay 500ms
/interface bridge port enable [find interface=sfp-sfpplus1]

:put "--- ESTADO POST CUTOVER ---"
/interface bridge port print detail where interface="1-LAN-OLT"
/interface bridge port print detail where interface="sfp-sfpplus1"

:put "=== CUTOVER COMPLETADO; EJECUTAR VALIDACION ==="
:put "Ventana critica: 5-10 min. Si QoS-Clientes = 0 o DHCP deassign masivo, ejecutar ROLLBACK."
