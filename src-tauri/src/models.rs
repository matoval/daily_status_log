use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub text: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub date: NaiveDate,
    pub content: String,
    pub tasks: Vec<Task>,
    pub blockers: Option<String>,
    pub synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Standup {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub date: NaiveDate,
    pub content: String,
    pub entries_included: Vec<String>,
    pub shared: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub reminder_enabled: bool,
    pub reminder_time: String, // HH:MM format
    pub standup_format: String,
    pub ai_enabled: bool,
    pub ollama_model: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            reminder_enabled: true,
            reminder_time: "09:00".to_string(),
            standup_format: "markdown".to_string(),
            ai_enabled: false,
            ollama_model: "qwen2.5:1.5b".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandupReport {
    pub id: String,
    pub date: NaiveDate,
    pub content: String,
    pub entries: Vec<Entry>,
}
