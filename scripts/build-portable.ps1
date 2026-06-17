# Builds a single portable .exe (no zip, no extra folder).
# Usage: .\scripts\build-portable.ps1
Set-Location $PSScriptRoot\..
$env:VITE_PORTABLE_BUILD = "1"
$env:X2KO_PORTABLE_BUILD = "1"

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

$distRoot = Join-Path $PSScriptRoot "..\dist-releases"
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
$outName = "2XKO.Notes_${ver}_x64-portable.exe"
$outPath = Join-Path $distRoot $outName
Copy-Item $exe $outPath -Force

Set-Location $PSScriptRoot\..
Write-Host ""
Write-Host "Portable EXE ready:"
Write-Host "  $outPath"
Write-Host "  $((Get-Item $outPath).Length) bytes"
