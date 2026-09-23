# Informe de Hallazgos — Recorrido E2E con Playwright MCP

Fecha: 2026-09-23
Entorno: Windows local (Laragon MySQL 8.0.30 + backend `npm run dev` en :3001 + frontend `react-scripts` en :3000). BD local `imv_crm` = snapshot parcial de prueba (96 clientes, pagos hasta jul-2026).

## Alcance
Sesión con Playwright MCP ("Dramaturgo") como `admin@netflow.com` (rol admin). Pantallas recorridas: login, `/clients`, `/clients/:id` (detalle de cliente existente y recién creado), `/clients/new`, `/dashboard`, `/billing` (sep y abr 2026), `/installation-billing`, `/admin/users`, `/admin/roles`. No se tocaron páginas de red/OLT para no contactar el OLT de producción.

Evidencia (capturas y snapshots): carpeta `.playwright-mcp/`.

## Hallazgos por severidad

### 1. ALTO — Detalle de cliente queda en blanco tras crear cliente (y desde el listado)
- **Síntoma:** al crear un cliente nuevo, `/clients/106` muestra el encabezado (nombre, CC, chip "Activo", botón Retirar) y las 3 pestañas, pero **ningún panel de contenido**. Se disparan **7 errores de consola**: `MUI: The value provided to the Tabs component is invalid. None of the Tabs' children match with "3".`
- **Causa raíz:** el layout de pestañas se redujo de 6 a 3 (General/Servicios/Historial), pero hay navegación que aún pasa `openTabIndex: 3` (índice que correspondía a "Instalaciones" en el layout viejo):
  - `frontend/src/components/clients/ClientForm.tsx:129` — después de crear el cliente.
  - `frontend/src/components/clients/ClientList.tsx:648`, `:886`, `:1192` — accesos a "Instalaciones" desde el listado.
  - `frontend/src/components/clients/ClientDetail.tsx:83-91` y `:188-201` toman el `location.state.openTabIndex` como número crudo, **sin pasarlo por `getTabIndexFromParam`** (`ClientDetail.tsx:47-71`) que sí hace el mapeo correcto (`instalaciones` → 1, `general` → 0, `historial` → 2).
- **Fix sugerido:** en `ClientDetail.tsx`, al inicializar/sincronizar `tabValue` desde `openTabIndex`, pasar por un mapeo/`clamp` al rango 0..(nº de pestañas - 1); o cambiar las llamadas emisoras de `openTabIndex: 3` → `1` (Servicios, donde está la vista de instalaciones). Escribir un test de humo: crear cliente → el detalle muestra contenido.

### 2. ALTO — N+1 en el listado de clientes (~289 requests API en un solo render)
- **Síntoma:** abrir `/clients` disparó **1 request** `GET /api/clients?includeDeleted=true` + **288 requests** (3 por cada uno de los 96 clientes): `additional-services/client/{id}`, `products/client/{id}`, `installations/client/{id}`. Todos en paralelo. Total ~304 requests de red para renderizar la tabla.
- **Causa raíz:** `frontend/src/components/clients/ClientList.tsx:264-283` — `useEffect` que recorre TODOS los clientes con `Promise.all` de 3 servicios por cliente (`AdditionalServiceService.getByClient`, `ProductService.getByClient`, `InstallationService.getByClient`).
- **Riesgo:** es el mismo patrón de fan-out paralelo que según `AGENTS.md` congestionó la OLT en el pasado. En producción con 300+ clientes son ~900+ requests concurrentes contra el backend (agotamiento de pool de conexiones, CPU).
- **Fix sugerido:** endpoint de listado en lote (ej. `GET /api/clients?include=services` devolviendo servicios/productos/instalaciones agregados por cliente) o el equivalente `GET /api/clients/summary`; minimizar la carga a filas visibles; o cachear el mapa. Nunca reintroducir fan-out por fila hacia servicios externos.

### 3. MEDIO — Dashboard: card "Antigüedad Cartera" sin formato moneda
- **Síntoma:** la card muestra `9520000` crudo, mientras "Cartera Vencida" muestra `$ 14.005.000`.
- **Causa raíz:** `frontend/src/components/dashboard/GeneralDashboard.tsx:423` usa template string del número sin `formatCurrency` (la card hermana en `:406` sí lo usa).
- **Fix sugerido:** `value={formatCurrency(stats.collection.portfolioByAge.range90_plus)}`.

### 4. BAJO — Dashboard: ejes de gráfico con formato de moneda pobre
- **Síntoma:** gráfico "Antigüedad de Cartera" muestra etiquetas `$0k`, `$2500k`, `$5000k`… `$10000k`.
- **Causa raíz:** `frontend/src/components/dashboard/GeneralDashboard.tsx:559` — `tickFormatter={(val) => `$${val / 1000}k`}`.
- **Fix sugerido:** compactar legiblemente (ej. `$2,5M`, `$5M`) o `Intl.NumberFormat(es-CO, {notation:'compact'})`.

### 5. BAJO — `/installation-billing`: botón "Nuevo Pago Manual" deshabilitado
- El botón de encabezado aparece `disabled` en estado por defecto (filtros Mes/Año/Estado vacíos). Verificar si es intencional (solo habilitado con filtros) o debería permitir abrir el diálogo de todos modos.

### 6. OBSERVACIÓN (validar, no bug) — Facturación: "Recaudado" en $0 aunque existan pagos
- En abril 2026 (`/billing` con mes Abril) el grid muestra 78 clientes/$4.475.000 a cobrar, todos "Vencido", pero "Recaudado Total" = $0, pese a que la BD local tiene 61 pagos de abril en `payments`. Es coherente con el flujo "Generar Cobros" (no ejecutado a propósito en esta sesión) que crea los `billing_cargo` que alimentan este recaudado. Confirmar contra datos de producción antes de clasificarlo como bug.

## Aspectos verificados y correctos
- **Stack local completo sin Docker**: Laragon MySQL (3306) + backend (3001) + frontend (3000) compilan y corren; la solución `Start-Process npm` falla en Windows, se resuelve con `cmd.exe /c npm run dev`.
- **Login y auth**: JWT auto-attach y refresh funcionan; `/api/auth/me` responde 200.
- **Crear cliente**: `POST /api/clients` → 201, redirige a `/clients/106` (el bug del tabs es posterior a la creación, la creación en sí funciona).
- **Detalle de cliente SIN `openTabIndex`** (`/clients/105`): carga, 0 errores.
- **Facturación con datos**: abril 2026 renderiza 78 clientes, `$ 4.475.000`, desglose Planes/Adicionales/Productos/Instalaciones; diálogo "Registrar Pago" abre con cliente/total y sugiere fecha de hoy.
- **Pagos de instalación**: 31 pagos, monto total y pagado `$ 1.480.000`.
- **Admin (roles/usuarios)**: listados OK; rol `admin` con botones de edición bloqueados (protección correcta).
- **Consola**: 0 errores en login, `/clients`, `/clients/105`, `/dashboard`, `/billing` (abr), `/installation-billing`, `/admin/users`, `/admin/roles`. Unico foco de errores de consola = el bug #1.
- La duplicación de requests base (`auth/me`, `settings`, `notifications`, `clients`) en la lista es doble-invocación de efectos de React 18 StrictMode en desarrollo (no aparece en build de producción).

## Recomendaciones de proceso
- Prioridades: corregir #1 (visual catastrófico + spam de consola) y #2 (escalabilidad/riesgo de bloqueo de servicios externos ya visto con la OLT).
- No existe suite de pruebas; este recorrido E2E con Playwright MCP sirve como QA manual reproducible. Se puede convertir en un `scripts` de smoke con los pasos documentados (login → crear cliente → detalle → facturación → dashboard) para ejecutar tras cada deploy.
- Guardar el fix del tabs como regresión: al reducir layout de pestañas, auditar `openTabIndex`/`?tab=` emisores contra el nuevo mapeo.

## Artefactos de evidencia (`.playwright-mcp/`)
- `bug-tabs-detail-vacio.png` — detalle de cliente sin contenido (bug #1).
- `clients-list-n1.png` — listado de clientes (bug #2).
- `dashboard-antiguedad-bug.png` — card de dashboard sin formato (bug #3).
- `page-*.yml` — snapshots de a11y de cada pantalla recorrida.
- `client-detail.png` — detalle `/clients/105` correcto.
- `billing-abril.png` (intentado; timeout por carga de fuentes, petición no crítica).

## Estado de implementación (2026-09-23 — commit a continuación)

Todos los hallazgos #1-#5 están **implementados y verificados** en navegador:

1. **Tabs (ALTO) — CORREGIDO.** Emisores `openTabIndex: 3` → `1` en `ClientForm.tsx:129` y `ClientList.tsx:648/886/1192`. Además `ClientDetail.tsx` normaliza/clamp el `openTabIndex` al rango válido (`normalizeTabValue`, técnico=0..1 / admin=0..2) aceptando cualquier valor legacy. Verificado: crear cliente y "Agregar Instalación" aterrizan en la pestaña "Servicios" con contenido; 0 errores de consola.
2. **N+1 (ALTO) — CORREGIDO.** Nuevo endpoint `GET /api/clients/summary` (`ClientController.getSummaries`, registrado en `routes/clients.ts` **antes** de `/:id`) devuelve en UNA respuesta los adicionales/productos/instalaciones de todos los clientes del scope (sucursal/técnico), agrupados por `clientId`, replicando los filtros de los endpoints por-client (`isDeleted=false`, `relations`, orden). `ClientList.tsx` ahora hace 1 sola llamada. Verificado: `/clients` = 1 request `clients` + 1 request `summary` (antes ~289).
3. **Card "Antigüedad Cartera" (MEDIO) — CORREGIDO.** `GeneralDashboard.tsx:423` usa `formatCurrency(...)`. Verificado: muestra `$ 9.520.000`.
4. **Eje del gráfico (BAJO) — CORREGIDO.** `GeneralDashboard.tsx:559` usa `Intl.NumberFormat('es-CO', {notation:'compact'})`. Verificado: ejes muestran `0 / 2,5 M / 5 M / 7,5 M / 10 M`.
5. **Pago Manual de Instalación (BAJO) — IMPLEMENTADO.** El botón "Nuevo Pago Manual" era un stub hardcodeado con `disabled`; el backend `POST /api/installation-billing/manual` existía pero nunca se conectó en la UI. Se implementó diálogo MUI con: selector de cliente (Autocomplete), instalación del cliente (Select, se carga al elegir cliente), monto, fecha, método de pago y notas. Bonus: se alineó `CreateManualPaymentRequest` del service a lo que el backend espera (`date`, no `paymentDate`). Verificado: abre, carga clientes e instalaciones, valida el botón "Crear Pago".

Pendiente: hallazgo #6 queda como observación para validar contra producción.