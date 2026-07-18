# PLAN DE MIGRACIÓN 10G - MIKROTIK CCR2116 & OLT WOLCK 16PG

Este documento contiene los comandos exactos validados para la ventana de mantenimiento.

## 1. PREPARACIÓN MIKROTIK (Ejecutar primero)
Copia y pega estos comandos en una Terminal de MikroTik para preparar el bridge. Estos comandos NO cortarán el servicio actual (UTP puerto 1).

```routeros
# 1. Habilitar el puerto SFP+ 1
/interface ethernet set [find name=sfp-sfpplus1] disabled=no auto-negotiation=yes comment="Uplink 10G OLT"

# 2. Agregar el puerto SFP al bridge
/interface bridge port add bridge=bridge1 interface=sfp-sfpplus1 comment="10G OLT"

# 3. Configurar la tabla de VLANs (PASO CRÍTICO)
# Esto indica que la VLAN 100 viaja etiquetada entre el CPU del MikroTik y la OLT por SFP+
/interface bridge vlan
add bridge=bridge1 tagged=bridge1,sfp-sfpplus1 vlan-ids=100

# 4. Asegurar acceso administrativo (Lockout Protection)
# Permitimos que la administración (VLAN nativa/1) pase por el puerto de WAN1 (Donde está tu IP 1.9)
/interface bridge vlan
add bridge=bridge1 untagged=bridge1,12-WAN1 vlan-ids=1
```

## 2. CONFIGURACIÓN OLT WOLCK (WK-OLT-16PG-B2)
Accede por CLI a la OLT. El puerto SFP+ 10G en este modelo suele ser el **GE17** (o el primer puerto tras los 16 PON). 
**Verifica con `show interface brief` antes de aplicar.**

```bash
enable
config
# Entrar al puerto SFP+ (Asegúrate que sea el puerto conectado físicamente)
interface ge 0/17
# Configurar como Trunk y permitir la VLAN de clientes
description Uplink_10G_Mikrotik
switchport mode trunk
switchport trunk vlan 100
exit
write
```

## 3. ACTIVACIÓN (VENTANA DE RIESGO - MADRUGADA)
En el MikroTik, haz clic en el botón **[Safe Mode]** de Winbox (ARRIBA A LA IZQUIERDA) y luego ejecuta:

```routeros
# Activar el filtrado de VLAN en el bridge
/interface bridge set [find name=bridge1] vlan-filtering=yes
```

## 4. VERIFICACIÓN Y LIMPIEZA
Si todo funciona:
1. Desconecta el cable UTP del puerto `1-LAN-OLT`.
2. Remueve el puerto viejo del bridge para evitar bucles:
   ```routeros
   /interface bridge port remove [find interface=1-LAN-OLT]
   ```

## 5. ROLLBACK (EN CASO DE FALLA)
Si pierdes conexión o el servicio no vuelve:
1. **Opción A (Safe Mode):** Si no has confirmado los cambios y pierdes acceso, el router volverá al estado anterior tras 30-60 segundos automáticamente.
2. **Opción B (Manual):**
   ```routeros
   /interface bridge set [find name=bridge1] vlan-filtering=no
   ```
