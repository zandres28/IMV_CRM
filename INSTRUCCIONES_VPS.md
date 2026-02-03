# Guía de Migración al VPS

## Prerrequisitos en el VPS
1. Tener Docker y Docker Compose instalados.
2. Tener Git instalado.
3. Puerto 80 (Frontend) y 3010 (Backend) libres.

## Paso 1: Subir tu código (Desde tu PC Local)
Guarda tus cambios locales (incluyendo los nuevos archivos Docker) y súbelos a tu repositorio.

```powershell
git add .
git commit -m "feat: Dockerización completa del CRM"
git push origin master
```

## Paso 2: Configuración Inicial en el VPS
*(Solo se hace la primera vez)*

1. Conéctate a tu VPS por SSH.
2. Clona tu repositorio (si no lo has hecho):
   ```bash
   git clone <URL_DE_TU_REPO> imv_crm
   cd imv_crm
   ```
3. Da permisos de ejecución al script de despliegue:
   ```bash
   chmod +x deploy_vps.sh
   ```

## Paso 3: Migrar los Datos (Base de Datos)
Tu VPS comenzará con la base de datos vacía. Para llevar tus datos locales:

**En tu PC Local (PowerShell):**
Sube el archivo `docker-dump.sql` (que generamos hace un momento) a tu VPS usando SCP.
```powershell
scp docker-dump.sql root@TU_IP_VPS:/root/imv_crm/
```

**En tu VPS (SSH):**
Importa el archivo al contenedor de base de datos del VPS.
```bash
# Entra a la carpeta
cd imv_crm
# Inicia los servicios (si no están corriendo)
./deploy_vps.sh
# Espera 30 segundos
# Ejecuta la importación
cat docker-dump.sql | docker-compose exec -T db mysql -u root -prootpassword imv_crm
```

## Paso 4: Actualizaciones Futuras
Cada vez que hagas un cambio en el código en tu PC:
1. `git push` en tu PC.
2. Entras al VPS y ejecutas `./deploy_vps.sh`.
