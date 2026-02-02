# Script para migrar de Laragon local a Docker local
# Ejecutar en PowerShell

$ErrorActionPreference = "Stop"

$DB_NAME = "imv_crm"
$LOCAL_USER = "root"
# Contraseña de la DB Docker definida en docker-compose.yml
$DOCKER_DB_PASSWORD = "rootpassword" 

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   MIGRACIÓN DE LARAGON A DOCKER (LOCAL)      " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Backup
Write-Host "`n[1/4] Generando backup de la base de datos local (Laragon)..." -ForegroundColor Yellow
if (Test-Path "docker-dump.sql") { Remove-Item "docker-dump.sql" }

try {
    # Intentar mysqldump sin contraseña (configuración típica Laragon)
    mysqldump -u $LOCAL_USER --databases $DB_NAME --add-drop-database --result-file="docker-dump.sql"
    if ((Get-Item "docker-dump.sql").Length -eq 0) { throw "El archivo SQL está vacío" }
    Write-Host "Backup exitoso: docker-dump.sql" -ForegroundColor Green
}
catch {
    Write-Error "Error al crear el backup. Asegúrate de que Laragon/MySQL esté corriendo y 'mysqldump' accesible."
    Write-Error $_
    exit 1
}

# 2. Docker Up
Write-Host "`n[2/4] Construyendo e iniciando contenedores Docker..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al iniciar Docker. Revisa que Docker Desktop esté corriendo."
    exit 1
}

# 3. Esperar DB
Write-Host "`n[3/4] Esperando 30 segundos a que la base de datos inicie correctamente..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 4. Importar
Write-Host "`n[4/4] Importando datos al contenedor Docker..." -ForegroundColor Yellow
try {
    # Usamos docker-compose exec con la opción -T para deshabilitar pseudo-tty y permitir stdin
    Get-Content docker-dump.sql | docker-compose exec -T -e MYSQL_PWD=$DOCKER_DB_PASSWORD db mysql -u root $DB_NAME
    Write-Host "¡Importación de datos completada!" -ForegroundColor Green
}
catch {
    Write-Error "Error al importar los datos."
    Write-Error $_
}

Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "   MIGRACIÓN COMPLETADA EXITOSAMENTE          " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost" 
Write-Host "Backend:  http://localhost:3001" 
Write-Host "Database: localhost:3307"
Write-Host "`nPara detener todo usa: docker-compose down"
