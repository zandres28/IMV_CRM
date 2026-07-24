#!/bin/sh
echo "=== Testing OLT connectivity ==="
curl -s -o /dev/null -w "OLT HTTP: %{http_code}\n" --connect-timeout 5 http://192.168.1.94:8080/ 2>&1 || echo "OLT: FAILED"

echo ""
echo "=== Testing MikroTik SSH ==="
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 admin@192.168.1.94 "/system resource print" 2>&1 || echo "MikroTik SSH: FAILED"

echo ""
echo "=== Testing MikroTik API (REST) ==="
curl -s -o /dev/null -w "MikroTik REST: %{http_code}\n" --connect-timeout 5 -u admin:IMV*2025* http://192.168.1.94/rest/system/resource 2>&1 || echo "MikroTik REST: FAILED"

echo ""
echo "=== Alternative: Telnet to MikroTik API port ==="
curl -s -o /dev/null -w "MikroTik API port 8728: %{http_code}\n" --connect-timeout 5 http://192.168.1.94:8728/ 2>&1 || echo "API port 8728: FAILED"