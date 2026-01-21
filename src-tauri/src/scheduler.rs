use chrono::{Datelike, Local, NaiveTime, Timelike};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::storage::Database;

pub struct Scheduler {
    running: Arc<AtomicBool>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self, app_handle: AppHandle) {
        if self.running.swap(true, Ordering::SeqCst) {
            return; // Already running
        }

        let running = self.running.clone();

        thread::spawn(move || {
            let mut last_notified_minute: Option<(u32, u32)> = None;

            while running.load(Ordering::SeqCst) {
                // Check every 30 seconds
                thread::sleep(Duration::from_secs(30));

                // Get current settings
                let settings = match app_handle.try_state::<Database>() {
                    Some(db) => match db.get_settings() {
                        Ok(s) => s,
                        Err(_) => continue,
                    },
                    None => continue,
                };

                if !settings.reminder_enabled {
                    continue;
                }

                // Parse reminder time
                let reminder_time = match parse_time(&settings.reminder_time) {
                    Some(t) => t,
                    None => continue,
                };

                let now = Local::now();
                let current_hour = now.hour();
                let current_minute = now.minute();

                // Check if it's the right time (within the same minute)
                if current_hour == reminder_time.hour()
                    && current_minute == reminder_time.minute()
                {
                    // Don't notify twice in the same minute
                    let current_time_tuple = (current_hour, current_minute);
                    if last_notified_minute == Some(current_time_tuple) {
                        continue;
                    }

                    // Check if it's a weekday (Mon-Fri)
                    let weekday = now.weekday();
                    if weekday == chrono::Weekday::Sat || weekday == chrono::Weekday::Sun {
                        continue;
                    }

                    // Send notification
                    if let Err(e) = send_reminder_notification(&app_handle) {
                        eprintln!("Failed to send notification: {}", e);
                    }

                    // Show and focus the window
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.show().ok();
                        window.set_focus().ok();
                    }

                    last_notified_minute = Some(current_time_tuple);
                }
            }
        });
    }

    #[allow(dead_code)]
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

fn parse_time(time_str: &str) -> Option<NaiveTime> {
    // Parse HH:MM format
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return None;
    }

    let hour: u32 = parts[0].parse().ok()?;
    let minute: u32 = parts[1].parse().ok()?;

    NaiveTime::from_hms_opt(hour, minute, 0)
}

fn send_reminder_notification(app_handle: &AppHandle) -> Result<(), String> {
    app_handle
        .notification()
        .builder()
        .title("Daily Status Log")
        .body("Time to log your daily status! What did you work on today?")
        .show()
        .map_err(|e| e.to_string())
}
