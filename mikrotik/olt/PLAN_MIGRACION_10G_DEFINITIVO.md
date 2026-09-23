# Migracion OLT 10G - CCR2116 y XGE1

Estado validado el 2026-08-03 contra la CCR2116 en produccion.

## Hallazgos

- El uplink actual de clientes es `1-LAN-OLT` dentro de `bridge1`.
- `1-LAN-OLT` transportaba aproximadamente 150 Mbps durante la validacion.
- La interfaz `vlan1` (service-tag 100) estaba en 0 bps; no es el camino activo de clientes.
- `sfp-sfpplus1` enlaza a 10 Gbps full duplex mediante DAC de 1 m, no fibra optica.
- XGE1 y GE4 pertenecen al mismo dominio L2 de la OLT: SFP1 aprende por LLDP a la propia CCR2116 reenviada desde GE4.
- Agregar SFP1 al bridge mientras GE4 sigue habilitado crea riesgo de loop.

## Staging aplicado

SFP1 ya esta registrado como puerto deshabilitado de `bridge1`:

```routeros
/interface bridge port
add bridge=bridge1 interface=sfp-sfpplus1 pvid=100 disabled=yes comment="nexum-stage-olt10g"
```

Al estar deshabilitado, no reenvia trafico y no afecta a los clientes.

## Secuencia de cutover

Usar Safe Mode en WinBox. La secuencia obligatoria es:

1. Confirmar `sfp-sfpplus1` con `running=yes` y 10 Gbps.
2. Deshabilitar el bridge port de `1-LAN-OLT`.
3. Habilitar el bridge port de `sfp-sfpplus1`.
4. Validar trafico, ARP y navegacion de clientes.

Nunca habilitar ambos puertos simultaneamente.

Ejecutar:

```routeros
/import file-name=01_CUTOVER_OLT_10G.rsc
/import file-name=03_VALIDAR_OLT_10G.rsc
```

## Rollback

El rollback usa el orden inverso y evita el loop:

1. Deshabilitar SFP1.
2. Habilitar `1-LAN-OLT`.

```routeros
/import file-name=02_ROLLBACK_OLT_10G.rsc
```

## Corte esperado

El cambio son dos operaciones de bridge port y una pausa de 200 ms. La interrupcion tecnica esperada es menor a 2 segundos; ONUs o routers de clientes pueden tardar varios segundos adicionales en renovar ARP o sesiones.

## No incluido

El balanceo PCC de WAN10/WAN11 y backup WAN12 debe hacerse en una ventana separada. No mezclar la migracion del uplink OLT con cambios de rutas WAN.
