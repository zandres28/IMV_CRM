#!/bin/bash

# Detener el script si hay errores
set -e

echo "========================================"
echo "   DESPLEGANDO IMV CRM EN VPS"
echo "========================================"

# 1. Obtener últimos cambios del código
echo "[1/3] Descargando cambios desde Git..."
git pull origin master

# 2. Reconstruir los contenedores
# --build: Fuerza a reconstruir si hubo cambios en código (React/Node)
# -d: Modo "Detached" (en segundo plano)
# --remove-orphans: Limpia contenedores viejos si se eliminaron del compose
echo "[2/3] Actualizando contenedores Docker..."

# Detectar versión de Compose (con o sin guion)
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build --remove-orphans
else
    docker compose up -d --build --remove-orphans
fi

# 3. Limpieza
echo "[3/3] Limpiando imágenes antiguas para ahorrar espacio..."
docker image prune -f

echo "========================================"
echo "   DESPLIEGUE COMPLETADO EXITOSAMENTE   "
echo "========================================"
