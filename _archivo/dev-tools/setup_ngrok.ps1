$ngrokPath = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

Write-Host "Configurando Ngrok..." -ForegroundColor Cyan
$token = Read-Host -Prompt "Pegue aquí su Ngrok Authtoken (lo copias de dashboard.ngrok.com)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: No ingresó ningún token." -ForegroundColor Red
    exit
}

& $ngrokPath config add-authtoken $token

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡Éxito! Token guardado correctamente." -ForegroundColor Green
    Write-Host "Ahora intenta ejecutar de nuevo: npm run tunnel" -ForegroundColor Yellow
} else {
    Write-Host "Hubo un error configurando el token." -ForegroundColor Red
}
