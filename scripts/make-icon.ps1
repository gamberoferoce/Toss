$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$png = Join-Path $root "host\app.png"
$ico = Join-Path $root "host\app.ico"

$src = $args[0]
if ($src -and (Test-Path $src)) {
  Copy-Item $src $png -Force
}

if (-not (Test-Path $png)) {
  Write-Error "host/app.png missing. Pass source PNG path or add host/app.png"
}

Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap $png
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Open($ico, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()
$bitmap.Dispose()
Write-Host "Created: $ico"
