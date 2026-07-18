param(
    [string]$ConfigPath = ".\docker\astra-test\config\config.json",

    [string]$EquivalencesPath = ".\docs\astra-webgrab-colombia-equivalences.csv",

    [string]$OutputPath = ".\docs\astra-epg-current-inventory.csv"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
    throw "No existe el archivo de configuracion: $ConfigPath"
}

if (-not (Test-Path $EquivalencesPath)) {
    throw "No existe el archivo de equivalencias: $EquivalencesPath"
}

$config = Get-Content $ConfigPath -Raw -Encoding utf8 | ConvertFrom-Json
$equivalences = Import-Csv $EquivalencesPath

if (-not $config.make_stream) {
    throw "La configuracion no contiene make_stream"
}

$lookup = @{}
foreach ($row in $equivalences) {
    if ($row.astra_name -and -not $lookup.ContainsKey($row.astra_name)) {
        $lookup[$row.astra_name] = $row
    }

    if ($row.epg_name -and -not $lookup.ContainsKey($row.epg_name)) {
        $lookup[$row.epg_name] = $row
    }
}

$inventory = foreach ($stream in ($config.make_stream | Sort-Object name, id)) {
    $name = [string]$stream.name
    $match = $null

    if ($lookup.ContainsKey($name)) {
        $match = $lookup[$name]
    }

    [pscustomobject]@{
        id = [string]$stream.id
        name = $name
        enabled = [bool]$stream.enable
        provider_reference = if ($match) { [string]$match.provider_reference } else { "" }
        sample_xmltv_id = if ($match) { [string]$match.sample_xmltv_id } else { "" }
        epg_name = if ($match) { [string]$match.epg_name } else { "" }
        notes = if ($match) { [string]$match.notes } else { "SIN_COBERTURA" }
    }
}

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$csv = $inventory | ConvertTo-Csv -NoTypeInformation
[System.IO.File]::WriteAllLines((Resolve-Path -LiteralPath (Split-Path -Parent $OutputPath) | Select-Object -ExpandProperty Path | ForEach-Object { Join-Path $_ (Split-Path -Leaf $OutputPath) }), $csv, $utf8Bom)

$total = @($inventory).Count
$covered = @($inventory | Where-Object { $_.notes -ne 'SIN_COBERTURA' }).Count
$uncovered = $total - $covered

Write-Output "Inventario exportado: $OutputPath"
Write-Output "Streams totales: $total"
Write-Output "Con cobertura EPG: $covered"
Write-Output "Sin cobertura EPG: $uncovered"