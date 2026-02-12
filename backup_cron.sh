# Cron Job para Backups Automáticos
# 
# Este archivo debe copiarse al servidor VPS y añadirse al crontab
# 
# INSTALACIÓN:
# 1. Copiar este archivo al servidor: scp backup_cron.sh user@vps:/path/to/CRM-2025/
# 2. Hacer ejecutable: chmod +x backup_cron.sh
# 3. Editar crontab: crontab -e
# 4. Añadir una de estas líneas:
#
# OPCIÓN 1: Backup diario a las 2:00 AM
# 0 2 * * * /path/to/CRM-2025/backup_cron.sh >> /path/to/CRM-2025/backups/cron.log 2>&1
#
# OPCIÓN 2: Backup cada 6 horas
# 0 */6 * * * /path/to/CRM-2025/backup_cron.sh >> /path/to/CRM-2025/backups/cron.log 2>&1
#
# OPCIÓN 3: Backup diario a las 3:00 AM (recomendado)
# 0 3 * * * /path/to/CRM-2025/backup_cron.sh >> /path/to/CRM-2025/backups/cron.log 2>&1

#!/bin/bash

# Cambiar al directorio del proyecto
cd "$(dirname "$0")"

# Ejecutar el script de backup
./backup_db.sh

# Opcional: Sincronizar con almacenamiento externo
# Descomenta y configura según tu servicio (AWS S3, Google Drive, etc.)
# aws s3 cp backups/ s3://tu-bucket/backups/ --recursive
# rclone sync backups/ remote:backups/
