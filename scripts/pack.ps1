$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zip = Join-Path $dist "FileSharing.zip"
$serverExe = Join-Path $dist "FileSharing.exe"
$tossExe = Join-Path $dist "Toss.exe"
$readme = Join-Path $root "README.txt"

if (-not (Test-Path $serverExe)) {
  Write-Error "FileSharing.exe missing. Run: npm run pack"
}
if (-not (Test-Path $tossExe)) {
  Write-Error "Toss.exe missing. Run: npm run build:host"
}
if (-not (Test-Path $readme)) {
  Write-Error "README.txt missing."
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }

$stage = Join-Path $dist "zip-stage"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item $tossExe (Join-Path $stage "Toss.exe")
Copy-Item $serverExe (Join-Path $stage "FileSharing.exe")
Copy-Item $readme (Join-Path $stage "README.txt")

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Created: $zip (Toss.exe, FileSharing.exe, README.txt)"
