param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('precheck', 'cutover', 'validacion', 'rollback')]
    [string]$Fase,

    [string]$RouterHost = '192.168.1.9',
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
    precheck   = '01_precheck_backup.rsc'
    cutover    = '02_cutover_habilitar_monitoreo.rsc'
    validacion = '03_validacion_post_cutover.rsc'
    rollback   = '04_rollback_rapido.rsc'
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
