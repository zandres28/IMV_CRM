# Nexum CRM — AGENTS.md

## Stack
- **Frontend:** React 18 + TypeScript 4.9 + MUI 5 + Redux Toolkit + Recharts. CRA (react-scripts 5).
- **Backend:** Express 5 + TypeScript 5.9 + TypeORM 0.3 + MySQL 8.0. ts-node-dev for dev, tsc to build.
- **Infra:** Docker Compose (db:3307, backend:3010, frontend:8095), Nginx reverse-proxy in frontend container.
- **CI:** GitHub Actions — push to master → SSH into VPS → `docker compose build frontend && docker compose up -d frontend`.

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
   - MD5 hash is lowercase hex string
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
- Token caching: cached for 10 min, auto-refresh on `code: 2`
- Search priority: by `onuSerialNumber` first (case-insensitive match on `PonSn`), fallback to `ponId` + `onuId`
- Instantiate per request: `new OltService()` (stateless, token cached in instance)

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

### Performance Note
Frontend `InstallationsList.tsx` uses `Promise.all` to fetch ONU status for all installations simultaneously, which can overload the OLT. Consider adding server-side caching or throttling if needed.

## Testing
- No test suite configured. `npm test` in both frontend and backend prints "no test specified" / runs react-scripts test (no actual tests written).

## Notable Entity Fields Convention
- `createdAt` / `updatedAt` via `@CreateDateColumn` / `@UpdateDateColumn`.
- Soft delete via `@DeleteDateColumn` on `deletedAt` (Client, Installation entities).
- Enum columns use TypeORM `@Column({ type: 'enum', enum: [...] })`.

## Design Context

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
