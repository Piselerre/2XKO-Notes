# Build portable zip and publish GitHub release on Piselerre/2XKO-Notes
param(
  [string]$Version = "0.5.0"
)

Set-Location $PSScriptRoot\..

Write-Host "Building portable zip..."
powershell -ExecutionPolicy Bypass -File scripts/build-portable.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/generate-latest-portable-json.mjs $Version
node scripts/verify-updates-channel.mjs

$zip = Join-Path "dist-releases" "2XKO.Notes_${Version}_x64-portable.zip"
if (-not (Test-Path $zip)) {
  Write-Error "Zip not found: $zip"
  exit 1
}

$notes = @"
## 2XKO Notes v$Version (portable)

- Descarga el **.zip**, extrae la carpeta y ejecuta **2XKO Notes.exe**
- Sin instalador, sin admin, sin certificado
- Notas en ``Documentos\2XKO Notes\2xko-notes.sync.json``
- Si vienes del instalador v0.4.x: descarga esto manualmente (no auto-actualiza)
- Actualizaciones futuras solo para esta version portable
"@

Write-Host "Creating GitHub release v$Version..."
gh release view "v$Version" 2>$null
if ($LASTEXITCODE -eq 0) {
  gh release upload "v$Version" $zip --clobber
} else {
  gh release create "v$Version" $zip --title "2XKO Notes v$Version (portable)" --notes $notes
}

if ($LASTEXITCODE -ne 0) {
  Write-Warning "gh release failed (run: gh auth login). Zip is ready at: $zip"
  exit 1
}

Write-Host "Published: https://github.com/Piselerre/2XKO-Notes/releases/tag/v$Version"
