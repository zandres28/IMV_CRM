param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,

    [string]$MapPath = ".\docs\astra-epg-name-map.json",

    [switch]$InPlace,

    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
    throw "No existe el archivo de configuracion: $ConfigPath"
}

if (-not (Test-Path $MapPath)) {
    throw "No existe el archivo de mapeo: $MapPath"
}

$config = Get-Content $ConfigPath -Raw -Encoding utf8 | ConvertFrom-Json
$mapObject = Get-Content $MapPath -Raw -Encoding utf8 | ConvertFrom-Json
$map = @{}

foreach ($property in $mapObject.PSObject.Properties) {
    $map[$property.Name] = [string]$property.Value
}

if (-not $config.make_stream) {
    throw "La configuracion no contiene make_stream"
}

$changes = @()

foreach ($stream in $config.make_stream) {
    if (-not $stream.name) {
        continue
    }

    $currentName = [string]$stream.name
    if ($map.ContainsKey($currentName)) {
        $newName = [string]$map[$currentName]
        if ($newName -and $newName -ne $currentName) {
            $changes += [pscustomobject]@{
                id = $stream.id
                oldName = $currentName
                newName = $newName
            }
            $stream.name = $newName
        }
    }
}

$targetPath = $OutputPath
if ($InPlace) {
    $targetPath = $ConfigPath
}

if (-not $targetPath) {
    $targetPath = [System.IO.Path]::Combine(
        [System.IO.Path]::GetDirectoryName((Resolve-Path $ConfigPath)),
        ([System.IO.Path]::GetFileNameWithoutExtension($ConfigPath) + ".epg" + [System.IO.Path]::GetExtension($ConfigPath))
    )
}

$jsonOutput = $config | ConvertTo-Json -Depth 100
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path -LiteralPath (Split-Path -Parent $targetPath) | Select-Object -ExpandProperty Path | ForEach-Object { Join-Path $_ (Split-Path -Leaf $targetPath) }), $jsonOutput, $utf8NoBom)

Write-Output "Cambios aplicados: $($changes.Count)"
$changes | Format-Table -AutoSize
Write-Output "Archivo generado: $targetPath"