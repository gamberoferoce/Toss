$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zip = Join-Path $dist "FileSharing.zip"
$exe = Join-Path $dist "FileSharing.exe"
$bat = Join-Path $root "Start FileSharing.bat"
$allowBat = Join-Path $root "Allow Network.bat"

if (-not (Test-Path $exe)) {
  Write-Error "FileSharing.exe missing. Run: npm run pack"
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }

$stage = Join-Path $dist "zip-stage"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item $exe (Join-Path $stage "FileSharing.exe")
Copy-Item $bat (Join-Path $stage "Start FileSharing.bat")
if (Test-Path $allowBat) {
  Copy-Item $allowBat (Join-Path $stage "Allow Network.bat")
}

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Created: $zip"
