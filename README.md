# 2XKO Notes

Competitive note-taking for **2XKO**: combos, matchups, players, and more.  
Built by [@PixelR_](https://twitter.com/PixelR_).

---

## Download (Windows portable — v0.5.0+)

1. Go to **[Releases](https://github.com/Piselerre/2XKO-Notes/releases)** on GitHub.
2. Download **`2XKO.Notes_<version>_x64-portable.exe`**.
3. Run it from any folder. No install wizard.

> First run only: if Windows SmartScreen appears, choose **More info → Run anyway** (code signing is planned for a later release).

### Still on the old installer (v0.4.x)?

That version **will not auto-update** to v0.5.0. Download the portable build manually. Your notes stay in **`Documents/2XKO Notes/2xko-notes.sync.json`**.

See **[docs/PORTABLE_RELEASE.md](docs/PORTABLE_RELEASE.md)** for beta tester migration steps.

---

## Android (beta)

A **mobile APK** for Android is available for beta testers. It shares the same data model as desktop (local save + Google Drive sync).

---

## How to use the app

| Section | What it's for |
| ------- | ------------- |
| **Combos** | Notes and setups per character |
| **Matchups** | What to do against each opponent |
| **Players** | Habits and tendencies of players you know |
| **Frame Data** | Link to the official 2XKO wiki |
| **Teams** | Duo notes (from Combos) |

- **No Save button** — everything autosaves.
- Your data lives in **`Documents/2XKO Notes/`** on your PC (not inside the `.exe`).
- In **Settings** you can export/import a JSON backup.
- **VIEW** mode reads notes; **EDIT** mode edits them.

---

## Updates

**Portable v0.5.0+** updates silently in the background (download + restart).  
**Old installer v0.4.x** — check [Releases](https://github.com/Piselerre/2XKO-Notes/releases) manually for the portable build.

---

## Support the project

2XKO Notes isn't free to maintain (time, testing, release hosting).  
If it helps your ranked or tournament prep:

**[Ko-fi — support PixelR](https://ko-fi.com/PixelR)**

---

## Common issues

**Won't open / blank screen**  
Re-download the latest portable from Releases. You need **WebView2** (Windows 10/11 usually includes it).

**Lost my notes**  
Check Settings → data file path (`Documents/2XKO Notes/`). Import a `.json` backup if you have one. Check `Documents/2XKO Notes/backups/`.

**Bug or suggestion**  
Open a [GitHub Issue](https://github.com/Piselerre/2XKO-Notes/issues) or message [@PixelR_](https://twitter.com/PixelR_).
