# Builds a portable ZIP (no installer, no admin).
# Usage: .\scripts\build-portable.ps1
Set-Location $PSScriptRoot\..
$env:VITE_PORTABLE_BUILD = "1"

Set-Location apps\desktop
pnpm tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$conf = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
$ver = $conf.version
$releaseDir = "src-tauri/target/release"
$exe = Join-Path $releaseDir "2XKO Notes.exe"
if (-not (Test-Path $exe)) {
  Write-Error "Missing $exe"
  exit 1
}

$root = Join-Path $releaseDir "portable-staging"
if (Test-Path $root) { Remove-Item $root -Recurse -Force }
$appDir = Join-Path $root "2XKO Notes"
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Copy-Item $exe (Join-Path $appDir "2XKO Notes.exe") -Force
$resources = Join-Path $releaseDir "resources"
if (Test-Path $resources) {
  Copy-Item $resources (Join-Path $appDir "resources") -Recurse -Force
}
New-Item -ItemType File -Force -Path (Join-Path $appDir ".portable") | Out-Null

$readme = @"
2XKO Notes v$ver

Run: 2XKO Notes\2XKO Notes.exe

Your notes: Documents\2XKO Notes\2xko-notes.sync.json
Windows builds are signed via SignPath Foundation (see CODE_SIGNING_POLICY.md).
"@
Set-Content -Path (Join-Path $root "README.txt") -Value $readme -Encoding UTF8

$distRoot = Join-Path $PSScriptRoot "..\dist-releases"
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
$zipName = "2XKO.Notes_${ver}_x64-portable.zip"
$zipPath = Join-Path $distRoot $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $root "*") -DestinationPath $zipPath -Force

Set-Location $PSScriptRoot\..
Write-Host ""
Write-Host "Portable ZIP ready:"
Write-Host "  $zipPath"
Write-Host "  $((Get-Item $zipPath).Length) bytes"
