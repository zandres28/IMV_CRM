# Nexum CRM — AGENTS.md

## Idioma de Respuesta
Las respuestas del agente siempre deben estar en **español**.

## Stack
- **Frontend:** React 18 + TypeScript 4.9 + MUI 5 + Redux Toolkit + Recharts. CRA (react-scripts 5).
- **Backend:** Express 5 + TypeScript 5.9 + TypeORM 0.3 + MySQL 8.0. ts-node-dev for dev, tsc to build.
- **Infra:** Docker Compose (db:3307, backend:3010, frontend:8095), Nginx reverse-proxy in frontend container.
- **CI:** GitHub Actions — push to master → build frontend on runner (Node 18, `npm ci && npm run build` with `REACT_APP_API_URL=/api`) → `appleboy/scp-action` to copy build to VPS → `appleboy/ssh-action` to `docker cp` into running container. VPS RAM (312Mi free) is insufficient for React build, so building on runner and injecting via `docker cp` is required.

## Dev Commands
```bash
# Backend
cd backend && npm run dev          # ts-node-dev --respawn --transpile-only src/index.ts
npm run build                       # tsc
npm run migration:run               # typeorm migration:run -d src/config/database.ts

# Frontend
cd frontend && npm start            # react-scripts start (port 3000)
npm run build                       # react-scripts build (output: build/)

# Docker (full stack)
docker compose up -d
docker compose build frontend && docker compose up -d frontend   # rebuild only frontend
```

## Project Structure
```
CRM-2025/
  backend/src/
    config/database.ts        → AppDataSource (TypeORM, synchronize: false)
    entities/                 → 23 TypeORM entity files (PascalCase)
    controllers/              → ~29 controllers (PascalCase, static or instance methods)
    routes/                   → ~30 route files (kebab-case), register in backend/src/index.ts
    middlewares/              → auth.middleware.ts, roles.middleware.ts, apiKey.middleware.ts, rateLimit.middleware.ts
    services/                 → OltService, OltSchedulerService, NotificationService
    migrations/               → 28 timestamped migration files
    scripts/                  → 20 utility scripts (seeders, import CSV, debug)
  frontend/src/
    components/               → Organized by module: clients/, billing/, admin/, network/, etc.
    services/                 → 22 service files, each exports a class or singleton
    routes/index.tsx          → createBrowserRouter with PrivateRoute wrapper
    utils/axiosConfig.ts      → JWT interceptor (auto-attach Bearer token, auto-refresh on 401)
    types/                    → TypeScript interfaces
    App.tsx                   → Layout (sidebar + header + <Outlet/>)
    theme.ts                  → MUI theme customization
```

## Backend Route Registration Pattern
Routes are registered in `backend/src/index.ts` with one of these auth levels:
```typescript
app.use("/api/auth", publicRoutes);                              // No auth
app.use("/api/n8n", apiKeyMiddleware, n8nIntegrationRoutes);     // x-api-key header
app.use("/api/roles", authMiddleware, requireRoles('admin'), ...); // JWT + role check
app.use("/api/clients", authMiddleware, ...);                    // JWT only
```

## Adding a New Module (Backend → Frontend order)
1. **Entity** `backend/src/entities/MyModule.ts` — TypeORM decorators
2. **Migration** `backend/src/migrations/<timestamp>-CreateMyModuleTable.ts` → run `npm run migration:run`
3. **Controller** `backend/src/controllers/MyModuleController.ts` — static or instance methods
4. **Routes** `backend/src/routes/my-module.ts` — express.Router(), attach authMiddleware
5. **Register** in `backend/src/index.ts` — `app.use("/api/my-module", authMiddleware, myModuleRoutes);`
6. **Service** `frontend/src/services/MyModuleService.ts` — axios calls (axios already has JWT interceptor)
7. **Component** `frontend/src/components/admin/MyModuleManager.tsx` — MUI component
8. **Route** `frontend/src/routes/index.tsx` — add path under the PrivateRoute-wrapped App
9. **Menu** `frontend/src/App.tsx` — add ListItem in the sidebar (with hasPermission check)

## Frontend Auth / API Conventions
- **JWT auto-attach:** `frontend/src/utils/axiosConfig.ts` — request interceptor adds `Authorization: Bearer <token>`.
- **Auto-refresh on 401:** response interceptor catches 401, calls refresh, retries. On failure → redirects to `/login`.
- **Permission checks:** `AuthService.hasPermission('clients.list.view')` — checks user.roles[].permissions.includes().
- **API URL:** `process.env.REACT_APP_API_URL || 'http://localhost:3001/api'`.

## Backend Auth Middleware
- `authMiddleware` → verifies JWT from `Authorization: Bearer <token>`, attaches `req.user` (User entity with roles).
- `AuthRequest` extends Express `Request` with `user?: User` and `userId?: number`.
- `requireRoles('admin', ...)` → after authMiddleware, checks user has at least one of the listed role names.
- `apiKeyMiddleware` → checks `x-api-key` header against `process.env.N8N_API_KEY` (for n8n webhooks).

## Key Conventions
- **Backend:** PascalCase for entities, controllers, services. kebab-case for route files.
- **Frontend:** PascalCase for components, CamelCase for service files.
- **Controllers:** either static methods (e.g. `AvisoController.getAll`) or instance methods (e.g. `new NotificationController().getAll`). Check existing pattern before adding new one.
- **Frontend services:** singleton class (e.g. `new AuthService()`) or object literal (e.g. `PromotionService = { getAll: ... }`). Both coexist.
- **DB migrations only** — `synchronize: false` in TypeORM config. Never change schema directly.

## Key Discrepancies / Gotchas
- **Frontend services** sometimes manually set `Authorization` header even though the axios interceptor already does it. Don't rely on this — both patterns work but the interceptor is the canonical one.
- **Backend listens on `process.env.PORT || 3001`** in code, but Docker exposes port 3010. The .env.example says PORT=3010.
- **Some routes use `requireRoles('admin')`** (e.g. `/api/roles`), most use only `authMiddleware`.
- **N8n integration** uses `apiKeyMiddleware` (checks `x-api-key`), routes under `/api/n8n`.
- **OLT routes** (`/api/olt`) are registered *without* authMiddleware in index.ts (the OLT router handles auth internally).
- **No lint/format config** exists (.eslintrc, .prettierrc, .editorconfig are absent).

## WhatsApp Payment Receipts Pipeline (Evolution → Chatwoot → n8n → Gemini)

> Detalles completos en el skill `.opencode/skills/evolution-chatwoot-payments/SKILL.md`. Resumen de referencia rápida:

- **Workflow activo:** `IMV - Soportes de Pago (Gemini)` id `H2YRscVbeB19GaQ6` (webhook `soporte-pago`, 17 nodos). Webhook Chatwoot (inbox 5, cuenta 1) → `If -PRUEBAS` (solo `+573006143054`) → dedup por `messageId` → Gemini OCR → `Consultar Deuda en CRM` → registrar/responder.
- **Clientes de prueba:** `3006143054` = cliente ID 73 "PRUEBAS".
- **Instancias Evolution (2026-08-06):** `imv_chatwoot2` (token `979AF1D6D474...`, **Chatwoot `enabled:false`** — apagado para eliminar duplicados) y `imv_chatwoot3` (token `5685A7ED2B02...`, **Chatwoot `enabled:true`** — canónica). Ambas conectadas al número `573334006212`.
- **Desactivar Chatwoot en una instancia:** `POST /chatwoot/set/{instance}` (auth header `apikey` = `IMVInternet*2025*` o token de instancia). Body requiere `enabled, accountId, token, url, signMsg, reopenConversation, conversationPending`. **No** está en la doc oficial de Evolution — solo en el bundle.
- **Evolution API URL:** `http://imvevoapi.duckdns.org:8080` (HTTP; HTTPS da timeout).
- **Gemini:** NO usar Files API (`/upload/v1beta/files` da 400 intermitente fuera de try/catch). Usar `inline_data` base64 en `/v1beta/models/gemini-3-flash-preview:generateContent`. Key en variable de entorno (`GEMINI_API_KEY`, no commitear).
- **`Consultar Deuda en CRM`** tiene `onError: "continueRegularOutput"` a nivel de **nodo** (un 404 "Client not found" fluye a la rama "Cliente No Encontrado" en vez de romper el workflow). No existe `parameters.options.onError` en httpRequest v4.2.
- **Backend envíos:** `OltHealthMonitorService.ts` usa `EVOLUTION_INSTANCE_NAME` → **migrado a `imv_chatwoot3`** (2026-08-06). Compose VPS: `/home/ubuntu/imv_crm/docker-compose.yml`. Deploy = `scp` fuente + `docker compose build backend` + `up -d backend`.
- **Patch bundle Evolution (crash LID):** `/evolution/dist/main.js`, reemplazo `i=t&&!o?(e.key.remoteJidAlt||e.key.remoteJid):e.key.remoteJid`, backup `.bak-lidfix`. Reiniciar `evolution_api` tras parchear.
- **register-payment — fix ER_DUP_ENTRY (2026-09-09):** `payments.externalId` tiene constraint **UNIQUE**. Si el `reference` del comprobante ya quedó registrado en otro pago (las referencias se reutilizan entre meses/clientes; caso real: `91247868017` de ANGELA MOLINA = el mismo que el pago 651 del cliente 76 en marzo-2026), el `save` lanzaba 1062 → el workflow moría con **500 "Internal server error processing payment"** y el cliente nunca quedaba registrado/confirmado. Fix en `N8nIntegrationController.ts` `registerPayment`: `try { externalId = reference } catch (ER_DUP_ENTRY) { externalId = WHATSAPP-${Date.now()}; save }`. Harold Ocampo (85) registró OK con `M03975747`; Ángela (60) fallaba. Nunca borrar la UNIQUE: da dedup real.
- **Node n8n "Responder: Monto No Coincide" (H2YRscVbeB19GaQ6):** tenía una IIFE multilínea en la expresión del body → **"invalid syntax"** (`Expression.renderExpression`) cada vez que el monto del comprobante no coincidía (ejecución 21562). Reescribida como concatenación simple de una línea (sin IIFE). Lección: NO usar IIFEs/funciones multilínea complejas dentro de expresiones `{{ }}` de n8n.

## N8N Payment Reminders Workflow (Recordatorios Nativos)

- **Workflow ID:** `05QpPp2xmc1ASFtj` ("NetFlow CRM - Recordatorios Nativos - PDF", **activo**, **22 nodos**). Versión canónica v8. Scheduler `0 0 9 * * *` (`America/Bogota`); el envío reciente es el reenvío del 12-sep.
- **Data source:** `GET /api/n8n/payment-reminders` with header `x-api-key`. Params usados en producción: `paymentStatus=pending&reminderMode=all&clientStatus=activo&incluirRetirados=false`. **`month`/`year` ya no se hardcodean (2026-09-09):** el nodo `Get Reminders from CRM1` los calcula dinámicamente como *mes anterior* → `month = {{ ['ENERO',...,'DICIEMBRE'][($now.month + 10) % 12] }}`, `year = {{ $now.minus({ months: 1 }).year }}` (dot-path `parameters.queryParameters.parameters[1].value` y `[2].value`). En sep-2026 envía AGOSTO → **8 vencidos reales** (CL-0012, CL-0021, CL-0025, CL-0046, CL-0056, CL-0062, CL-0091, CL-0118).
- **Chain:** `Get Reminders from CRM1` → `Filter` → `Parametrización1` (Set) → `Loop Over Items1` (splitInBatches, batch 1) → `Pagos Adicionales` (Code) → `Descuentos` (Code) → `Generar Mensaje` (Code) → `Send WhatsApp1` → `Mark as Sent in CRM`.
- **CRITICAL — runOnceForEachItem Code nodes must `return` a plain object** (`{...$json, ...}`), NOT `[{json:...}]`. Wrapping in an array throws `A 'json' property isn't an object`.
- **CRITICAL — each Code node must propagate upstream data.** `Descuentos` must `return { ...$json, mnsj_dcto: mensaje }` (not just `{mnsj_dcto}`) or the downstream node loses `add`/`TOTAL`. `Generar Mensaje` rebuilds context via `const datos = { ...$('Parametrización1').item.json, ...$json }`.
- **Send WhatsApp1:** POST `https://imvevoapi.duckdns.org/message/sendText/imv_chatwoot3`, apikey `5685A7ED2B02-4F36-899E-A9C5320D381C`; body `number = $('Get Reminders from CRM1').item.json['Celular 1']`, `text = {{ $json.message }}`.
- **mark-sent:** POST `/api/n8n/mark-sent` body `{clientId, installationId, month, year}` (creates a `Recordatorio WhatsApp` Interaction so reminders aren't re-sent within the month).
- **reset-reminders:** POST `/api/n8n/reset-reminders` body `{phone}` (one) or `{all: true}` (all this month) — deletes those Interactions.
- **Doc endpoint:** n8n node "Get Reminders" was patched via `updateNode` dot-path `parameters.queryParameters.parameters.{4,5}.value` (index 4 = clientStatus, 5 = incluirRetirados).
- **2026-08-06 deploy:** VPS backend was running an old `N8nIntegrationController.ts` (1026 lines, no `incluirRetirados`/`reminderMode`/`sentCountMap`, missing 3 endpoints). Updated by `scp` to `/tmp` + `docker cp` into `imv_crm-backend-1:/app/src/controllers/` + `npm run build` + `docker restart`. Verified: `incluirRetirados=false` → 88 (51 pagado + 37 pendiente); `incluirRetirados=true` → 97 (88 activo + 9 retirado).
- **Fix T1 — recordatorios indebidos por fallback `|| 'pendiente'` (2026-09-09):** clientes activos SIN pago del mes consultado eran inventados como 'pendiente' por `payment?.status || 'pendiente'` → recibían cobro falso. Caso real: CONSUELO LENIS (cliente 26, instalación id 26 reactivada el 4-sep-2026; `installationDate=2026-09-04`, `retirementDate=2026-01-30`, `serviceStatus=activo`): sin pago de AGOSTO 2026 → el fallback la marcaba morosa. Fix estructural: `payment?.status ?? null` (`N8nIntegrationController.ts` en `getPaymentReminders`) → `null` no entra en `paymentStatus=pending`. Aplica a CUALQUIER activo sin factura del mes consultado (reactivado/reintegrado a mitad de mes, nuevo, retirado con fecha vieja), no solo a CONSUELO.
- **check-payment-status (inyectado en el workflow 2026-09-08):** antes de cada `Send WhatsApp1`, un `GET /api/n8n/check-payment-status?phone={número}` revalida en vivo si el cliente sigue pendiente; si ya pagó (o el reminder se marcó sent), corta el envío del item. Nodo n8n "¿Sigue Pendiente?" decide la rama.
- **Captura LID → número real (2026-09-09, cron `/home/ubuntu/lid-sync/lid_sync.sh` cada 30 min):** cuando WhatsApp asigna identifiers `@lid` (ej. `221092148965455@lid` = Tatavo, wrongly `+221092148965455` en Chatwoot), Evolution guarda el número real en `Message.key->>'remoteJidAlt'` (ej. `221092148965455@lid` → `573106434122@s.whatsapp.net`). En Chatwoot el contacto queda con `identifier = <lid>@lid` y `phone_number = +<lid>` (falso) → n8n no encontraba al cliente → comprobante perdido. El script extrae los pares `DISTINCT key->>'remoteJid' / key->>'remoteJidAlt'` de BD Evolution (tabla `Message`, filtro `key->>'fromMe'='false'` y no protocolMessage), y en `chatwoot_postgres` hace `UPDATE contacts SET phone_number='+'+split_part(real,'@',1), additional_attributes=coalesce(c.additional_attributes,'{}')||jsonb_build_object('evo_real_number','+...')` solo donde `phone_number IS NULL` o `= '+'||lid_digits`. Resultado inicial: **24 contactos corregidos** (solo los que Evolution ya había resuelto). El webhook de Chatwoot a n8n lee `meta.sender.phone_number` del contacto → tras el sync, `Extraer Datos del Mensaje` recibe el número real. Fuentes SQL: `/home/ubuntu/lid-sync/evo_pairs.sql` (query a Evolution) y el UPDATE inline del script; log en `/home/ubuntu/lid-sync/lid_sync.log`. No aplicar si `phone_number` ya es real (manual) por idempotencia. Los LID sin `remoteJidAlt` jamás se resuelven (nada que capturar).

## OLT (C-Data / cgi-bin HTTP API)

**OltService** (`backend/src/services/OltService.ts`) communicates via HTTP REST, **not** SSH.

### OLT Hardware
- **Brand:** Shenzhen C-Data Technology (C-Data)
- **IP:** `192.168.100.1` (internal), reachable via NAT `192.168.1.94:8080`
- **SSH:** Not available (port 22 closed — ECONNREFUSED)
- **Web/API:** Port 8080 (NAT from MikroTik `192.168.1.94:8080 → 192.168.100.1:80`)

### API Base URL
```
http://{OLT_HOST}:{OLT_WEB_PORT}/cgi-bin/h.cgi?module={module}
```

### Auth Flow
1. **Login:** `POST ...?module=sys_login` with JSON body `{"Usrname":"admin","Password":"<MD5(plaintext)>"}`
   - Response: `{"code":0, "data":{"token":"..."}}`
   - MD5 hash is **uppercase** hex string (e.g. `01FF15FBD59037A5426351D90F81F470`). Lowercase hash causes login to return `{}` (empty body, no token).
2. **Token:** Sent in **header** `token` (NOT `Authorization`, NOT cookie)
3. **Re-auth:** If API returns `code: 2`, token expired — clear cached token and retry

### Key API Modules
| Module | Method | Params | Description |
|--------|--------|--------|-------------|
| `sys_login` | POST | `{Usrname, Password}` | Auth, returns token |
| `onu_list_get` | GET | — | All ONUs, fields: `PonId`, `OnuId`, `RunningState`, `OnuDesc`, `PonSn`, `ControlFlag`, `ConfigState` |
| `onu_reboot` | POST | `{PonId, OnuId}` | Reboot ONU |
| `onu_deactive` | POST | `{PonId, OnuId}` | Deactivate ONU |
| `onu_manual_add` | POST | `{PonId, OnuId, Action: 'activate'}` | Activate ONU |
| `sys_cfg_operate` | GET | — | Generate config backup → returns `{CfgFile, TarFile}` |
| `sys_cfg_file_check` | GET | `{Filename}` | Validate config file before restore |
| `sys_config_save` | POST | — | Save running config to flash |
| `sys_reset_system` | POST | — | Factory reset (destructive) |

### OLT Backup (Config) — Two Steps
1. **Generate:** `GET /cgi-bin/h.cgi?module=sys_cfg_operate` with `token` header → JSON with `CfgFile` (`.cfg`, plain text) and `TarFile` (`.tar.gz`, full bundle).
2. **Download:** `GET http://{OLT_HOST}:{OLT_WEB_PORT}/{filename}` — files are served from the **web-server root, no auth** (the Vue UI does `window.open('/' + filename)`). Filenames change each call; parse them from the response first.

Restore: `POST /cgi-bin/h.cgi?UploadType=saved_config&filename={name}` (multipart field `file`) then `GET sys_cfg_file_check`. Firmware: `POST ?module=sys_firmware_upload&UploadType=olt_upgrade`. Discovered from UI bundles `/js/app.58000bb1.js` + `/js/device.1b7c9b33.js`; there is no documented `backup_*` module (all probes return `{}`).

### Key ONU Fields (from `onu_list_get`)
- `RunningState`: **1** = Online, **0** = Offline
- `PonSn`: ONU serial number (used to match with `installation.onuSerialNumber`)
- `OnuDesc`: Client/description name
- `PonId`: PON port (e.g. `"0/0/1"`)  
- `OnuId`: ONU index within PON port (e.g. `1-38`)
- `ControlFlag`: 1 = enabled
- `ConfigState`: 4 = configured

### OltService Architecture
- **No SSH** — the old `ssh2`-based connection pool was replaced with `fetch()` calls
- Token caching: **static/shared across all instances**, cached for 10 min, auto-refresh on `code: 2`, single-flight login (concurrent calls share one `sys_login`)
- ONU list caching: **static cache with 30s TTL + single-flight** (`onuListPromise`) — N concurrent `getAllOnus()` = 1 HTTP call to the OLT. Mutations (reboot/activate/deactivate) call `OltService.invalidateOnuListCache()`
- Search priority: by `onuSerialNumber` first (case-insensitive match on `PonSn`), fallback to `ponId` + `onuId`
- Instantiate per request: `new OltService()` (still stateless in practice — token/cache live in statics)

### Env Vars
```
OLT_HOST=192.168.1.94
OLT_PORT=22          # legacy SSH port (unused)
OLT_WEB_PORT=8080    # HTTP port for cgi-bin API
OLT_USER=admin
OLT_PASSWORD=IMV*2025*
```

### OLT Scheduler
- **File:** `backend/src/services/OltSchedulerService.ts`
- **Cron:** `*/5 * * * *` (every 5 min) — was `* * * * *` (every minute)
- **Purpose:** Processes scheduled disconnections (`oltDisconnectScheduled=true` + `retirementDate` reached)
- **NOT** for ONU status polling — that's done on-demand by frontend

### OLT Anti-Flooding Protections (2026-08-19, blindaje total 2026-08-30)
The C-Data lighttpd hangs permanently under concurrent request bursts (accepts TCP, never answers HTTP; ping/ARP OK, data plane GPON unaffected — clients keep service; only fix is physical power-cycle, no SSH/API to revive it). **Root cause:** backend instantiated `new OltService()` per request, each doing its own `sys_login` + full `onu_list_get` download (~90 ONUs), and frontend `InstallationsList.tsx` fanned those out with `Promise.all` per installation. It re-hung again on 2026-08-27 even with the three original mitigations, so a hard whitelist was added:
1. **OltService static cache + single-flight** (deployed commit `3008b0b`) — the CRM can no longer flood the OLT regardless of open tabs/users.
2. **OltHealthMonitorService** distinguishes `OFFLINE` (no TCP → power/link cut) from `WEB_HUNG` (TCP OK, HTTP dead → web hung, clients unaffected, needs physical reboot) and sends different WhatsApp alerts for each.
3. **MikroTik whitelist (2026-08-30):** address-list `olt-web-allowed`=`10.100.0.1` (backend VPS via WG) + `192.168.1.70` (admin PC). Forward chain: rule 0 `accept ... src-address-list=olt-web-allowed tcp/80`, rule 1 `drop ... src-address-list=!olt-web-allowed tcp/80`. Any other source (LAN clients, WAN, other WG peers) is dropped BEFORE the generic LAN accepts. The old `connection-limit=8,32` rule was removed as insufficient (OLT re-hung on 08-27).
4. **OltBackupService** (`backend/src/services/OltBackupService.ts`, deployed 2026-08-30): cron `0 3 * * *` → `sys_cfg_operate` → download `.cfg` to `backups/olt/` (or `OLT_BACKUP_DIR`) in the backend container, purges files older than 7 days. Skips gracefully when OLT is hung (logs error only).

**Golden rule:** NEVER add code paths that fan out parallel requests to the OLT — everything must go through the OltService static cache. To grant web access to another admin/device, add its IP to `olt-web-allowed` on the MikroTik.

## MikroTik QoS (Client Speed Limits)

- **Simple Queue:** `QoS-Clientes`, target `192.168.10.0/24`, `max-limit=900M/900M`, `queue=pcq-upload/pcq-download` (PCQ = fair-share per client IP).
- **Aug 2026 incident:** all clients saw ~14.4/14.5 Mbps symmetric. Cause: PCQ queue types had `pcq-rate=15M` (per-client cap). Fixed by raising `pcq-rate` to `900M` on both `pcq-download` and `pcq-upload` types so PCQ only divides the 900M total among active clients.
- **Lesson:** per-client speed limits on the MikroTik live in `/queue type` `pcq-rate` (NOT the simple queue max-limit). If clients are capped at an unexpected value, check `pcq-rate` first.
- Config backups on the router: `nexum-ok-qos-0806-0912.backup` (current, pcq-rate=900M), `nexum-antes-qos-0806-0900.backup` (pre-fix state). Old refs: `nexum-restaurado-ago06-2026.backup`, `nexum-backup-ago05-2026.backup`.

## Balanceo PCC Dos Planes Claro + Movistar Respaldo (OPERATIVO 2026-08-13, FAILOVER AUTOMÁTICO 2026-08-17)

> Detalles completos en `mikrotik/mikrotik/plan_balanceo_claro.md` (sección «EJECUTADO»). Sesión 2026-08-17 (incidente CLARO_1 + fix failover + rename interfaz + lecciones sintaxis) en `mikrotik/mikrotik/FIX_FAILOVER_WAN_2026-08-17.md` e `INCIDENTE_CLARO1_2026-08-17.md`.

- **Acceso router:** CCR2116-12G-4S+, RouterOS 7.23.2, `admin@192.168.1.94`, clave `IMV*2025*`. plink: `C:\Program Files\PuTTY\plink.exe`. Patrón: `& '...plink.exe' -batch -hostkey 'ssh-rsa 2048 SHA256:xHR9VAY1bfITBTvkucySm9Qdz5omAwcNqHJ5c1XjFHg' -ssh -pw 'IMV*2025*' 'admin@192.168.1.94' '<cmd>'` (o `-m archivo.rsc`). IPs: `192.168.1.94/24` (bridge1, gestión), `192.168.10.1/24` (bridge_lan, gateway clientes), `192.168.100.2/24` (bridge_admon, MGMT OLT).
- **Estado:** balanceo PCC 50/50 activo entre **CLARO_1** (`11-WAN2`, DHCP **192.168.40.2/24**, gw 192.168.40.1) y **CLARO_2** (`10-WAN3`, estática 192.168.50.2/24, gw 192.168.50.1). **Movistar (`12-WAN1-BACKUP`) como respaldo automático** (distancias d2 en tablas to_WAN2/to_WAN3 y d6 en main).
- **Failover automático (2026-08-17):** script WAN-Check roto ELIMINADO. Se crearon rutas host de prueba en main (`1.1.1.1/32`→gw 192.168.40.1 Probe CLARO1, `9.9.9.9/32`→gw 192.168.50.1 Probe CLARO2), scripts `WAN2-up/WAN2-down/WAN3-up/WAN3-down` (policy=`read,write,test,policy,sensitive`; 3 pings 0.3s; desactivan/activan ruta primaria `to_WAN*` por comment "Default WAN2 CLARO1"/"Default WAN3 CLARO2") y netwatch hosts 1.1.1.1 y 9.9.9.9 (interval 10s, timeout 3s, start-delay 30s, up/down-scripts). Caída silenciosa de Claro → Movistar (d2) toma el relevo en ~10s. Backup pre-fix: `pre-fix-wancheck-20260817.backup`.
- **Red de clientes en `bridge_lan`:** puertos `1-LAN-OLT`, `ether2/3/7/8/9`, `sfp-sfpplus2/3/4`. IP `192.168.10.1/24` + `dhcp1` (lease 30m, pool 192.168.10.2-254). `12-WAN1-BACKUP`, `13-conf`, `sfp-sfpplus1` quedaron en bridge1. **Los ONTs no alcanzan `192.168.1.94`** (solo la red 192.168.1.x llega a gestión).
- **Rutas `main` invertidas (fix incidente WAN1):** `main`→CLARO_2 (192.168.50.1) **d5** primaria local + `main`→Movistar (192.168.1.1) **d6** respaldo. Así habilitar WAN1 ya no desvía el tráfico local del router a Movistar si está caído.
- **Mangle/NAT:** PCC `2/0`→WAN2_conn (CLARO_1), `2/1`→WAN3_conn (CLARO_2), `Mark WAN3` (in-interface=10-WAN3, antes de `Mark WAN1`); `Masq CLARO_1` (11-WAN2) y `Masq CLARO_2` (10-WAN3); `Clamp MSS WAN`. VLAN/GPPON de la OLT sin cambios. Interfaz `ether11` renombrada a `11-WAN2` (2026-08-17) — verificado que no rompió rutas/netwatch/scripts/mangle/NAT/DHCP; no quedan referencias a `ether11`.
- **Backups router:** `pre_balanceo_claro.backup/.rsc` (20:14, pre-cutover) y `post_balanceo_claro.backup/.rsc` (21:35, estado estable). `QoS-Clientes` apunta a 192.168.10.0/24 — sigue funcionando (ahora en bridge_lan).
- **Gotchas RouterOS 7.23.2:** `/ping` y `/tool netwatch` NO aceptan `routing-table`; `check-gateway=ping` al gateway local NO detecta caída silenciosa del proveedor; `/interface monitor-traffic` usa flag `once` (no `once=yes`); `/queue simple monitor` falla → usar `/queue simple print stats`; policy de scripts: `read,write,test,policy,sensitive` (`log` NO es válida; hardcodear, no vía `:local`). plink `-m` NO soporta `:foreach`/`:local` multilínea — los `.rsc` mutadores son una-línea con `[find ...]` inline. Runner `mikrotik/mikrotik/balanceo_fases/run_balanceo_fase.ps1` con fases: prerevision, backup, saneamiento, cutover, habilitar_wan, validacion, rollback, rollback_saneamiento.

## OLT Uplink Migration: GE4 → SFP+ 10G (EN REVISIÓN — 2 CUTOVERS FALLIDOS 2026-08-11, REVERTIDO)

- **Estado actual:** el uplink activo es **`1-LAN-OLT` (GE4, 1G)**. `sfp-sfpplus1` (XGE1, 10G) está como bridge port **disabled** (`nexum-stage-olt10g`). Los 2 intentos del 2026-08-11 (11:18 y 11:34) fallaron y fueron revertidos. Plan definitivo con checklist de certeza en `mikrotik/olt/PLAN_MIGRACION_OLT_10G.md`; aplicar en madrugada, NO ejecutar aún.
- **Clave:** ambos puertos OLT (`ge 0/0/4` Index 786432 y `xge 0/0/1` Index 786433) son **access en VLAN 100** (`VlanMode=1, Pvid=100, Tag="", Untag="100"`). Los GPON siguen tagged en VLAN 100. El bridge `bridge1` del router tiene `vlan-filtering=no` (L2 puro sin tags); la segmentación VLAN vive en la OLT.
- **CUTOVER #1 (11:18) falló (outage):** `xge 0/0/1` estaba en trunk (`VlanMode=3, Pvid=1, Tag=100, Untag=1`): las tramas untagged del router caían en VLAN 1 y no llegaban a los GPON (VLAN 100). Fix vía `POST port_vlan_modify` Index `786433` → `{"VlanMode":1,"Pvid":100,"Tag":"","Untag":"100"}`.
- **CUTOVER #2 (11:34) falló en silencio (3h19m sin datos):** enlace SFP+ subía (10G) pero clientes sin DHCP/DNS/ARP (deassign masivo ~35 leases a las 12:01). **Causa raíz: `vlan1`** (VLAN 100, `use-service-tag=yes`, `l3-hw-offloading=yes`, IP 192.168.101.1/24) se movió a `sfp-sfpplus1` a las 11:42:40 mientras ese puerto era bridge port HW-offloaded. Regla: **`vlan1` NO se toca — permanece en `1-LAN-OLT`**. Solo se intercambian bridge ports.
- **Loop risk confirmado:** LLDP muestra que el router se ve a sí mismo por ambos puertos → la OLT puentea GE4↔XGE1 (mismo L2). **Nunca habilitar ambos bridge ports a la vez.** Tras validar 10G estable, deshabilitar `ge 0/0/4` en la OLT.
- **RouterOS `find` gotchas (vía plink batch):** `find where interface="X"` devuelve vacío; usar **`[find interface=X]`** (sin `where`, sin comillas). `find` asignado a `:local`/`:set` también devuelve vacío — usar disable/enable **inline** con `[find interface=X]`.
- **Validación:** ping a IPs de clientes individuales da timeout (bloquean ICMP); la métrica fiable es tráfico agregado de `QoS-Clientes` (rate bajada), eventos DHCP (`assigned`/`deassigned` de MACs `80:F7:A6:B7:*`) y MACs de clientes aprendidas en `sfp-sfpplus1` (`/interface bridge host print where interface=sfp-sfpplus1`).
- **Baseline de certeza (2026-08-11 15:10):** OLT xge 0/0/1 == ge 0/0/4 (access VLAN 100, verificado vía `port_vlan_list`). Router: bridge1 `vlan-filtering=no`, RSTP root. vlan1 → interface=1-LAN-OLT. DHCP dhcp1 en bridge1 (lease 30m, pool 192.168.10.2-254). sfp-sfpplus1 link 10G full duplex (DAC CAB-10GSFP-P1M), rx-loss no, tx-fault no.

## Testing
- No test suite configured. `npm test` in both frontend and backend prints "no test specified" / runs react-scripts test (no actual tests written).

## Notable Entity Fields Convention
- `createdAt` / `updatedAt` via `@CreateDateColumn` / `@UpdateDateColumn`.
- Soft delete via `@DeleteDateColumn` on `deletedAt` (Client, Installation entities).
- Enum columns use TypeORM `@Column({ type: 'enum', enum: [...] })`.

### CI/CD — GitHub Actions Secrets

Required in `https://github.com/zandres28/IMV_CRM/settings/secrets/actions`:

| Secret | Value | Purpose |
|--------|-------|---------|
| `VPS_HOST` | `149.130.162.188` | SSH host |
| `VPS_USER` | `ubuntu` | SSH user |
| `SSH_PRIVATE_KEY` | Content of `~/.ssh/github_actions_deploy` (RSA PEM format) | SSH key |
| `VPS_SSH_PORT` | `22` | SSH port |

`REPO_DIR` (`/home/ubuntu/imv_crm`) is no longer used by the CI script but can be kept for reference.

**Important:** `appleboy/*` actions require the SSH key in RSA PEM format (converted via `ssh-keygen -p -m PEM`). ED25519 keys are NOT compatible.

### Deploy Flow (`.github/workflows/deploy_frontend.yml`)
1. `actions/checkout@v5` — checkout code
2. `actions/setup-node@v4` — Node 18, cache npm
3. Build frontend with `REACT_APP_API_URL=/api`, `CI=false`, sourcemaps off, ESLint disabled
4. `appleboy/scp-action@v0.1.7` — copy `frontend/build/*` → `/tmp/frontend-build` on VPS (strip_components: 2)
5. `appleboy/ssh-action@v0.1.10` — find frontend container by name, `docker cp` build into `/usr/share/nginx/html/`, reload nginx

### Important: No `docker compose build` on VPS
The VPS has only ~312Mi free RAM, which is insufficient for `react-scripts build`. The CI builds on the GitHub runner (ubuntu-latest, plentiful RAM) and only transfers the compiled artifacts.

### CRITICAL — Manual frontend build & deploy (2026-08-13 incident)
- **Always build with `REACT_APP_API_URL=/api`** for VPS deploy. Without it, the SPA wires `axios` to the default `http://localhost:3001/api`, so users on `imvcrm.duckdns.org` hit their OWN localhost → `ERR_CONNECTION_REFUSED` on every request. Verify after build: `grep -c localhost:3001 build/static/js/main.*.js` must be `0`.
- **`frontend/public/index.html` is a build template** — do NOT let tools inject a dev `<script src="http://localhost:8400/live.js?...">` into it (e.g. "impeccable-live"). If present, it ships into production and the browser logs ERR_CONNECTION_REFUSED for localhost:8400 on every page. Remove that script before building. Current file is clean (no live.js).
- Exact manual frontend deploy command: `$env:CI="false"; $env:GENERATE_SOURCEMAP="false"; $env:REACT_APP_API_URL="/api"; npm run build` → `scp -r build ubuntu@149.130.162.188:/tmp/fdb` → `docker cp /tmp/fdb/. imv_crm-frontend-1:/usr/share/nginx/html/` → `docker exec imv_crm-frontend-1 nginx -s reload`.
- Prefer pushing to master and letting `deploy_frontend.yml` CI run (it already sets `REACT_APP_API_URL=/api`, `CI=false`, sourcemaps off, ESLint disabled). Manual deploy must replicate those flags to avoid these regressions.
- After manual deploy, clean stale bundles: old `main.*.js` artifacts can remain in the container and mask the real issue — verify which hash `index.html` references and check counts for `localhost:3001` / `localhost:8400`.

### CI Deploy Keys on VPS
- `~/.ssh/authorized_keys` has 4 entries:
  - Original `imv_oracle_srv` key (ED25519, for manual admin SSH)
  - `github_actions_deploy` key (RSA 4096 PEM, for appleboy/* CI actions)

# Design Context

See `PRODUCT.md` (strategy) and `DESIGN.md` (visual system) for full documentation. Quick reference:

- **Register:** product (CRM dashboard/admin tool for ISP management)
- **Platform:** web (React SPA)
- **Shell:** dark sidebar (`#0B1020`) + dark AppBar (`#121833`) on light page body (`#F4F6FB`). No toggle — dual identity is fixed.
- **Brand color:** `#2D5BFF` (Azul Corporativo), used on ≤15% of any screen. One primary button per view.
- **Accent:** `#00D4A6` (Verde Ingeniería) for success/secondary actions.
- **Typography:** Bricolage Grotesque (headings, 700, -0.02em tracking) + DM Sans (body, 400, 14px).
- **Components:** MUI 5 via `sx` prop only (no `styled()`). All theme overrides in `frontend/src/theme.ts`.
- **Elevation:** Flat at rest; shadow on hover/modal (3 levels). Cards have 16px radius, buttons 10px.
- **Anti-reference:** Legacy ISP software — no dense borders, cramped tables, or inconsistent icons.

## Response Style
CRITICAL: Never use structured headers like "Objective", "Important Details", "Work State", "Next Move", "Blocked", "Active", "Completed", or "Relevant Files". Answer in 1-3 sentences. No preambles. No summaries. No analysis of your own actions. Just answer the question directly.
