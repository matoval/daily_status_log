use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

use crate::models::Entry;

// Use a dedicated port to avoid conflicts with other Ollama instances
const OLLAMA_HOST: &str = "127.0.0.1:11435";
const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11435";
const DEFAULT_MODEL: &str = "qwen2.5:1.5b";

static OLLAMA_STARTED: AtomicBool = AtomicBool::new(false);
static OLLAMA_PROCESS: Mutex<Option<CommandChild>> = Mutex::new(None);

/// Starts the bundled Ollama server on a dedicated port for this app.
/// Also ensures the default model is pulled in the background.
pub fn start_ollama_server(app: &AppHandle) {
    // Only try to start once per app session
    if OLLAMA_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    log::info!("Starting Ollama server on {}...", OLLAMA_HOST);

    let result = app
        .shell()
        .sidecar("ollama")
        .expect("Failed to create sidecar command")
        .args(["serve"])
        .env("OLLAMA_HOST", OLLAMA_HOST)
        .spawn();

    match result {
        Ok((_rx, child)) => {
            log::info!("Ollama server started successfully on {}", OLLAMA_HOST);
            if let Ok(mut guard) = OLLAMA_PROCESS.lock() {
                *guard = Some(child);
            }

            // Ensure the default model is pulled in the background
            let app_handle = app.clone();
            std::thread::spawn(move || {
                ensure_model_available(&app_handle, DEFAULT_MODEL);
            });
        }
        Err(e) => {
            log::warn!("Failed to start Ollama: {}", e);
            OLLAMA_STARTED.store(false, Ordering::SeqCst);
        }
    }
}

/// Waits for Ollama to be ready and ensures the specified model is pulled.
fn ensure_model_available(app: &AppHandle, model: &str) {
    let client = reqwest::blocking::Client::new();

    // Wait for Ollama to be ready (up to 30 seconds)
    let mut ready = false;
    for _ in 0..30 {
        std::thread::sleep(std::time::Duration::from_secs(1));
        if let Ok(response) = client
            .get(format!("{}/api/tags", OLLAMA_BASE_URL))
            .timeout(std::time::Duration::from_secs(2))
            .send()
        {
            if response.status().is_success() {
                ready = true;
                break;
            }
        }
    }

    if !ready {
        log::warn!("Ollama server did not become ready in time");
        return;
    }

    log::info!("Ollama server is ready, checking for model: {}", model);

    // Check if model is already available
    if let Ok(response) = client
        .get(format!("{}/api/tags", OLLAMA_BASE_URL))
        .timeout(std::time::Duration::from_secs(5))
        .send()
    {
        if let Ok(tags) = response.json::<TagsResponse>() {
            let model_exists = tags.models.iter().any(|m| m.name.starts_with(model));
            if model_exists {
                log::info!("Model {} is already available", model);
                return;
            }
        }
    }

    // Pull the model
    log::info!("Pulling model: {}", model);
    let result = app
        .shell()
        .sidecar("ollama")
        .expect("Failed to create sidecar command")
        .args(["pull", model])
        .env("OLLAMA_HOST", OLLAMA_HOST)
        .spawn();

    match result {
        Ok((mut rx, _child)) => {
            // Wait for the pull to complete by consuming events
            while let Some(event) = rx.blocking_recv() {
                if let tauri_plugin_shell::process::CommandEvent::Terminated(_) = event {
                    break;
                }
            }
            log::info!("Model {} pulled successfully", model);
        }
        Err(e) => {
            log::warn!("Failed to pull model {}: {}", model, e);
        }
    }
}

/// Stops the Ollama server if we started it.
pub fn stop_ollama_server() {
    if let Ok(mut guard) = OLLAMA_PROCESS.lock() {
        if let Some(child) = guard.take() {
            log::info!("Stopping Ollama server...");
            if let Err(e) = child.kill() {
                log::warn!("Failed to stop Ollama: {}", e);
            } else {
                log::info!("Ollama server stopped");
            }
        }
    }
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    models: Vec<ModelInfo>,
}

#[derive(Debug, Deserialize)]
struct ModelInfo {
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub available: bool,
    pub models: Vec<String>,
}

pub async fn check_status() -> OllamaStatus {
    let client = Client::new();

    match client
        .get(format!("{}/api/tags", OLLAMA_BASE_URL))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<TagsResponse>().await {
                    Ok(tags) => OllamaStatus {
                        available: true,
                        models: tags.models.into_iter().map(|m| m.name).collect(),
                    },
                    Err(_) => OllamaStatus {
                        available: true,
                        models: vec![],
                    },
                }
            } else {
                OllamaStatus {
                    available: false,
                    models: vec![],
                }
            }
        }
        Err(_) => OllamaStatus {
            available: false,
            models: vec![],
        },
    }
}

fn format_entries_context(entries: &[Entry]) -> String {
    if entries.is_empty() {
        return "No entries available.".to_string();
    }

    let mut context = String::new();
    for entry in entries {
        context.push_str(&format!("\n--- Entry from {} ---\n", entry.date));
        if !entry.content.is_empty() {
            context.push_str(&format!("Content: {}\n", entry.content));
        }
        if !entry.tasks.is_empty() {
            context.push_str("Tasks:\n");
            for task in &entry.tasks {
                let status = if task.completed { "DONE" } else { "IN PROGRESS" };
                context.push_str(&format!("  - [{}] {}\n", status, task.text));
            }
        }
        if let Some(ref blockers) = entry.blockers {
            if !blockers.trim().is_empty() {
                context.push_str(&format!("Blockers: {}\n", blockers));
            }
        }
    }
    context
}

pub async fn chat_with_entries(
    user_message: &str,
    entries: &[Entry],
    model: &str,
) -> Result<String, String> {
    let client = Client::new();

    let entries_context = format_entries_context(entries);

    let system_prompt = format!(
        r#"You are a helpful assistant for a work log app. The user tracks their daily work entries.

Here are the user's work entries:
{entries_context}

Instructions:
- When asked for a standup report, summarize completed and in-progress tasks in a clear format
- When asked about specific tasks, include the date they were worked on
- Be concise and direct
- Only use information from the entries above"#,
        entries_context = entries_context
    );

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: system_prompt,
        },
        ChatMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        },
    ];

    let request = ChatRequest {
        model: model.to_string(),
        messages,
        stream: false,
    };

    let response = client
        .post(format!("{}/api/chat", OLLAMA_BASE_URL))
        .json(&request)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned error: {}", response.status()));
    }

    let result: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(result.message.content.trim().to_string())
}
