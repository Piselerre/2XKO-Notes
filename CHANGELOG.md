# Changelog

All notable user-facing changes to **2XKO Notes**.  

---

## [0.5.0] — 2026-06-12

### Added
- **Portable Windows build** — single `.exe`, no install wizard, no admin rights
- Silent auto-updates for portable only (replaces the `.exe` in place; notes stay in Documents)
- Notice for users still on the retired **v0.4.x installer** with a link to download portable manually

### Changed
- **Auto-update channel split:** `latest.json` stays on v0.4.7 for old installers; portable uses `latest-portable.json`
- Data path remains **`Documents/2XKO Notes/2xko-notes.sync.json`** (outside the portable `.exe`)

### Beta testers
- Move your existing `2xko-notes.sync.json` into `Documents/2XKO Notes/` before first launch if it is stored elsewhere
- The portable build will **not** auto-install on top of the old installer — download v0.5.0 portable from GitHub once

---

## [0.4.7] — 2026-06-13

### Added
- **Android app (beta):** bottom navigation, touch-friendly editor, input glyph sheet
- Branded Windows installer (English) with note that your data is kept on reinstall
- Uninstall checkbox to optionally delete local notes in Documents
- Clearer binary update modal with visible download progress bar

### Improved
- Notes stored in **Documents/2XKO Notes/** — survive reinstall and uninstall (unless you opt in to delete)
- Mobile editor: larger touch targets, scrollable toolbar, 16px text (no zoom jump)
- Update progress shows percentage and bar in header pill + modal

### Fixed
- Binary update progress sometimes stuck at 0%
- Data recovery when localStorage is empty after reinstall

---

## [0.4.6] — 2026-06-13

### Added
- Smarter update system: small content changes (roster, announcements) can apply without a full reinstall
- Background downloads with a discreet header pill instead of blocking popups
- Public update channel for faster, lighter patches

### Improved
- Update flow feels quieter and more professional
- Character roster can refresh from the cloud without downloading the full app

### Fixed
- Update detection when multiple releases exist on GitHub
- Installer metadata URLs for the auto-updater

---

## [0.4.5] — 2026-06-12

### Improved
- Auto-update test release to validate in-app installs from v0.4.4

---

## [0.4.4] — 2026-06-12

### Added
- Signed in-app auto-updater (no browser required)
- Startup flow: update prompt → success message → support prompt

### Improved
- Update checks use the highest available version, not only GitHub "latest"

---

## [0.4.3] — 2026-06-12

### Added
- Floating announcement cards above the Ko-fi button
- Thresh added to the character roster

### Improved
- Create Team modal layout and selection styling
- Matchup screens show clearer **VS** labels

---

## [0.4.2] — 2026-06-12

### Added
- Google Drive sync for notes
- Update prompt on startup with optional "ignore updates"
- Senna added to the character roster

### Improved
- Sync only runs after real edits, with a clearer countdown in the UI
- App icon and branding (PixelR)

### Fixed
- Google Drive OAuth and upload reliability
- Team creator clipping and selected-character hover state

---

## [0.4.1] — 2026-06 (internal)

### Improved
- Project structure and desktop build pipeline
- Character thumbnails and asset bundling

---

## [0.4.0] — 2026-06

### Added
- First public desktop builds for Windows
- Core notes app: combos, matchups, players, team notes
- Local autosave and basic settings

---

## [0.1.0] — early development

### Added
- Initial prototype: character notes, markdown editors, and 2XKO-themed UI shell
