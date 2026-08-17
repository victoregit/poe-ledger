use reqwest::header::{HeaderMap, HeaderValue, COOKIE, USER_AGENT};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use urlencoding::encode;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const KNOWN_LOG_PATHS: &[&str] = &[
    r"D:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt",
    r"C:\Program Files (x86)\Steam\steamapps\common\Path of Exile\logs\Client.txt",
    r"C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt",
    r"C:\Program Files\Grinding Gear Games\Path of Exile\logs\Client.txt",
    r"E:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt",
    r"F:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt",
    r"D:\Games\Path of Exile\logs\Client.txt",
    r"C:\Games\Path of Exile\logs\Client.txt",
    r"C:\Program Files (x86)\Steam\steamapps\common\Path of Exile 2\logs\Client.txt",
    r"C:\Program Files (x86)\Grinding Gear Games\Path of Exile 2\logs\Client.txt",
];

fn get_client_with_cookie(poesessid: Option<&str>) -> Result<reqwest::Client, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(BROWSER_UA));

    if let Some(sess) = poesessid {
        let clean_sess = sess.trim();
        if !clean_sess.is_empty() {
            let cookie_val = format!("POESESSID={}", clean_sess);
            if let Ok(val) = HeaderValue::from_str(&cookie_val) {
                headers.insert(COOKIE, val);
            }
        }
    }

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

#[tauri::command]
async fn fetch_characters(account_name: String, realm: Option<String>) -> Result<String, String> {
    let client = get_client_with_cookie(None)?;
    let r = realm.unwrap_or_else(|| "pc".to_string());
    let encoded_account = encode(account_name.trim());
    let url = format!(
        "https://www.pathofexile.com/character-window/get-characters?accountName={}&realm={}",
        encoded_account, r
    );

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = res.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(format!(
            "O perfil da conta \"{}\" está privado. Desmarque 'Hide Characters Tab' no site do PoE.",
            account_name
        ));
    }

    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(format!("Conta \"{}\" não encontrada no Path of Exile.", account_name));
    }

    if !status.is_success() {
        return Err(format!("Erro retornado pela GGG (Status: {}).", status));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
async fn fetch_character_items(
    account_name: String,
    character_name: String,
    realm: Option<String>,
) -> Result<String, String> {
    let client = get_client_with_cookie(None)?;
    let r = realm.unwrap_or_else(|| "pc".to_string());
    let encoded_account = encode(account_name.trim());
    let encoded_char = encode(character_name.trim());
    let url = format!(
        "https://www.pathofexile.com/character-window/get-items?accountName={}&character={}&realm={}",
        encoded_account, encoded_char, r
    );

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = res.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err("Aba de personagens privada no site da GGG.".to_string());
    }

    if !status.is_success() {
        return Err(format!("Erro ao buscar itens (Status: {}).", status));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
async fn fetch_stash_tabs(
    account_name: String,
    league: String,
    poesessid: Option<String>,
    realm: Option<String>,
) -> Result<String, String> {
    let client = get_client_with_cookie(poesessid.as_deref())?;
    let r = realm.unwrap_or_else(|| "pc".to_string());
    let encoded_account = encode(account_name.trim());
    let encoded_league = encode(league.trim());
    let url = format!(
        "https://www.pathofexile.com/character-window/get-stash-items?accountName={}&league={}&tabs=1&tabIndex=0&realm={}",
        encoded_account, encoded_league, r
    );

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = res.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(
            "Acesso negado às abas do Baú (Stash). Para ler suas abas privadas de baú, use o login automático da GGG ou insira seu POESESSID em Configurações (⚙️)."
                .to_string(),
        );
    }

    if !status.is_success() {
        return Err(format!("Erro ao buscar abas do baú (Status: {}).", status));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
async fn fetch_stash_items(
    account_name: String,
    league: String,
    tab_index: u32,
    poesessid: Option<String>,
    realm: Option<String>,
) -> Result<String, String> {
    let client = get_client_with_cookie(poesessid.as_deref())?;
    let r = realm.unwrap_or_else(|| "pc".to_string());
    let encoded_account = encode(account_name.trim());
    let encoded_league = encode(league.trim());
    let url = format!(
        "https://www.pathofexile.com/character-window/get-stash-items?accountName={}&league={}&tabIndex={}&tabs=0&realm={}",
        encoded_account, encoded_league, tab_index, r
    );

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = res.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err("Acesso negado à aba do baú. Verifique seu POESESSID.".to_string());
    }

    if !status.is_success() {
        return Err(format!("Erro ao buscar itens da aba {} (Status: {}).", tab_index, status));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
async fn fetch_poe_ninja_overview(league: String, overview_type: String) -> Result<String, String> {
    let client = get_client_with_cookie(None)?;
    let encoded_league = encode(&league);
    let url = format!(
        "https://poe.ninja/api/data/currencyoverview?league={}&type={}",
        encoded_league, overview_type
    );

    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
fn detect_poe_client_log() -> Option<String> {
    for path_str in KNOWN_LOG_PATHS {
        if Path::new(path_str).exists() {
            return Some(path_str.to_string());
        }
    }
    None
}

#[tauri::command]
fn get_last_game_zone(log_path: Option<String>) -> Option<String> {
    let target_path = log_path.or_else(detect_poe_client_log)?;
    let file = File::open(&target_path).ok()?;
    let reader = BufReader::new(file);

    let mut last_zone = None;
    for line_res in reader.lines() {
        if let Ok(line) = line_res {
            if let Some(pos) = line.find(" : You have entered ") {
                let zone = &line[pos + " : You have entered ".len()..];
                let clean_zone = zone.trim_end_matches('.');
                last_zone = Some(clean_zone.to_string());
            }
        }
    }

    last_zone
}

#[tauri::command]
fn open_ggg_login_window(app: AppHandle) -> Result<String, String> {
    if let Some(existing) = app.get_webview_window("ggg_login") {
        let _ = existing.set_focus();
        return Ok("Login window focused".to_string());
    }

    let login_url = "https://www.pathofexile.com/login"
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;

    let window = WebviewWindowBuilder::new(&app, "ggg_login", WebviewUrl::External(login_url))
        .title("Login Oficial Path of Exile")
        .inner_size(680.0, 740.0)
        .resizable(true)
        .always_on_top(true)
        .build()
        .map_err(|e| e.to_string())?;

    let _ = window.show();
    Ok("Login window opened".to_string())
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            fetch_characters,
            fetch_character_items,
            fetch_stash_tabs,
            fetch_stash_items,
            fetch_poe_ninja_overview,
            detect_poe_client_log,
            get_last_game_zone,
            open_ggg_login_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
