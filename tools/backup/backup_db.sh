#!/bin/bash

# Script de Backup Manual de Base de Datos
# Uso: ./backup_db.sh

set -e

# Configuración
DB_CONTAINER="imv_crm-db-1"
DB_USER="root"
DB_PASSWORD="<DB_PASSWORD: ver compose del VPS>"
DB_NAME="imv_crm"
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "🔄 Iniciando backup de base de datos..."
echo "========================================="
echo "Fecha: $(date)"
echo "Base de datos: $DB_NAME"
echo "Archivo: $BACKUP_FILE"
echo ""

# Realizar el backup
docker exec $DB_CONTAINER mysqldump \
    -u $DB_USER \
    -p$DB_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    $DB_NAME > "$BACKUP_FILE"

# Comprimir el backup
echo "📦 Comprimiendo backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Obtener tamaño del archivo
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo "========================================="
echo "✅ Backup completado exitosamente!"
echo "========================================="
echo "Archivo: $BACKUP_FILE"
echo "Tamaño: $SIZE"
echo ""

# Limpiar backups antiguos (mantener los últimos 30)
echo "🧹 Limpiando backups antiguos (manteniendo los últimos 30)..."
cd "$BACKUP_DIR"
ls -t backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
BACKUPS_COUNT=$(ls -1 backup_*.sql.gz 2>/dev/null | wc -l)
echo "Backups totales: $BACKUPS_COUNT"
echo ""
echo "✨ Proceso completado!"
