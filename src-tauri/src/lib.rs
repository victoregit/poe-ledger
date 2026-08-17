use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use urlencoding::encode;

const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

fn get_client() -> Result<reqwest::Client, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(BROWSER_UA));

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

#[tauri::command]
async fn fetch_characters(account_name: String, realm: Option<String>) -> Result<String, String> {
    let client = get_client()?;
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
    let client = get_client()?;
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
async fn fetch_poe_ninja_overview(league: String, overview_type: String) -> Result<String, String> {
    let client = get_client()?;
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
            fetch_poe_ninja_overview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
