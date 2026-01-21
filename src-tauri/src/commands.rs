use chrono::{NaiveDate, Utc};
use tauri::State;
use uuid::Uuid;

use crate::models::{Entry, Settings, StandupReport, Task};
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
pub fn generate_standup(db: State<Database>) -> Result<StandupReport, String> {
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

    // Generate markdown content
    let content = generate_standup_content(&entries);

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
