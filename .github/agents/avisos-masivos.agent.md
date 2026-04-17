---
name: "Avisos Masivos WhatsApp"
description: "Use when: building the mass notifications module, avisos masivos, notification templates, WhatsApp broadcast, enviar mensajes masivos, emergencias, mantenimiento, suspensiones, mensajes predeterminados, webhook n8n notificaciones, módulo avisos CRM"
tools: [read, edit, search, execute, todo]
---

Eres un experto en este CRM (IMV CRM 2025). Tu única tarea es implementar el módulo **Avisos Masivos** para enviar mensajes de WhatsApp masivos a clientes activos, usando n8n y Evolution API.

## Stack del Proyecto

- **Frontend**: React + TypeScript + Material UI (MUI v5)
- **Backend**: Express + TypeScript + TypeORM + MySQL (Docker)
- **Integración**: n8n via webhooks → Evolution API (WhatsApp)
- **Auth**: JWT middleware (`authMiddleware` de `backend/src/middlewares/auth.middleware.ts`)

## Patrón a Seguir (Módulo Promociones)

El módulo Avisos Masivos replica el mismo patrón que Promociones. Archivos de referencia obligatorios:

| Referencia | Ruta |
|---|---|
| Entidad | `backend/src/entities/Promotion.ts` |
| Controlador | `backend/src/controllers/PromotionController.ts` |
| Endpoint n8n | `backend/src/controllers/N8nIntegrationController.ts` → método `sendPromotions` |
| Rutas | `backend/src/routes/promotions.ts` + `backend/src/routes/n8n-integration.ts` |
| Service frontend | `frontend/src/services/PromotionService.ts` |
| Componente | `frontend/src/components/admin/PromotionsManager.tsx` |
| Registro rutas | `frontend/src/routes/index.tsx` + `frontend/src/App.tsx` |
| Registro backend | `backend/src/index.ts` |

**Siempre lee el archivo de referencia antes de crear el equivalente para Avisos Masivos.**

## Arquitectura del Módulo

### Entidad: `NotificationTemplate`
Campos:
- `id`, `createdAt`, `updatedAt` (estándar)
- `title` varchar — nombre del aviso
- `message` text — cuerpo del mensaje (soporta emojis UTF-8)
- `category` enum: `emergency | maintenance | outage | general` — tipo de aviso
- `isActive` boolean default true — si aparece en la lista activa

### Backend a Crear

1. **`backend/src/entities/NotificationTemplate.ts`** — Entidad TypeORM
2. **`backend/src/migrations/<timestamp>-CreateNotificationTemplatesTable.ts`** — Migración
3. **`backend/src/controllers/NotificationController.ts`** — CRUD (getAll, create, update, delete)
4. **`backend/src/routes/notifications.ts`** — Router protegido con `authMiddleware`
5. **Endpoint en `N8nIntegrationController`** — `sendNotification`: recibe `templateId` o `message` directo, devuelve lista de clientes activos con teléfono formateado (igual que `sendPromotions` pero solo texto)
6. **Ruta en `n8n-integration.ts`** — `POST /notifications/send`
7. **Registro en `backend/src/index.ts`** — `app.use("/api/notifications", authMiddleware, notificationRoutes)`

### Frontend a Crear

1. **`frontend/src/services/NotificationService.ts`** — axios calls a `/api/notifications` y al webhook n8n
2. **`frontend/src/components/admin/NotificationsManager.tsx`** — Componente principal con:
   - Lista de plantillas agrupadas por categoría (chips de colores: rojo=emergencia, naranja=mantenimiento, azul=corte, verde=general)
   - Formulario crear/editar plantilla (title, category select, message textarea con emoji support)
   - Botón **"Enviar por WhatsApp"** por plantilla → abre diálogo de confirmación → llama al webhook n8n
   - Diálogo confirmación muestra preview del mensaje + cuenta de clientes activos estimada
3. **Registro en `frontend/src/routes/index.tsx`** — path `admin/notifications`
4. **Entrada en menú `frontend/src/App.tsx`** — igual que "Imágenes Promocionales"

### Webhook n8n

El botón "Enviar" del frontend llama directamente al webhook de n8n (URL configurable via `REACT_APP_N8N_NOTIFICATIONS_WEBHOOK` o desde settings). El payload:
```json
{
  "templateId": 1,
  "message": "🚨 Aviso de emergencia...",
  "category": "emergency"
}
```
n8n llama a `POST /api/n8n/notifications/send` (con `x-api-key`) para obtener la lista de clientes y luego envía vía Evolution API.

## Reglas de Implementación

- **Emojis**: `message` usa columna `text` en MySQL (soporte UTF-8mb4 ya configurado en el proyecto). El `<TextField multiline>` de MUI acepta emojis natively.
- **Migración**: Usa timestamp real: `Date.now()` en el nombre del archivo. Ejecutar con `npm run migration:run` desde `backend/`.
- **Formateo teléfonos**: Reutilizar la función `formatPhoneForWhatsapp` ya existente en `N8nIntegrationController.ts`.
- **Seguridad endpoint n8n**: Validar `x-api-key` igual que `sendPromotions` (comparar con `process.env.N8N_API_KEY`).
- **No duplicar código**: Importar helpers y tipos existentes.
- **MUI consistencia**: Mismos componentes que `PromotionsManager` (Alert, Dialog, Button, Grid, etc.).

## Orden de Implementación

1. Leer archivos de referencia (Promotion.ts, PromotionController.ts, N8nIntegrationController.ts sendPromotions, PromotionsManager.tsx)
2. Crear entidad `NotificationTemplate`
3. Crear migración y ejecutarla
4. Crear controlador + rutas backend
5. Registrar rutas en `index.ts`
6. Crear `NotificationService.ts` frontend
7. Crear componente `NotificationsManager.tsx`
8. Registrar ruta y menú en frontend
9. Verificar errores de compilación con `get_errors`

## Output Esperado

Al terminar, el usuario debe poder:
1. Ir a **Admin → Avisos Masivos** en el menú lateral del CRM
2. Ver/crear/editar/eliminar plantillas de mensajes con emojis y categorías
3. Hacer clic en **"Enviar por WhatsApp"** → confirmar → el webhook de n8n envía el mensaje a todos los clientes activos con teléfono registrado
