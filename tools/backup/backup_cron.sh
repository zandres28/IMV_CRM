#!/bin/bash

# Cron Job para Backups Automáticos
#
# INSTALACIÓN:
# 1. chmod +x backup_cron.sh
# 2. crontab -e → añadir: 0 3 * * * /path/to/CRM-2025/backup_cron.sh

# Cambiar al directorio del proyecto
cd "$(dirname "$0")"

# Ejecutar el script de backup
./backup_db.sh

# Opcional: Sincronizar con almacenamiento externo
# Descomenta y configura según tu servicio (AWS S3, Google Drive, etc.)
# aws s3 cp backups/ s3://tu-bucket/backups/ --recursive
# rclone sync backups/ remote:backups/
