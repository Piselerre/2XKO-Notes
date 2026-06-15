# Build portable zip and publish GitHub release on Piselerre/2XKO-Notes
param(
  [string]$Version = "0.5.0",
  [switch]$Replace
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

Built with care for the competitive 2XKO scene.

1. Download the **.zip** and extract everything.
2. Run **2XKO Notes.exe** inside the **2XKO Notes** folder.
3. Notes are stored in ``Documentos\2XKO Notes\2xko-notes.sync.json``

Windows builds are signed with free code signing from SignPath Foundation.
See CODE_SIGNING_POLICY.md in the repository.
"@

$tag = "v$Version"
if ($Replace -or (gh release view $tag 2>$null)) {
  Write-Host "Replacing release $tag..."
  gh release delete $tag --yes 2>$null
}

Write-Host "Creating GitHub release $tag..."
gh release create $tag $zip --title "2XKO Notes v$Version (portable)" --notes $notes

if ($LASTEXITCODE -ne 0) {
  Write-Warning "gh release failed. Zip is ready at: $zip"
  exit 1
}

Write-Host "Published: https://github.com/Piselerre/2XKO-Notes/releases/tag/$tag"
