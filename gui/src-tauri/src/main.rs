// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
extern crate dotenv;

use std::io::BufRead;
use std::sync::Mutex;
use dotenv::dotenv;
use tauri::State;

#[tauri::command]
fn get_origin_languages(state: State<AppState>) -> Result<Vec<String>, String> {
    // Read locales/*.json files and return the list of languages
    let dir_path = state.user_locale_dir.lock().unwrap().clone();
    let dir = std::fs::read_dir(dir_path.clone());
    if dir.is_err() {
        return Err(format!("Failed to read locales directory {}", dir_path));
    }
    let dir = dir.unwrap();
    let mut languages: Vec<String> = Vec::new();
    for entry in dir {
        let entry = entry.unwrap();
        let path = entry.path();
        let file_name = path.file_name().unwrap().to_str().unwrap();
        if !file_name.ends_with(".json") {
            continue;
        }
        languages.push(file_name.to_string());
    }
    // Order languages alphabetically
    languages.sort();
    Ok(languages)
}

fn get_locales_dir() -> String {
    std::env::var("LOCALES_DIR").unwrap_or("locales".to_string())
}

#[tauri::command]
fn get_locale_dir(state: State<AppState>) -> Result<String, String> {
    let dir_path = state.user_locale_dir.lock();
    if dir_path.is_err() {
        return Err(format!("Failed to get locale dir: {}", dir_path.err().unwrap()));
    }
    let dir_path = dir_path.unwrap().clone();
    Ok(dir_path)
}

#[tauri::command]
async fn translate(origin_language: String, target_languages: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let dir_path = state.user_locale_dir.lock().unwrap().clone();
    let origin_language = origin_language.to_string();
    let origin_file = format!("{}/{}", dir_path, origin_language);
    println!("Origin file: {}", origin_file);
    println!("Target languages: {:?}", target_languages);
    // Run the shopify-locale-translator-cli npx for each target language
    for target_language in target_languages {
        let target_file = format!("{}/{}", dir_path, target_language);
        let command = format!("shopify-locale-translator-cli translate -i {} -o {}", origin_file, target_file);
        println!("Running command: {}", command);
        #[cfg(target_os = "windows")]
        let output = std::process::Command::new("cmd")
            .args(&["/C", &command])
            .output()
            .expect("failed to execute process");
        #[cfg(not(target_os = "windows"))]
        let output = std::process::Command::new("sh")
            .args(&["-c", &command])
            .output()
            .expect("failed to execute process");
        // Check for any errors
        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stdout);
            let message = format!("Failed to run command: {}\n\n{}", command, error);
            println!("{}", message);
            return Err(message);
        }
        println!("Output: {:?}", output);
    }
    Ok(())
}

#[tauri::command]
fn infer_target_language(file_name: &str, state: State<AppState>) -> Result<String, String> {
    let file_name = file_name.to_string();
    // Check if the file exists
    let dir_path = state.user_locale_dir.lock().unwrap().clone();
    let file_path = format!("{}/{}", dir_path, file_name);
    let file_path = std::path::Path::new(&file_path);
    if !file_path.exists() {
        return Err(format!("File {} does not exist", file_path.display()));
    }
    let file_name = file_name.replace(".json", "");
    let file_name = file_name.replace(".default", "");
    let file_name = file_name.replace(".schema", "");
    let file_name = file_name.to_lowercase();
    // We should have the language code now
    Ok(file_name)
}

#[tauri::command]
fn set_locale_dir(state: State<AppState>, file_path: &str) -> Result<String, String> {
    // Check if the file exists
    let file_path = std::path::Path::new(file_path);
    if !file_path.exists() {
        return Err(format!("File {} does not exist", file_path.display()));
    }
    // If the file is a directory, use it as the locale dir
    let parent_dir = if file_path.is_dir() {
        Some(file_path)
    } else {
        file_path.parent()
    };
    if parent_dir.is_none() {
        return Err(format!("Failed to get parent directory of {}", file_path.display()));
    }
    let parent_dir = parent_dir.unwrap();
    let parent_dir_str = parent_dir.to_str().unwrap();
    println!("Set locale dir to {}", parent_dir_str);
    // Set the locale dir
    let mut state = state.user_locale_dir.lock().unwrap();
    *state = parent_dir_str.to_string();
    Ok(parent_dir_str.to_string())
}

#[tauri::command]
fn get_per_language_time_estimate(state: State<AppState>, file_name: String) -> i32 {
    let file_name = file_name.to_string();
    // Check if the file exists
    let dir_path = state.user_locale_dir.lock().unwrap().clone();
    let file_path = format!("{}/{}", dir_path, file_name);
    let file_path = std::path::Path::new(&file_path);
    if !file_path.exists() {
        return 0;
    }
    // Get the number of lines in the origin file
    // 500 lines ~= 2 minutes
    let file = std::fs::File::open(file_path);
    if file.is_err() {
        return 0;
    }
    let file = file.unwrap();
    let reader = std::io::BufReader::new(file);
    let mut line_count = 0;
    for _line in reader.lines() {
        line_count += 1;
    }
    let seconds = line_count as f32 / 500.0 * 120.0;
    seconds.ceil() as i32
}

#[derive(Default)]
struct AppState {
    user_locale_dir: Mutex<String>,
}

fn main() {
    dotenv().ok();

    let locales_dir = get_locales_dir();
    tauri::Builder::default()
        .manage(AppState {
            user_locale_dir: Mutex::new(locales_dir),
        })
        .invoke_handler(tauri::generate_handler![
            get_origin_languages,
            translate,
            infer_target_language,
            set_locale_dir,
            get_locale_dir,
            get_per_language_time_estimate
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
