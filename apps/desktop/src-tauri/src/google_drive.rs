use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use reqwest::blocking::Client;
use reqwest::header::AUTHORIZATION;
use serde::{Deserialize, Serialize};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

const SCOPE: &str = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const DRIVE_API: &str = "https://www.googleapis.com/drive/v3";
const UPLOAD_API: &str = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME: &str = "2XKO Notes";
const SYNC_FILE: &str = "2xko-notes.sync.json";
const TOKENS_FILE: &str = "google_oauth_tokens.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDriveStatus {
    pub connected: bool,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDrivePushResult {
    pub folder_id: String,
    pub file_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDrivePullResult {
    pub content: String,
    pub folder_id: String,
    pub file_id: String,
}

#[derive(Debug, Deserialize)]
struct OAuthCredentials {
    client_id: String,
    client_secret: String,
}

#[derive(Debug, Deserialize)]
struct InstalledCredentialsFile {
    installed: OAuthCredentials,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TokenData {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: Option<i64>,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct UserInfo {
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DriveFileList {
    files: Option<Vec<DriveFile>>,
}

#[derive(Debug, Deserialize)]
struct DriveFile {
    id: String,
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn tokens_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(TOKENS_FILE))
}

fn strip_bom(raw: &str) -> &str {
    raw.trim().strip_prefix('\u{feff}').unwrap_or(raw.trim())
}

fn parse_credentials(raw: &str) -> Option<OAuthCredentials> {
    let raw = strip_bom(raw);
    if let Ok(file) = serde_json::from_str::<OAuthCredentials>(raw) {
        return Some(file);
    }
    if let Ok(file) = serde_json::from_str::<InstalledCredentialsFile>(raw) {
        return Some(file.installed);
    }
    None
}

fn load_credentials(app: &AppHandle) -> Result<OAuthCredentials, String> {
    if let Some(creds) = parse_credentials(include_str!("../oauth_credentials.json")) {
        return Ok(creds);
    }

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(path) = app.path().resolve("oauth_credentials.json", BaseDirectory::Resource) {
        candidates.push(path);
    }
    if let Ok(dir) = app.path().resource_dir() {
        candidates.push(dir.join("oauth_credentials.json"));
    }
    if let Ok(dir) = app_data_dir(app) {
        candidates.push(dir.join("oauth_credentials.json"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("oauth_credentials.json"));
            candidates.push(parent.join("resources").join("oauth_credentials.json"));
        }
    }

    let mut seen = std::collections::HashSet::new();
    for path in candidates {
        if !seen.insert(path.clone()) || !path.exists() {
            continue;
        }
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        if let Some(creds) = parse_credentials(&raw) {
            return Ok(creds);
        }
    }

    Err("Google Drive credentials are invalid. Rebuild the app with a valid oauth_credentials.json.".into())
}

fn load_tokens(app: &AppHandle) -> Result<Option<TokenData>, String> {
    let path = tokens_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string()).map(Some)
}

fn save_tokens(app: &AppHandle, tokens: &TokenData) -> Result<(), String> {
    let dir = app_data_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(tokens).map_err(|e| e.to_string())?;
    fs::write(tokens_path(app)?, json).map_err(|e| e.to_string())
}

fn delete_tokens(app: &AppHandle) -> Result<(), String> {
    let path = tokens_path(app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())
}

fn refresh_access_token(
    client: &Client,
    creds: &OAuthCredentials,
    tokens: &mut TokenData,
) -> Result<(), String> {
    let refresh = tokens
        .refresh_token
        .as_ref()
        .ok_or("Session expired. Connect Google Drive again.")?;

    let res = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", creds.client_id.as_str()),
            ("client_secret", creds.client_secret.as_str()),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh.as_str()),
        ])
        .send()
        .map_err(|e| format!("Token refresh failed: {e}"))?;

    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Token refresh failed: {body}"));
    }

    let data: TokenResponse = res.json().map_err(|e| e.to_string())?;
    tokens.access_token = data.access_token;
    if let Some(rt) = data.refresh_token {
        tokens.refresh_token = Some(rt);
    }
    if let Some(exp) = data.expires_in {
        tokens.expires_at = Some(unix_now() + exp);
    }
    Ok(())
}

fn ensure_access_token(
    app: &AppHandle,
    client: &Client,
    creds: &OAuthCredentials,
    tokens: &mut TokenData,
) -> Result<(), String> {
    let valid = tokens
        .expires_at
        .map(|exp| exp > unix_now() + 60)
        .unwrap_or(false);
    if valid {
        return Ok(());
    }
    refresh_access_token(client, creds, tokens)?;
    save_tokens(app, tokens)?;
    Ok(())
}

fn auth_header(tokens: &TokenData) -> String {
    format!("Bearer {}", tokens.access_token)
}

fn wait_for_auth_code(port: u16) -> Result<String, String> {
    let listener =
        TcpListener::bind(format!("127.0.0.1:{port}")).map_err(|e| format!("OAuth server: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + Duration::from_secs(180);
    loop {
        if Instant::now() > deadline {
            return Err("OAuth timed out. Try again.".into());
        }
        match listener.accept() {
            Ok((mut stream, _)) => {
                if let Some(code) = read_oauth_code(&mut stream)? {
                    return Ok(code);
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

fn read_oauth_code(stream: &mut TcpStream) -> Result<Option<String>, String> {
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let req = String::from_utf8_lossy(&buf[..n]);
    let first_line = req.lines().next().unwrap_or("");
    let path = first_line.split_whitespace().nth(1).unwrap_or("");

    let mut code: Option<String> = None;
    if let Some(query) = path.split('?').nth(1) {
        for pair in query.split('&') {
            let mut parts = pair.splitn(2, '=');
            if parts.next() == Some("code") {
                code = parts.next().map(|c| urlencoding::decode(c).unwrap_or_default().into_owned());
            }
        }
    }

    let body = if code.is_some() {
        "<html><body><h2>2XKO Notes connected.</h2><p>You can close this tab.</p></body></html>"
    } else {
        "<html><body><h2>Authorization failed.</h2></body></html>"
    };
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes()).ok();
    stream.flush().ok();

    Ok(code)
}

fn fetch_user_email(client: &Client, access_token: &str) -> Result<Option<String>, String> {
    let res = client
        .get(USERINFO_URL)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(None);
    }
    let info: UserInfo = res.json().map_err(|e| e.to_string())?;
    Ok(info.email)
}

fn find_folder(client: &Client, tokens: &TokenData) -> Result<Option<String>, String> {
    let q = format!(
        "name = '{}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        FOLDER_NAME.replace('\'', "\\'")
    );
    let url = format!(
        "{DRIVE_API}/files?q={}&fields=files(id)&pageSize=1&spaces=drive",
        urlencoding::encode(&q)
    );
    let res = client
        .get(&url)
        .header(AUTHORIZATION, auth_header(tokens))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Drive search failed: {body}"));
    }
    let list: DriveFileList = res.json().map_err(|e| e.to_string())?;
    Ok(list.files.and_then(|f| f.into_iter().next()).map(|f| f.id))
}

fn create_folder(client: &Client, tokens: &TokenData) -> Result<String, String> {
    let res = client
        .post(format!("{DRIVE_API}/files"))
        .header(AUTHORIZATION, auth_header(tokens))
        .json(&serde_json::json!({
            "name": FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": ["root"]
        }))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Create folder failed: {body}"));
    }
    let file: DriveFile = res.json().map_err(|e| e.to_string())?;
    Ok(file.id)
}

fn ensure_folder(client: &Client, tokens: &TokenData) -> Result<String, String> {
    if let Some(id) = find_folder(client, tokens)? {
        return Ok(id);
    }
    create_folder(client, tokens)
}

fn find_sync_file(
    client: &Client,
    tokens: &TokenData,
    folder_id: &str,
) -> Result<Option<String>, String> {
    let q = format!(
        "'{folder_id}' in parents and name = '{SYNC_FILE}' and trashed = false"
    );
    let url = format!(
        "{DRIVE_API}/files?q={}&fields=files(id)&pageSize=1&spaces=drive",
        urlencoding::encode(&q)
    );
    let res = client
        .get(&url)
        .header(AUTHORIZATION, auth_header(tokens))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Drive file search failed: {body}"));
    }
    let list: DriveFileList = res.json().map_err(|e| e.to_string())?;
    Ok(list.files.and_then(|f| f.into_iter().next()).map(|f| f.id))
}

fn download_file(client: &Client, tokens: &TokenData, file_id: &str) -> Result<String, String> {
    let url = format!("{DRIVE_API}/files/{file_id}?alt=media");
    let res = client
        .get(&url)
        .header(AUTHORIZATION, auth_header(tokens))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Download failed: {body}"));
    }
    res.text().map_err(|e| e.to_string())
}

fn upload_content(
    client: &Client,
    tokens: &TokenData,
    file_id: &str,
    content: &str,
) -> Result<(), String> {
    let url = format!("{UPLOAD_API}/{file_id}?uploadType=media");
    let res = client
        .patch(&url)
        .header(AUTHORIZATION, auth_header(tokens))
        .header("Content-Type", "application/json")
        .body(content.to_string())
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Upload failed: {body}"));
    }
    Ok(())
}

fn create_sync_file(
    client: &Client,
    tokens: &TokenData,
    folder_id: &str,
    content: &str,
) -> Result<String, String> {
    let res = client
        .post(format!("{DRIVE_API}/files"))
        .header(AUTHORIZATION, auth_header(tokens))
        .json(&serde_json::json!({
            "name": SYNC_FILE,
            "mimeType": "application/json",
            "parents": [folder_id]
        }))
        .send()
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Create sync file failed: {body}"));
    }
    let file: DriveFile = res.json().map_err(|e| e.to_string())?;
    upload_content(client, tokens, &file.id, content)?;
    Ok(file.id)
}

fn upload_file(
    client: &Client,
    tokens: &TokenData,
    folder_id: &str,
    file_id: Option<&str>,
    content: &str,
) -> Result<String, String> {
    if let Some(id) = file_id {
        if upload_content(client, tokens, id, content).is_ok() {
            return Ok(id.to_string());
        }
    }
    create_sync_file(client, tokens, folder_id, content)
}

pub fn drive_status(app: &AppHandle) -> Result<GoogleDriveStatus, String> {
    let tokens = load_tokens(app)?;
    Ok(GoogleDriveStatus {
        connected: tokens.is_some(),
        email: tokens.and_then(|t| t.email),
    })
}

pub fn drive_connect(app: &AppHandle) -> Result<String, String> {
    let creds = load_credentials(app)?;
    let client = http_client()?;

    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("OAuth server: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    drop(listener);

    let redirect_uri = format!("http://127.0.0.1:{port}");
    let auth_url = format!(
        "{AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        urlencoding::encode(&creds.client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(SCOPE),
    );

    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Could not open browser: {e}"))?;

    let code = wait_for_auth_code(port)?;
    let res = client
        .post(TOKEN_URL)
        .form(&[
            ("client_id", creds.client_id.as_str()),
            ("client_secret", creds.client_secret.as_str()),
            ("code", code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .map_err(|e| format!("Token exchange failed: {e}"))?;

    if !res.status().is_success() {
        let body = res.text().unwrap_or_default();
        return Err(format!("Token exchange failed: {body}"));
    }

    let data: TokenResponse = res.json().map_err(|e| e.to_string())?;
    let email = fetch_user_email(&client, &data.access_token)?;
    let tokens = TokenData {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_in.map(|e| unix_now() + e),
        email: email.clone(),
    };
    save_tokens(app, &tokens)?;

    // Create the Drive folder immediately so it appears in the user's My Drive.
    let _ = ensure_folder(&client, &tokens);

    Ok(email.unwrap_or_else(|| "Google Account".to_string()))
}

pub fn drive_disconnect(app: &AppHandle) -> Result<(), String> {
    delete_tokens(app)
}

pub fn drive_pull(
    app: &AppHandle,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePullResult, String> {
    let creds = load_credentials(app)?;
    let client = http_client()?;
    let mut tokens = load_tokens(app)?.ok_or("Not connected to Google Drive.")?;
    ensure_access_token(app, &client, &creds, &mut tokens)?;

    let folder_id = match folder_id {
        Some(id) if !id.is_empty() => id,
        _ => ensure_folder(&client, &tokens)?,
    };

    let (file_id, content) = match file_id {
        Some(id) if !id.is_empty() => match download_file(&client, &tokens, &id) {
            Ok(content) => (id, content),
            Err(_) => {
                let found = find_sync_file(&client, &tokens, &folder_id)?
                    .ok_or("No sync file on Drive yet.")?;
                let content = download_file(&client, &tokens, &found)?;
                (found, content)
            }
        },
        _ => {
            let found = find_sync_file(&client, &tokens, &folder_id)?
                .ok_or("No sync file on Drive yet.")?;
            let content = download_file(&client, &tokens, &found)?;
            (found, content)
        }
    };
    Ok(GoogleDrivePullResult {
        content,
        folder_id,
        file_id,
    })
}

pub fn drive_push(
    app: &AppHandle,
    content: String,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePushResult, String> {
    let creds = load_credentials(app)?;
    let client = http_client()?;
    let mut tokens = load_tokens(app)?.ok_or("Not connected to Google Drive.")?;
    ensure_access_token(app, &client, &creds, &mut tokens)?;

    let folder_id = match folder_id {
        Some(id) if !id.is_empty() => id,
        _ => ensure_folder(&client, &tokens)?,
    };

    let existing = if file_id.as_ref().is_some_and(|id| !id.is_empty()) {
        file_id.clone()
    } else {
        find_sync_file(&client, &tokens, &folder_id)?
    };

    let new_file_id = upload_file(
        &client,
        &tokens,
        &folder_id,
        existing.as_deref(),
        &content,
    )?;

    Ok(GoogleDrivePushResult {
        folder_id,
        file_id: new_file_id,
    })
}
