COMANDOS PARA OLT WOLCK WK-OLT-16PG (CLI)
==========================================

1. Entrar al puerto Uplink SFP+ (Asumiendo puerto 19 o 20 que suelen ser los SFP+):
   interface ge 0/19  (o el número que corresponda al SFP+)

2. Configurar el puerto como Trunk para permitir VLAN 100:
   switchport mode trunk
   switchport trunk vlan 100

3. Verificar que la VLAN 100 esté creada globalmente:
   vlan 100
   exit

4. Guardar configuración:
   write
