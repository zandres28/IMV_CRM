# Configuración de Evolution API para integración con n8n

## 1. Configurar Webhook en Evolution API

### Método 1: Via API REST

```bash
curl -X POST 'https://TU_DOMINIO_EVOLUTION_API/webhook/set/NOMBRE_INSTANCIA' \
  -H 'Content-Type: application/json' \
  -H 'apikey: TU_API_KEY' \
  -d '{
    "enabled": true,
    "url": "https://TU_DOMINIO_N8N/webhook/pagos-whatsapp",
    "webhookByEvents": false,
    "events": [
      "MESSAGES_UPSERT"
    ]
  }'
```

### Método 2: Via archivo de configuración

Edita el archivo de configuración de tu instancia de Evolution API:

```yaml
# config.yml o similar
webhook:
  enabled: true
  url: https://TU_DOMINIO_N8N/webhook/pagos-whatsapp
  events:
    - MESSAGES_UPSERT
  byEvents: false
```

## 2. Eventos disponibles en Evolution API

```
MESSAGES_UPSERT       # Mensaje recibido (el que usamos)
MESSAGES_UPDATE       # Mensaje actualizado
MESSAGES_DELETE       # Mensaje eliminado
SEND_MESSAGE          # Mensaje enviado
CONNECTION_UPDATE     # Estado de conexión
CALL                  # Llamada entrante
GROUPS_UPSERT         # Grupo creado/actualizado
CHATS_UPDATE          # Chat actualizado
```

## 3. Estructura del payload que recibirá n8n

```json
{
  "event": "messages.upsert",
  "instance": "mi-instancia",
  "data": {
    "key": {
      "remoteJid": "573001234567@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C5F8B5D5F4E3A2B1"
    },
    "message": {
      "imageMessage": {
        "url": "https://...",
        "mimetype": "image/jpeg",
        "caption": "Pago realizado - PAGADO",
        "fileLength": "45231",
        "height": 1080,
        "width": 1920
      }
    },
    "messageTimestamp": "1706486400",
    "pushName": "Juan Pérez"
  },
  "destination": "webhook-n8n",
  "date_time": "2026-01-29T10:30:00.000Z"
}
```

## 4. Configurar descargas de media

Evolution API necesita configuración para descargar archivos:

```bash
# Habilitar descarga de media
curl -X PATCH 'https://TU_DOMINIO_EVOLUTION_API/settings/set/NOMBRE_INSTANCIA' \
  -H 'Content-Type: application/json' \
  -H 'apikey: TU_API_KEY' \
  -d '{
    "settings": {
      "autoDownloadMedia": true,
      "mediaPath": "/evolution/media"
    }
  }'
```

## 5. Endpoint para descargar imagen en n8n

Si Evolution API no incluye la URL directa, usa este endpoint:

```
GET https://TU_DOMINIO_EVOLUTION_API/message/download/NOMBRE_INSTANCIA/{messageId}
Headers:
  apikey: TU_API_KEY
```

## 6. Variables de entorno importantes

```bash
# .env de Evolution API
WEBHOOK_URL=https://TU_DOMINIO_N8N/webhook/pagos-whatsapp
WEBHOOK_ENABLED=true
AUTO_DOWNLOAD_MEDIA=true
MEDIA_PATH=/evolution/media
```

## 7. Seguridad recomendada

### Opción A: API Key en headers
```javascript
// En n8n, valida en el webhook:
if (headers['x-api-key'] !== 'TU_API_KEY_SECRETA') {
  return { error: 'No autorizado' };
}
```

### Opción B: Webhook firmado
```javascript
// Evolution API puede firmar el payload
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', 'SECRET_KEY')
  .update(JSON.stringify(payload))
  .digest('hex');
```

## 8. Testing del webhook

```bash
# Simular un mensaje con imagen
curl -X POST 'https://TU_DOMINIO_N8N/webhook/pagos-whatsapp' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "remoteJid": "573001234567@s.whatsapp.net",
        "id": "TEST123"
      },
      "message": {
        "imageMessage": {
          "url": "https://ejemplo.com/imagen.jpg",
          "caption": "Pago realizado - PAGADO"
        }
      }
    }
  }'
```

## 9. Troubleshooting

### Problema: Webhook no se recibe
```bash
# Verificar configuración
curl -X GET 'https://TU_DOMINIO_EVOLUTION_API/webhook/find/NOMBRE_INSTANCIA' \
  -H 'apikey: TU_API_KEY'
```

### Problema: No se descarga la imagen
```bash
# Verificar que autoDownloadMedia esté activo
curl -X GET 'https://TU_DOMINIO_EVOLUTION_API/settings/find/NOMBRE_INSTANCIA' \
  -H 'apikey: TU_API_KEY'
```

### Problema: Error de permisos
```bash
# Verificar permisos del directorio de media
chmod -R 755 /evolution/media
chown -R evolution:evolution /evolution/media
```

## 10. Logs útiles

```bash
# Ver logs de Evolution API
docker logs -f evolution-api --tail 100

# Filtrar solo webhooks
docker logs evolution-api 2>&1 | grep "webhook"

# Ver logs de n8n
docker logs -f n8n --tail 100
```

## 11. Ejemplo de respuesta automática

```bash
# Enviar mensaje de vuelta
curl -X POST 'https://TU_DOMINIO_EVOLUTION_API/message/sendText/NOMBRE_INSTANCIA' \
  -H 'Content-Type: application/json' \
  -H 'apikey: TU_API_KEY' \
  -d '{
    "number": "573001234567",
    "text": "✅ Pago recibido y en verificación"
  }'
```
