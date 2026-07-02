$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$zip = Join-Path $root "dist\FileSharing.zip"
$version = (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version
$tag = "v$version"

if (-not (Test-Path $zip)) {
  Write-Host "Building zip..."
  Push-Location $root
  npm run pack
  Pop-Location
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) not found. Install: winget install GitHub.cli"
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Log in once: gh auth login"
  gh auth login
}

$notes = @"
## Toss $tag

Windows distribution zip:
- Toss.exe (receiver window)
- FileSharing.exe (background server)
- README.txt (usage)

Extract to one folder and run Toss.exe.
"@

gh release create $tag $zip --title "Toss $tag" --notes $notes
Write-Host "Release created: https://github.com/gamberoferoce/Toss/releases/tag/$tag"
