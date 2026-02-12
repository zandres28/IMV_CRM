# Sistema de Backups de Base de Datos

## 📁 Archivos Creados

- **`backup_db.sh`**: Script para crear backups manuales
- **`restore_db.sh`**: Script para restaurar backups
- **`backup_cron.sh`**: Script para backups automáticos vía cron
- **`backups/`**: Directorio donde se guardan los backups (se crea automáticamente)

---

## 🚀 Uso Rápido

### Crear un Backup Manual

```bash
./backup_db.sh
```

Esto creará un archivo comprimido en `backups/backup_imv_crm_YYYYMMDD_HHMMSS.sql.gz`

### Restaurar un Backup

```bash
./restore_db.sh backups/backup_imv_crm_20260212_150000.sql.gz
```

> ⚠️ **ADVERTENCIA**: La restauración sobrescribirá todos los datos actuales

---

## ⚙️ Configuración en el VPS

### 1. Dar Permisos de Ejecución

```bash
chmod +x backup_db.sh restore_db.sh backup_cron.sh
```

### 2. Crear Primer Backup (Prueba)

```bash
./backup_db.sh
```

### 3. Configurar Backups Automáticos

**Opción A: Backup Diario a las 3:00 AM (Recomendado)**

```bash
# Editar crontab
crontab -e

# Añadir esta línea (ajusta la ruta):
0 3 * * * /ruta/completa/CRM-2025/backup_cron.sh >> /ruta/completa/CRM-2025/backups/cron.log 2>&1
```

**Opción B: Backup cada 12 horas**

```bash
0 */12 * * * /ruta/completa/CRM-2025/backup_cron.sh >> /ruta/completa/CRM-2025/backups/cron.log 2>&1
```

**Opción C: Backup cada 6 horas**

```bash
0 */6 * * * /ruta/completa/CRM-2025/backup_cron.sh >> /ruta/completa/CRM-2025/backups/cron.log 2>&1
```

### 4. Verificar que el Cron está Funcionando

```bash
# Ver tareas programadas
crontab -l

# Ver log de backups
tail -f backups/cron.log
```

---

## 📊 Gestión de Backups

### Listar Backups Disponibles

```bash
ls -lh backups/
```

### Ver los Últimos 5 Backups

```bash
ls -lt backups/backup_*.sql.gz | head -5
```

### Eliminar Backups Antiguos Manualmente

```bash
# Eliminar backups mayores a 30 días
find backups/ -name "backup_*.sql.gz" -mtime +30 -delete
```

> 💡 **Nota**: El script `backup_db.sh` mantiene automáticamente los últimos 30 backups

---

## ☁️ Sincronización con la Nube (Opcional)

### AWS S3

```bash
# Instalar AWS CLI primero
aws configure

# Sincronizar backups
aws s3 sync backups/ s3://tu-bucket/imv-crm-backups/
```

### Google Drive (rclone)

```bash
# Instalar rclone
curl https://rclone.org/install.sh | sudo bash

# Configurar
rclone config

# Sincronizar
rclone sync backups/ gdrive:IMV-CRM-Backups/
```

---

## 🔧 Personalización

### Cambiar Retención de Backups

Edita `backup_db.sh` línea 45:

```bash
# Cambiar de 30 a 60 backups
ls -t backup_*.sql.gz 2>/dev/null | tail -n +61 | xargs -r rm
```

### Cambiar Nombre del Contenedor DB

Si tu contenedor de base de datos tiene un nombre diferente, edita en `backup_db.sh` y `restore_db.sh`:

```bash
DB_CONTAINER="tu_contenedor_db"
```

---

## 📋 Checklist de Seguridad

- [ ] Crear backup inicial
- [ ] Probar restauración en entorno de prueba
- [ ] Configurar backups automáticos con cron
- [ ] Verificar que los backups se están creando
- [ ] *(Opcional)* Configurar sincronización con la nube
- [ ] Documentar la ubicación de backups para el equipo
- [ ] Probar restauración completa al menos una vez al mes

---

## ❓ Troubleshooting

### "Permission denied" al ejecutar scripts

```bash
chmod +x backup_db.sh restore_db.sh backup_cron.sh
```

### El cron no se ejecuta

1. Verifica que la ruta en el crontab sea absoluta
2. Revisa el log: `cat backups/cron.log`
3. Verifica que el usuario tenga permisos para ejecutar docker

### Backup muy grande

Los backups se comprimen automáticamente con gzip. Si aún son muy grandes:
- Considera limpiar datos antiguos innecesarios
- Usa almacenamiento externo (S3, Google Drive)
