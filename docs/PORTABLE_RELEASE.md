# Portable v0.5.0 — beta tester notes

## Download (manual, one time)

Users on the **old installer** (v0.4.6 / v0.4.7) will **not** receive v0.5.0 automatically.  
Download **`2XKO.Notes_0.5.0_x64-portable.zip`** from [GitHub Releases](https://github.com/Piselerre/2XKO-Notes/releases). See **[docs/DOWNLOAD.md](DOWNLOAD.md)** for full instructions.

Extract the zip and run **`2XKO Notes.exe`** inside the `2XKO Notes` folder.

Windows builds are signed via [SignPath Foundation](https://signpath.org/) — see [CODE_SIGNING_POLICY.md](../CODE_SIGNING_POLICY.md).

## Your notes (do not lose data)

Notes are **never** stored inside the `.exe`. They live here:

```
Documents/2XKO Notes/2xko-notes.sync.json
```

Backups (automatic):

```
Documents/2XKO Notes/backups/YYYY-MM-DD/HH-MM-SS.json
```

### Before first launch of portable

1. If you already have `2xko-notes.sync.json`, put it in `Documents/2XKO Notes/`.
2. If you still have data only in `%AppData%\com.x2ko.notes\`, the app migrates it on first run — but moving the file yourself is safer for beta.
3. Optional: export a JSON backup from Settings in the old app.

Replacing or updating the portable `.exe` **does not delete** your notes folder.

## Updates after v0.5.0

Only the **portable** build auto-updates (silent download + restart).  
Future releases publish to `latest-portable.json`, not the old installer channel.

## Build (maintainers)

```powershell
# Requires TAURI_SIGNING_PRIVATE_KEY (and optional TAURI_SIGNING_PRIVATE_KEY_PASSWORD)
# for updater .sig files — same key as tauri.conf.json pubkey.
$env:TAURI_SIGNING_PRIVATE_KEY = "<your-minisign-private-key>"
pnpm tauri:build:portable
```

Then upload the built exe to GitHub as `2XKO.Notes_<ver>_x64-portable.exe` and run:

```bash
pnpm latest:portable 0.5.0
pnpm publish:updates
```

**Important:** keep `updates-channel/latest.json` at **v0.4.7** so old installer clients are not pushed to portable.
