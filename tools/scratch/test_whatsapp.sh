#!/bin/sh
echo "=== Test 1: Evolution API via internal IP ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 http://172.21.0.5:8080/ 2>&1 || echo "FAILED"

echo ""
echo "=== Test 2: Send test WhatsApp ==="
curl -s -X POST "http://172.21.0.5:8080/message/sendText/imv_chatwoot2" \
  -H "apikey: 979AF1D6D474-435D-89FB-725780FC0F99" \
  -H "Content-Type: application/json" \
  -d '{"number":"573334006212","text":"🔧 *PRUEBA* - Sistema de monitoreo OLT funcionando correctamente"}' \
  --connect-timeout 10 2>&1 | head -20

echo ""
echo "=== Done ==="