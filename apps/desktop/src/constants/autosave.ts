/** Wait after last edit before writing local JSON (typing debounce). */
export const LOCAL_SAVE_DEBOUNCE_MS = 3_000;

/** Desktop beta: dated backups in Documents/2XKO Notes/backups/ (see Tauri save_data_file). */
export const BETA_BACKUP_INTERVAL_SECS = 300;

/** Wait after local save before uploading to Google Drive. */
export const DRIVE_SYNC_DEBOUNCE_MS = 45_000;
