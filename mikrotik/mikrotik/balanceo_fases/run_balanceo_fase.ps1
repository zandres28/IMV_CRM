param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('prerevision', 'backup', 'saneamiento', 'cutover', 'habilitar_wan', 'validacion', 'rollback', 'rollback_saneamiento')]
    [string]$Fase,

    [string]$RouterHost = '192.168.1.94',
    [string]$RouterUser = 'admin',
    [string]$HostKey = 'ssh-rsa 2048 SHA256:xHR9VAY1bfITBTvkucySm9Qdz5omAwcNqHJ5c1XjFHg',
    [string]$PlinkPath = 'C:\Program Files\PuTTY\plink.exe',
    [string]$Password
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PlinkPath)) {
    throw "No se encontro plink en: $PlinkPath"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $secure = Read-Host 'Password MikroTik' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rscDir = Join-Path $baseDir 'rsc'

$map = @{
    prerevision        = '00_pre_revision.rsc'
    backup             = '01_precheck_backup.rsc'
    saneamiento        = '02_fase1_saneamiento.rsc'
    cutover            = '03_fase2_cutover_balanceo.rsc'
    habilitar_wan      = '04_fase2_habilitar_wan.rsc'
    validacion         = '05_fase3_validacion.rsc'
    rollback           = '06_fase4_rollback_rapido.rsc'
    rollback_saneamiento = '07_fase4_rollback_saneamiento.rsc'
}

$rscFile = Join-Path $rscDir $map[$Fase]
if (-not (Test-Path $rscFile)) {
    throw "No se encontro script de fase: $rscFile"
}

Write-Host "Ejecutando fase '$Fase' en $RouterUser@$RouterHost usando $rscFile" -ForegroundColor Cyan

& $PlinkPath -batch -hostkey $HostKey -ssh -pw $Password "$RouterUser@$RouterHost" -m $rscFile
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    throw "La fase '$Fase' fallo con codigo de salida $exitCode"
}

Write-Host "Fase '$Fase' completada correctamente." -ForegroundColor Green