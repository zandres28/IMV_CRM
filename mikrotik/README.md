# mikrotik/

Archivos operativos de **MikroTik** y **OLT** separados del proyecto principal del CRM.
Contienen tooling, documentación y scripts de configuración/despliegue en red.
El CRM en sí (backend/frontend) sigue usando MikroTik/OLT como dependencias runtime;
los archivos de esta carpeta NO son parte del código de la aplicación.

## Estructura

```
mikrotik/
├── olt/                          ← OLT Wolck WK-OLT-16PG-B2 y migraciones 10G
│   ├── olt_cmd.txt               Apuntes sueltos de comandos CLI
│   ├── MANUAL_OLT.md             Manual de operaciones OLT (CLI)
│   ├── PLAN_MIGRACION_OLT_10G.md Plan abreviado OLT 10G
│   └── PLAN_MIGRACION_10G_DEFINITIVO.md  Plan completo MikroTik CCR2116 + OLT 10G
│
├── mikrotik/                     ← Router MikroTik (CCR2116-12G-4S+, IP 192.168.1.9)
│   ├── checklist_migracion_pcc.md  Checklist PCC (migración WAN1/WAN2)
│   ├── astra-epg-pending-review.txt Notas VLAN/bridge MikroTik (contexto EPG)
│   └── balanceo_fases/           Toolkit NOC completo para balanceo PCC de madrugada
│       ├── NOC_BALANCEO_MADRUGADA.md  Protocolo NOC (roles, semáforo, ventanas)
│       ├── run_balanceo_fase.ps1     Runner PowerShell (vía PuTTY/plink)
│       └── rsc/                       Scripts RouterOS ejecutables
│           ├── 01_precheck_backup.rsc
│           ├── 02_cutover_habilitar_monitoreo.rsc
│           ├── 03_validacion_post_cutover.rsc
│           └── 04_rollback_rapido.rsc
│
├── mcp/                          ← MikroTik MCP (servidor Python)
│   └── mikrotik-mcp-check.sh     Healthcheck del módulo mcp_mikrotik
│
└── tools/                        ← Utilidades standalone
    └── mikrotik_api.py           Cliente RouterOS API en Python 2.7 (exploratorio)
```

## Credenciales y acceso

Las credenciales SSH del router están en archivos de la **raíz del proyecto**:
- `.env.local` (usado por el MikroTik MCP vía `.opencode/opencode.json`)
- `docker-compose.yml` (variable `MIKROTIK_SSH_PASSWORD`, usada por el backend en runtime)

## Relación con el CRM

El CRM integra MikroTik/OLT mediante:
- `backend/src/services/OltService.ts` (CLI sobre la OLT)
- `backend/src/services/OltSchedulerService.ts` (desconexiones programadas)
- `backend/src/controllers/MikrotikController.ts` (proxy de gráficas)
- `backend/src/entities/NetworkDevice.ts` (DeviceType: mikrotik, olt, switch)
- `frontend/src/components/network/MikrotikGraphs.tsx`, `NetworkDevicesManager.tsx`
