# Sistema de Detección Automática de Pagos vía WhatsApp con OCR

Sistema completo para ISPs que permite recibir comprobantes de pago por WhatsApp, extraer automáticamente los datos mediante OCR y registrarlos en base de datos.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación Rápida](#instalación-rápida)
- [Configuración Detallada](#configuración-detallada)
- [Uso](#uso)
- [Troubleshooting](#troubleshooting)

## ✨ Características

- ✅ Detección automática de comprobantes de pago por WhatsApp
- 🔍 OCR para extraer: monto, referencia, banco, fecha, hora
- 💾 Registro automático en base de datos
- 📱 Confirmación automática al cliente
- 🔔 Notificaciones al administrador
- ⚠️ Manejo de errores y datos incompletos
- 🔐 Seguro y escalable

## 🛠 Requisitos

### Software requerido:
- **Evolution API** (funcionando)
- **n8n** v1.0+ (autoalojado o cloud)
- **PostgreSQL** o **MySQL** 5.7+
- **Chatwoot** (opcional, para gestión de tickets)

### Servicios externos:
- **OCR.space API** (gratis hasta 25k requests/mes) - [Registrarse aquí](https://ocr.space/ocrapi)

### Alternativas de OCR:
- Google Vision API (más preciso, de pago)
- Tesseract OCR (gratis, autoalojado)

## 🚀 Instalación Rápida

### Paso 1: Crear base de datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE pagos_isp;

# Conectar a la base de datos
\c pagos_isp

# Ejecutar el script SQL
\i schema-base-datos.sql
```

### Paso 2: Importar workflow en n8n

1. Abrir n8n
2. Click en "Import from file"
3. Seleccionar `workflow-pagos-whatsapp-ocr.json`
4. El workflow se importará con todos los nodos

### Paso 3: Configurar credenciales en n8n

#### PostgreSQL:
1. Click en el nodo "Guardar en base de datos"
2. Click en "Select Credential"
3. "Create New"
4. Completar:
   - Host: `localhost` (o tu servidor)
   - Database: `pagos_isp`
   - User: `tu_usuario`
   - Password: `tu_password`
   - Port: `5432`

#### OCR.space:
1. Registrarse en https://ocr.space/ocrapi
2. Copiar tu API Key
3. En el nodo "OCR - Extraer texto"
4. Reemplazar `TU_API_KEY_DE_OCR_SPACE` con tu key

### Paso 4: Configurar Evolution API

```bash
curl -X POST 'https://tu-evolution-api.com/webhook/set/tu-instancia' \
  -H 'Content-Type: application/json' \
  -H 'apikey: TU_API_KEY' \
  -d '{
    "enabled": true,
    "url": "https://tu-n8n.com/webhook/pagos-whatsapp",
    "events": ["MESSAGES_UPSERT"]
  }'
```

### Paso 5: Configurar URLs y números

En el workflow, reemplazar:

1. **URL de Evolution API**: `https://TU_EVOLUTION_API`
2. **Instance Name**: `INSTANCE_NAME`
3. **Número de Admin**: `NUMERO_ADMIN` (formato: 573001234567)

### Paso 6: Activar el workflow

1. En n8n, click en el botón "Active" (toggle superior derecho)
2. El workflow queda escuchando webhooks

## ⚙️ Configuración Detallada

### Estructura del workflow

```
1. Webhook ← recibe mensaje de Evolution API
   ↓
2. Filtro ← ¿tiene imagen y dice "pagado"?
   ↓
3. Extraer datos ← obtiene teléfono, messageId, etc.
   ↓
4. Descargar imagen ← obtiene el archivo
   ↓
5. OCR ← extrae texto de la imagen
   ↓
6. Analizar ← identifica monto, referencia, banco...
   ↓
7. Validar ← ¿datos completos?
   ↓
8a. Guardar completo ← registra en BD
    ↓
    Confirmar ← envía mensaje al cliente
    ↓
    Notificar admin ← alerta al administrador
   
8b. Guardar incompleto ← marca como requiere revisión
    ↓
    Solicitar datos ← pide info al cliente
    ↓
    Notificar admin ← alerta sobre error OCR
```

### Personalización de mensajes

#### Mensaje de confirmación (datos completos):
```javascript
// En el nodo "Enviar confirmación", editar el campo "text":
"✅ *Pago recibido*\\n\\n" +
"💰 Monto: ${{ $json.montoFormateado }}\\n" +
"🔢 Referencia: {{ $json.referencia }}\\n" +
"🏦 Banco: {{ $json.banco }}\\n\\n" +
"Tu servicio será activado en breve. ¡Gracias!"
```

#### Mensaje de solicitud de datos:
```javascript
// En el nodo "Solicitar datos manualmente":
"⚠️ Por favor envía:\\n\\n" +
"• Monto pagado\\n" +
"• Referencia\\n" +
"• Banco\\n\\n" +
"O una captura más clara."
```

### Palabras clave adicionales

Para activar el flujo, el cliente puede enviar la imagen con cualquiera de estas palabras:
- "pagado"
- "pago"
- "pagué"
- "transferencia"

Modificar en el nodo "¿Tiene imagen y dice PAGADO?":

```javascript
{{ $json.data.message.caption?.toLowerCase().includes('pagado') ||
   $json.data.message.caption?.toLowerCase().includes('pago') ||
   $json.data.message.caption?.toLowerCase().includes('pagué') ||
   $json.data.message.caption?.toLowerCase().includes('transferencia') }}
```

### Patrones de extracción de datos

Los patrones están en el nodo "Analizar datos del pago". Puedes modificarlos según los bancos de tu país:

```javascript
const patterns = {
  // Añadir más bancos
  banco: /(bancolombia|davivienda|nequi|TU_BANCO)/i,
  
  // Cambiar formato de fecha
  fecha: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
  
  // Agregar más patrones
  cuentaDestino: /cuenta[:\s]*([0-9-]+)/i
};
```

## 📱 Uso

### Para el cliente:

1. Cliente realiza transferencia bancaria
2. Toma captura del comprobante
3. Envía la captura por WhatsApp con la palabra "PAGADO"
4. Recibe confirmación automática
5. Espera activación del servicio

### Para el administrador:

1. Recibe notificación de nuevo pago
2. Verifica datos en base de datos:
   ```sql
   SELECT * FROM pagos_pendientes;
   ```
3. Verifica el pago en el banco
4. Marca como verificado:
   ```sql
   SELECT verificar_pago(ID_PAGO, 'admin', 'Pago confirmado');
   ```

### Consultas útiles SQL:

```sql
-- Ver pagos de hoy
SELECT * FROM pagos 
WHERE DATE(fecha_registro) = CURRENT_DATE;

-- Ver pagos pendientes con más de 1 hora
SELECT * FROM pagos_pendientes 
WHERE horas_pendiente > 1;

-- Ver estadísticas del día
SELECT * FROM estadisticas_diarias 
WHERE fecha = CURRENT_DATE;

-- Buscar por teléfono
SELECT * FROM pagos 
WHERE telefono = '573001234567' 
ORDER BY fecha_registro DESC;

-- Buscar por referencia
SELECT * FROM pagos 
WHERE referencia LIKE '%12345%';
```

## 🔧 Troubleshooting

### Problema: Webhook no llega a n8n

**Solución:**
```bash
# 1. Verificar que n8n esté accesible públicamente
curl https://tu-n8n.com/webhook/pagos-whatsapp

# 2. Verificar webhook en Evolution API
curl -X GET 'https://tu-evolution-api.com/webhook/find/instancia' \
  -H 'apikey: TU_API_KEY'

# 3. Ver logs
docker logs -f n8n
```

### Problema: OCR no detecta datos

**Causas comunes:**
- Imagen de baja calidad
- Texto muy pequeño
- Imagen rotada
- Mucho ruido visual

**Solución:**
```javascript
// En el nodo OCR, activar opciones adicionales:
{
  "scale": true,           // Mejora resolución
  "detectOrientation": true, // Detecta rotación
  "isTable": false
}
```

**Alternativa:** Cambiar a Google Vision API (más preciso)

### Problema: No descarga la imagen

**Solución:**
```javascript
// En el nodo "Descargar imagen", cambiar URL:
// Si Evolution API usa endpoint de media:
URL: https://tu-evolution-api.com/message/download/{{ $json.messageId }}

// O si usa URL directa:
URL: {{ $json.data.message.imageMessage.url }}
```

### Problema: Base de datos no guarda

**Solución:**
```bash
# Verificar conexión
psql -U usuario -d pagos_isp -c "SELECT 1;"

# Verificar permisos
GRANT ALL PRIVILEGES ON DATABASE pagos_isp TO usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO usuario;

# Ver logs de errores en n8n
docker logs n8n 2>&1 | grep ERROR
```

### Problema: Cliente no recibe confirmación

**Solución:**
```bash
# Verificar que Evolution API puede enviar mensajes
curl -X POST 'https://tu-evolution-api.com/message/sendText/instancia' \
  -H 'apikey: TU_API_KEY' \
  -d '{
    "number": "573001234567",
    "text": "Test"
  }'

# Verificar logs de Evolution API
docker logs evolution-api | grep sendText
```

## 📊 Monitoreo y Estadísticas

### Dashboard SQL para administrador:

```sql
-- Crear vista de dashboard
CREATE VIEW dashboard_admin AS
SELECT 
    COUNT(*) as total_hoy,
    SUM(monto) as monto_total_hoy,
    COUNT(CASE WHEN estado = 'pendiente_verificacion' THEN 1 END) as pendientes,
    COUNT(CASE WHEN requiere_revision THEN 1 END) as con_errores,
    AVG(monto) as promedio_pago
FROM pagos
WHERE DATE(fecha_registro) = CURRENT_DATE;

-- Consultar dashboard
SELECT * FROM dashboard_admin;
```

### Integración con Chatwoot (opcional):

Si quieres ver los pagos en Chatwoot, añade este nodo después de "Guardar en base de datos":

```javascript
// HTTP Request a Chatwoot
Method: POST
URL: https://tu-chatwoot.com/api/v1/accounts/1/conversations

Body:
{
  "source_id": "{{ $json.telefono }}",
  "inbox_id": 1,
  "contact": {
    "phone_number": "+{{ $json.telefono }}"
  },
  "message": {
    "content": "💰 Pago registrado: ${{ $json.monto }}\nRef: {{ $json.referencia }}"
  },
  "custom_attributes": {
    "monto": {{ $json.monto }},
    "referencia": "{{ $json.referencia }}"
  }
}
```

## 🔐 Seguridad

### Recomendaciones:

1. **Usar HTTPS** siempre para webhooks
2. **Validar API keys** en todos los endpoints
3. **Limitar rate limiting** en n8n (Settings → Executions)
4. **Backup diario** de la base de datos:
   ```bash
   pg_dump pagos_isp > backup_$(date +%Y%m%d).sql
   ```
5. **Logs de auditoría** activados en la tabla `pagos_log`

## 📈 Optimizaciones

### Para ISPs con alto volumen:

1. **Usar Redis** para caché de números frecuentes
2. **Queue system** con Bull/Redis en n8n
3. **OCR local** con Tesseract para reducir costos
4. **Replicación** de base de datos

## 🆘 Soporte

¿Necesitas ayuda? Revisa:
1. Logs de n8n: `docker logs n8n`
2. Logs de Evolution API: `docker logs evolution-api`
3. Logs de PostgreSQL: `/var/log/postgresql/`

## 📝 Licencia

Este sistema es de código abierto. Úsalo libremente para tu ISP.

---

**Desarrollado con ❤️ para ISPs**
