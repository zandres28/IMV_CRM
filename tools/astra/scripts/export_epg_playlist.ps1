param(
    [string]$InventoryPath = ".\docs\astra-epg-current-inventory.csv",

    [string]$BaseUrl = "http://172.19.104.106:8000",

    [string]$OutputPath = ".\docs\astra-epg-current-playlist.m3u",

    [switch]$IncludeDisabled
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InventoryPath)) {
    throw "No existe el inventario EPG: $InventoryPath"
}

$inventory = Import-Csv $InventoryPath

if (-not $inventory) {
    throw "El inventario EPG esta vacio: $InventoryPath"
}

$baseUrlNormalized = $BaseUrl.TrimEnd('/')
$playlist = New-Object System.Collections.Generic.List[string]
$channelCount = 0
$playlist.Add('#EXTM3U')

foreach ($row in $inventory) {
    $isEnabled = [System.Convert]::ToBoolean($row.enabled)
    if (-not $IncludeDisabled -and -not $isEnabled) {
        continue
    }

    $channelName = [string]$row.name
    $epgName = if ($row.epg_name) { [string]$row.epg_name } else { $channelName }
    $xmltvId = if ($row.sample_xmltv_id) { [string]$row.sample_xmltv_id } else { $epgName }
    $statusGroup = if ($isEnabled) { 'Astra' } else { 'Astra Disabled' }
    $streamUrl = "$baseUrlNormalized/play/$($row.id)"

    $extInf = '#EXTINF:-1 tvg-id="{0}" tvg-name="{1}" group-title="{2}",{3}' -f $xmltvId, $epgName, $statusGroup, $channelName
    $playlist.Add($extInf)
    $playlist.Add($streamUrl)
    $channelCount++
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Resolve-Path -LiteralPath (Split-Path -Parent $OutputPath) | Select-Object -ExpandProperty Path | ForEach-Object { Join-Path $_ (Split-Path -Leaf $OutputPath) }), $playlist, $utf8NoBom)

Write-Output "Playlist exportada: $OutputPath"
Write-Output "Canales incluidos: $channelCount"
Write-Output "Base URL: $baseUrlNormalized"