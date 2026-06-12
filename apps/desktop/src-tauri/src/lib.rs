mod google_drive;

use std::fs;
use tauri::Manager;

use google_drive::{
    drive_connect, drive_disconnect, drive_pull, drive_push, drive_status, GoogleDrivePullResult,
    GoogleDrivePushResult, GoogleDriveStatus,
};

const DATA_FILE: &str = "2xko-notes.sync.json";

#[tauri::command]
fn save_data_file(app: tauri::AppHandle, content: String) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(DATA_FILE);
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_data_file_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(DATA_FILE).to_string_lossy().to_string())
}

#[tauri::command]
fn load_data_file(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join(DATA_FILE);
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn google_drive_status(app: tauri::AppHandle) -> Result<GoogleDriveStatus, String> {
    drive_status(&app)
}

#[tauri::command]
fn google_drive_connect(app: tauri::AppHandle) -> Result<String, String> {
    drive_connect(&app)
}

#[tauri::command]
fn google_drive_disconnect(app: tauri::AppHandle) -> Result<(), String> {
    drive_disconnect(&app)
}

#[tauri::command]
fn google_drive_pull(
    app: tauri::AppHandle,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePullResult, String> {
    drive_pull(&app, folder_id, file_id)
}

#[tauri::command]
fn google_drive_push(
    app: tauri::AppHandle,
    content: String,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePushResult, String> {
    drive_push(&app, content, folder_id, file_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_data_file,
            get_data_file_path,
            load_data_file,
            google_drive_status,
            google_drive_connect,
            google_drive_disconnect,
            google_drive_pull,
            google_drive_push,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
