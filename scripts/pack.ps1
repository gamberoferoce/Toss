$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zip = Join-Path $dist "FileSharing.zip"
$serverExe = Join-Path $dist "FileSharing.exe"
$tossExe = Join-Path $dist "Toss.exe"
$bat = Join-Path $root "Start FileSharing.bat"
$allowBat = Join-Path $root "Allow Network.bat"

if (-not (Test-Path $serverExe)) {
  Write-Error "FileSharing.exe missing. Run: npm run pack"
}
if (-not (Test-Path $tossExe)) {
  Write-Error "Toss.exe missing. Run: npm run build:host"
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }

$stage = Join-Path $dist "zip-stage"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item $tossExe (Join-Path $stage "Toss.exe")
Copy-Item $serverExe (Join-Path $stage "FileSharing.exe")
Copy-Item $bat (Join-Path $stage "Start FileSharing.bat")
if (Test-Path $allowBat) {
  Copy-Item $allowBat (Join-Path $stage "Allow Network.bat")
}
$instructions = Join-Path $root "INSTRUCTIONS.txt"
if (Test-Path $instructions) {
  Copy-Item $instructions (Join-Path $stage "INSTRUCTIONS.txt")
}

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Created: $zip"
