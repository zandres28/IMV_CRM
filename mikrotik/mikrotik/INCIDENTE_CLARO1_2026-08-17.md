# Incidente CLARO_1 — Diagnóstico (2026-08-17)

> Diagnóstico en SOLO LECTURA. Ningún cambio fue aplicado al router.

## Timeline (del log del router, 2026-08-16/17)
- **2026-08-16 08:37:26** — CLARO_1 (`11-WAN2`) pierde su IP DHCP (192.168.40.4 caída), link down → deshabilitada manualmente vía web.
- **2026-08-16 17:31:51** — se rehabilita `11-WAN2`, link up 1G, obtiene IP 192.168.40.2 (lease DHCP OK).
- **2026-08-17 08:55-08:56** — `11-WAN2` se cae DE NUEVO (pierde 192.168.40.2, link down) → queda **deshabilitada** manualmente. Movistar (`12-WAN1-BACKUP`) toggled y queda activa.

## Estado actual del router
| Item | Estado |
|------|--------|
| `11-WAN2` (CLARO_1) | **disabled=true**, running=false, DHCP client stopped |
| `10-WAN3` (CLARO_2) | running=true, IP estática 192.168.50.2/24, **RX ~63 Mbps** |
| `12-WAN1-BACKUP` (Movistar) | running=true, RX ~24 Mbps |
| `1-LAN-OLT` | running (bridge_lan pvid=100) |
| Errores físicos | 0 (rx-errors, fcs, tx-drops en ambos WAN activos) |
| Leases DHCP clientes | 77 bound |
| QoS-Clientes | max 900M/900M, actual ~38 Mbps down |

## Rutas activas relevantes
- `main`: 0.0.0.0/0 → 192.168.50.1 (CLARO_2) d5 **ACTIVA**; d6 vía 192.168.1.1 (Movistar) inactiva
- `to_WAN1`: 0.0.0.0/0 → 192.168.1.1 (Movistar) d1 activa
- `to_WAN2`: 0.0.0.0/0 → 192.168.40.1 (CLARO_1) d1 **INACTIVA**; d2 vía 192.168.1.1 (Movistar) **ACTIVA** (backup)
- `to_WAN3`: 0.0.0.0/0 → 192.168.50.1 (CLARO_2) d1 activa

## Por qué "funciona pero no estable"
- El PCC sigue repartiendo 50/50: `PCC CLARO1 2/0` → WAN2_conn, `PCC CLARO2 2/1` → WAN3_conn.
- La mitad marcada `WAN2_conn` ya NO sale por CLARO_1: cae a la ruta backup `to_WAN2` d2 → **Movistar (192.168.1.1)**.
- Resultado: ~50% de los clientes navegando por el respaldo Movistar mientras CLARO_1 está deshabilitada.
- No hay netwatch ni automatización de failover; el corte/restauración de CLARO_1 fue manual.

## Riesgo / observación
- Re-habilitar `11-WAN2` cuando el proveedor ya esté estable restauraría la mitad del tráfico a CLARO_1. NO desconecta clientes.
- El atenuante: CLARO_1 se cayó 2 veces en 24h → confirmar estabilidad del proveedor antes de rehabilitar, o el flapping podría golpear de nuevo a los clientes de esa rama.
- Contadores acumulados de `11-WAN2` muestran ~1.4 TB RX antes de la caída → era el WAN principal por volumen.

## RESOLUCIÓN (2026-08-17, ~12:15)
- Se habilitó CLARO_1 vía REST (`/rest/interface/11-WAN2` → `{disabled:false}`). El proveedor ya estaba estable.
- **Resultado:** interfaz tomó lease DHCP **192.168.40.2/24** (gw 192.168.40.1), interface renombrada a `ether11` (mangle *9 y NAT *1A auto-adaptados a `ether11`).
- Ruta `to_WAN2` d1 (192.168.40.1) → **ACTIVA**; respaldo Movistar d2 inactivo. PCC restaurado: WAN2_conn → CLARO_1, WAN3_conn → CLARO_2.
- Tráfico verificado 10s: CLARO_1 RX ~20-26 Mbps / TX ~2.6-4.5 Mbps, 0 errores; CLARO_2 RX ~38 Mbps, 0 errores. 77 leases bound. Sin cortes a clientes.
- **Estado final:** balanceo 50/50 CLARO_1 + CLARO_2 operativo, Movistar como respaldo.

## Lecciones / pendientes
- La inestabilidad percibida: ~50% del PCC (WAN2_conn) salía por Movistar mientras CLARO_1 estuvo caída.
- CLARO_1 se cayó 2 veces en 24h (16-17 ago). Vigilar estabilidad del proveedor.
- **RESUELTO (mismo día):** failover automatizado con netwatch + scripts WAN2-up/down, WAN3-up/down (ver `FIX_FAILOVER_WAN_2026-08-17.md`). El script roto WAN-Check fue eliminado y se crearon rutas host probe 1.1.1.1/9.9.9.9. La interfaz `ether11` fue renombrada a `11-WAN2` sin romper rutas/NAT/mangle/scripts.

## Opciones (todas requieren aprobación, ninguna toca el enlace activo de clientes)
1. **Hecho** — Resuelto: CLARO_1 rehabilitada y verificada (ver RESOLUCIÓN).
2. **Dejar como está**: clientes WAN2_conn por Movistar hasta que el proveedor confirme. — Superado por el fix de failover automático (ver `FIX_FAILOVER_WAN_2026-08-17.md`).
3. **Automatizar failover** (futuro): netwatch + script para toggle manual de `11-WAN2` con reintentos. — **HECHO** el 2026-08-17.

## Comandos de verificación (solo lectura)
```bash
# rutas
GET /rest/ip/route
# DHCP client en 11-WAN2
GET /rest/ip/dhcp-client
# log reciente
GET /rest/log
# estados de interfaces
GET /rest/interface
```