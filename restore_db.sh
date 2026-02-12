#!/bin/bash

# Script de Restauración de Base de Datos
# Uso: ./restore_db.sh <archivo_backup.sql.gz>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore_db.sh <archivo_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh backups/backup_*.sql.gz 2>/dev/null || echo "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo '$BACKUP_FILE' no existe"
    exit 1
fi

# Configuración
DB_CONTAINER="imv_crm-db-1"
DB_USER="root"
DB_PASSWORD="rootpassword"
DB_NAME="imv_crm"

echo "========================================="
echo "⚠️  ADVERTENCIA: RESTAURACIÓN DE BASE DE DATOS"
echo "========================================="
echo "Esta operación SOBRESCRIBIRÁ todos los datos actuales"
echo "Archivo a restaurar: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 0
fi

echo ""
echo "🔄 Iniciando restauración..."

# Descomprimir si es necesario
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Descomprimiendo archivo..."
    TEMP_FILE="/tmp/restore_temp_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    SQL_FILE="$TEMP_FILE"
else
    SQL_FILE="$BACKUP_FILE"
fi

# Restaurar
echo "⏳ Restaurando base de datos..."
docker exec -i $DB_CONTAINER mysql \
    -u $DB_USER \
    -p$DB_PASSWORD \
    $DB_NAME < "$SQL_FILE"

# Limpiar archivo temporal
if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
fi

echo ""
echo "========================================="
echo "✅ Restauración completada exitosamente!"
echo "========================================="
echo "Base de datos: $DB_NAME"
echo "Desde archivo: $BACKUP_FILE"
echo ""
