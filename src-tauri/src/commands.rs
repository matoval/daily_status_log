use chrono::{NaiveDate, Utc};
use tauri::State;
use uuid::Uuid;

use crate::export::{export_to_csv, export_to_json, export_to_markdown};
use crate::models::{Entry, Settings, StandupReport, Task};
use crate::ollama::{self, OllamaStatus};
use crate::storage::Database;

#[tauri::command]
pub fn create_entry(
    db: State<Database>,
    content: String,
    tasks: Vec<Task>,
    blockers: Option<String>,
) -> Result<Entry, String> {
    let entry = Entry {
        id: Uuid::new_v4().to_string(),
        created_at: Utc::now(),
        date: Utc::now().date_naive(),
        content,
        tasks,
        blockers,
        synced_at: None,
    };

    db.create_entry(&entry).map_err(|e| e.to_string())?;
    Ok(entry)
}

#[tauri::command]
pub fn get_entries(
    db: State<Database>,
    from_date: Option<String>,
    to_date: Option<String>,
) -> Result<Vec<Entry>, String> {
    let from = from_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    let to = to_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    db.get_entries(from, to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_entry(db: State<Database>, id: String) -> Result<Option<Entry>, String> {
    db.get_entry(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_entry(db: State<Database>, id: String) -> Result<bool, String> {
    db.delete_entry(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn generate_standup(db: State<Database>, format: Option<String>) -> Result<StandupReport, String> {
    // Find last shared standup
    let last_standup = db.get_last_shared_standup().map_err(|e| e.to_string())?;

    // Get entries since last standup (or all if none)
    let from_date = last_standup.as_ref().map(|s| s.date);
    let entries = db.get_entries(from_date, None).map_err(|e| e.to_string())?;

    // Filter out entries that were included in the last standup
    let entries: Vec<Entry> = if let Some(ref standup) = last_standup {
        entries
            .into_iter()
            .filter(|e| !standup.entries_included.contains(&e.id))
            .collect()
    } else {
        entries
    };

    // Generate content based on format
    let format_str = format.as_deref().unwrap_or("markdown");
    let content = match format_str {
        "plain" => generate_plain_text_content(&entries),
        "slack" => generate_slack_content(&entries),
        _ => generate_standup_content(&entries), // markdown is default
    };

    let report = StandupReport {
        id: Uuid::new_v4().to_string(),
        date: Utc::now().date_naive(),
        content,
        entries,
    };

    Ok(report)
}

fn generate_standup_content(entries: &[Entry]) -> String {
    if entries.is_empty() {
        return "No updates to report.".to_string();
    }

    let mut content = String::new();
    content.push_str("## What I've been working on\n\n");

    let mut completed_tasks = Vec::new();
    let mut in_progress_tasks = Vec::new();
    let mut blockers = Vec::new();

    for entry in entries {
        for task in &entry.tasks {
            if task.completed {
                completed_tasks.push(task.text.clone());
            } else {
                in_progress_tasks.push(task.text.clone());
            }
        }
        if let Some(ref blocker) = entry.blockers {
            if !blocker.trim().is_empty() {
                blockers.push(blocker.clone());
            }
        }
    }

    if !completed_tasks.is_empty() {
        content.push_str("### Completed\n");
        for task in &completed_tasks {
            content.push_str(&format!("- {}\n", task));
        }
        content.push('\n');
    }

    if !in_progress_tasks.is_empty() {
        content.push_str("### In Progress\n");
        for task in &in_progress_tasks {
            content.push_str(&format!("- {}\n", task));
        }
        content.push('\n');
    }

    if !blockers.is_empty() {
        content.push_str("### Blockers\n");
        for blocker in &blockers {
            content.push_str(&format!("- {}\n", blocker));
        }
    }

    content
}

fn generate_plain_text_content(entries: &[Entry]) -> String {
    if entries.is_empty() {
        return "No updates to report.".to_string();
    }

    let mut content = String::new();
    content.push_str("WHAT I'VE BEEN WORKING ON\n\n");

    let mut completed_tasks = Vec::new();
    let mut in_progress_tasks = Vec::new();
    let mut blockers = Vec::new();

    for entry in entries {
        for task in &entry.tasks {
            if task.completed {
                completed_tasks.push(task.text.clone());
            } else {
                in_progress_tasks.push(task.text.clone());
            }
        }
        if let Some(ref blocker) = entry.blockers {
            if !blocker.trim().is_empty() {
                blockers.push(blocker.clone());
            }
        }
    }

    if !completed_tasks.is_empty() {
        content.push_str("COMPLETED:\n");
        for task in &completed_tasks {
            content.push_str(&format!("  * {}\n", task));
        }
        content.push('\n');
    }

    if !in_progress_tasks.is_empty() {
        content.push_str("IN PROGRESS:\n");
        for task in &in_progress_tasks {
            content.push_str(&format!("  * {}\n", task));
        }
        content.push('\n');
    }

    if !blockers.is_empty() {
        content.push_str("BLOCKERS:\n");
        for blocker in &blockers {
            content.push_str(&format!("  * {}\n", blocker));
        }
    }

    content
}

fn generate_slack_content(entries: &[Entry]) -> String {
    if entries.is_empty() {
        return "No updates to report.".to_string();
    }

    let mut content = String::new();
    content.push_str("*What I've been working on*\n\n");

    let mut completed_tasks = Vec::new();
    let mut in_progress_tasks = Vec::new();
    let mut blockers = Vec::new();

    for entry in entries {
        for task in &entry.tasks {
            if task.completed {
                completed_tasks.push(task.text.clone());
            } else {
                in_progress_tasks.push(task.text.clone());
            }
        }
        if let Some(ref blocker) = entry.blockers {
            if !blocker.trim().is_empty() {
                blockers.push(blocker.clone());
            }
        }
    }

    if !completed_tasks.is_empty() {
        content.push_str(":white_check_mark: *Completed*\n");
        for task in &completed_tasks {
            content.push_str(&format!("• {}\n", task));
        }
        content.push('\n');
    }

    if !in_progress_tasks.is_empty() {
        content.push_str(":construction: *In Progress*\n");
        for task in &in_progress_tasks {
            content.push_str(&format!("• {}\n", task));
        }
        content.push('\n');
    }

    if !blockers.is_empty() {
        content.push_str(":no_entry: *Blockers*\n");
        for blocker in &blockers {
            content.push_str(&format!("• {}\n", blocker));
        }
    }

    content
}

#[tauri::command]
pub fn save_standup(
    db: State<Database>,
    id: String,
    content: String,
    entry_ids: Vec<String>,
) -> Result<(), String> {
    use crate::models::Standup;

    let standup = Standup {
        id,
        created_at: Utc::now(),
        date: Utc::now().date_naive(),
        content,
        entries_included: entry_ids,
        shared: true,
    };

    db.create_standup(&standup).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_standup_shared(db: State<Database>, id: String) -> Result<bool, String> {
    db.mark_standup_shared(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(db: State<Database>) -> Result<Settings, String> {
    db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(db: State<Database>, settings: Settings) -> Result<(), String> {
    db.update_settings(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_entries(
    db: State<Database>,
    from_date: Option<String>,
    to_date: Option<String>,
    format: String,
) -> Result<String, String> {
    let from = from_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    let to = to_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    let entries = db.get_entries(from, to).map_err(|e| e.to_string())?;

    let content = match format.as_str() {
        "csv" => export_to_csv(&entries),
        "markdown" => export_to_markdown(&entries),
        _ => export_to_json(&entries), // json is default
    };

    Ok(content)
}

#[derive(serde::Deserialize)]
pub struct SearchFilters {
    pub completed_only: Option<bool>,
    pub in_progress_only: Option<bool>,
    pub has_blockers: Option<bool>,
}

#[tauri::command]
pub fn search_entries(
    db: State<Database>,
    from_date: Option<String>,
    to_date: Option<String>,
    query: Option<String>,
    filters: Option<SearchFilters>,
) -> Result<Vec<Entry>, String> {
    let from = from_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    let to = to_date.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    let filters = filters.unwrap_or(SearchFilters {
        completed_only: None,
        in_progress_only: None,
        has_blockers: None,
    });

    db.search_entries(
        from,
        to,
        query.as_deref(),
        filters.completed_only.unwrap_or(false),
        filters.in_progress_only.unwrap_or(false),
        filters.has_blockers.unwrap_or(false),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_ollama_status() -> OllamaStatus {
    ollama::check_status().await
}

#[tauri::command]
pub async fn chat_with_ai(
    db: State<'_, Database>,
    message: String,
    model: String,
) -> Result<String, String> {
    // Get all entries to provide context to the AI
    let entries = db.get_entries(None, None).map_err(|e| e.to_string())?;

    ollama::chat_with_entries(&message, &entries, &model).await
}

#[tauri::command]
pub async fn sync_entries(db: State<'_, Database>) -> Result<crate::sync::SyncResult, String> {
    let settings = db.get_settings().map_err(|e| e.to_string())?;
    crate::sync::sync_entries(&db, &settings).await
}

#[tauri::command]
pub async fn test_sync_connection(url: String, api_key: String) -> Result<bool, String> {
    crate::sync::test_connection(&url, &api_key).await
}
