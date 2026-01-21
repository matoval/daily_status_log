use crate::models::Entry;

pub fn export_to_json(entries: &[Entry]) -> String {
    serde_json::to_string_pretty(entries).unwrap_or_else(|_| "[]".to_string())
}

pub fn export_to_csv(entries: &[Entry]) -> String {
    let mut csv = String::new();
    csv.push_str("id,date,created_at,content,tasks_completed,tasks_total,blockers\n");

    for entry in entries {
        let completed = entry.tasks.iter().filter(|t| t.completed).count();
        let total = entry.tasks.len();
        let content_escaped = escape_csv_field(&entry.content);
        let blockers_escaped = escape_csv_field(entry.blockers.as_deref().unwrap_or(""));

        csv.push_str(&format!(
            "{},{},{},{},{},{},{}\n",
            entry.id,
            entry.date,
            entry.created_at.to_rfc3339(),
            content_escaped,
            completed,
            total,
            blockers_escaped
        ));
    }

    csv
}

pub fn export_to_markdown(entries: &[Entry]) -> String {
    let mut md = String::new();
    md.push_str("# Daily Status Log Export\n\n");

    if entries.is_empty() {
        md.push_str("No entries to export.\n");
        return md;
    }

    // Group entries by date
    let mut entries_by_date: std::collections::BTreeMap<String, Vec<&Entry>> =
        std::collections::BTreeMap::new();

    for entry in entries {
        entries_by_date
            .entry(entry.date.to_string())
            .or_default()
            .push(entry);
    }

    // Output in reverse chronological order
    for (date, date_entries) in entries_by_date.into_iter().rev() {
        md.push_str(&format!("## {}\n\n", date));

        for entry in date_entries {
            let time = entry.created_at.format("%H:%M").to_string();
            md.push_str(&format!("### Entry at {}\n\n", time));

            if !entry.content.is_empty() {
                md.push_str(&format!("{}\n\n", entry.content));
            }

            if !entry.tasks.is_empty() {
                md.push_str("**Tasks:**\n");
                for task in &entry.tasks {
                    let checkbox = if task.completed { "[x]" } else { "[ ]" };
                    md.push_str(&format!("- {} {}\n", checkbox, task.text));
                }
                md.push('\n');
            }

            if let Some(ref blockers) = entry.blockers {
                if !blockers.trim().is_empty() {
                    md.push_str(&format!("**Blockers:** {}\n\n", blockers));
                }
            }

            md.push_str("---\n\n");
        }
    }

    md
}

fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace('"', "\"\""))
    } else {
        field.to_string()
    }
}
