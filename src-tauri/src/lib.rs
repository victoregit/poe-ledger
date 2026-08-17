use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use urlencoding::encode;

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

    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(
            "A GGG limitou temporariamente as consultas. Aguarde um minuto antes de tentar conectar novamente."
                .to_string(),
        );
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
async fn fetch_stash_tabs(
    account_name: String,
    league: String,
    _poesessid: Option<String>,
    realm: Option<String>,
) -> Result<String, String> {
    let client = get_client()?;
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
            "Acesso privado ao stash exige autenticação oficial da GGG via fluxo automatizado e autorizado. Não usamos extração manual de cookie."
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
    _poesessid: Option<String>,
    realm: Option<String>,
) -> Result<String, String> {
    let client = get_client()?;
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
        return Err(
            "Acesso privado ao stash exige autenticação oficial da GGG via fluxo automatizado e autorizado. Não usamos extração manual de cookie."
                .to_string(),
        );
    }

    if !status.is_success() {
        return Err(format!("Erro ao buscar itens da aba {} (Status: {}).", tab_index, status));
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
async fn fetch_poe_ninja_economy(league: String, dataset: String) -> Result<String, String> {
    let endpoint = match dataset.as_str() {
        "currency" => "stash/current/currency/overview?league={league}&type=Currency",
        "fragment" => "exchange/current/overview?league={league}&type=Fragment",
        "allflame_ember" => "exchange/current/overview?league={league}&type=AllflameEmber",
        "omen" => "exchange/current/overview?league={league}&type=Omen",
        "tattoo" => "exchange/current/overview?league={league}&type=Tattoo",
        "runegraft" => "exchange/current/overview?league={league}&type=Runegraft",
        "scarab" => "exchange/current/overview?league={league}&type=Scarab",
        "delirium_orb" => "exchange/current/overview?league={league}&type=DeliriumOrb",
        "fossil" => "exchange/current/overview?league={league}&type=Fossil",
        "resonator" => "exchange/current/overview?league={league}&type=Resonator",
        "essence" => "exchange/current/overview?league={league}&type=Essence",
        "divination_card" => "exchange/current/overview?league={league}&type=DivinationCard",
        "artifact" => "exchange/current/overview?league={league}&type=Artifact",
        "unique_armour" => "stash/current/item/overview?type=UniqueArmour",
        "unique_weapon" => "stash/current/item/overview?type=UniqueWeapon",
        "unique_accessory" => "stash/current/item/overview?type=UniqueAccessory",
        "unique_flask" => "stash/current/item/overview?type=UniqueFlask",
        "unique_jewel" => "stash/current/item/overview?type=UniqueJewel",
        _ => return Err("Tipo de economia não suportado.".to_string()),
    };

    let client = get_client()?;
    let encoded_league = encode(league.trim());
    let url = if endpoint.contains("{league}") {
        format!(
            "https://poe.ninja/poe1/api/economy/{}",
            endpoint.replace("{league}", encoded_league.as_ref())
        )
    } else {
        format!(
            "https://poe.ninja/poe1/api/economy/{}&league={}",
            endpoint, encoded_league
        )
    };
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = res.status();

    if !status.is_success() {
        return Err(format!("poe.ninja retornou o status {}.", status));
    }

    res.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_poe_ninja_economy_leagues() -> Result<String, String> {
    let client = get_client()?;
    let res = client
        .get("https://poe.ninja/poe1/api/economy/leagues")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    if !status.is_success() {
        return Err(format!("poe.ninja retornou o status {} ao buscar ligas.", status));
    }
    res.text().await.map_err(|e| e.to_string())
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
fn open_in_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
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
            fetch_poe_ninja_economy,
            fetch_poe_ninja_economy_leagues,
            detect_poe_client_log,
            get_last_game_zone,
            open_in_browser
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
