import { useState, useEffect } from "react";
import { Settings as SettingsType, getSettings, updateSettings } from "../lib/tauri";

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
    } catch (err) {
      setError("Failed to load settings");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    try {
      await updateSettings(settings);
      onClose();
    } catch (err) {
      setError("Failed to save settings");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-modal">
        <div className="settings-content">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-modal">
        <div className="settings-content">
          <p>Failed to load settings</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-modal">
      <div className="settings-content">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            x
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="settings-form">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                id="reminder-enabled"
                type="checkbox"
                checked={settings.reminder_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, reminder_enabled: e.target.checked })
                }
              />
              Enable daily reminder
            </label>
          </div>

          <div className="form-group">
            <label>Reminder time</label>
            <div className="time-picker">
              <select
                id="reminder-time-hour"
                value={settings.reminder_time.split(":")[0]}
                onChange={(e) => {
                  const minutes = settings.reminder_time.split(":")[1] || "00";
                  setSettings({ ...settings, reminder_time: `${e.target.value}:${minutes}` });
                }}
                disabled={!settings.reminder_enabled}
                aria-label="Hour"
              >
                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="time-separator">:</span>
              <select
                id="reminder-time-minute"
                value={settings.reminder_time.split(":")[1] || "00"}
                onChange={(e) => {
                  const hours = settings.reminder_time.split(":")[0] || "09";
                  setSettings({ ...settings, reminder_time: `${hours}:${e.target.value}` });
                }}
                disabled={!settings.reminder_enabled}
                aria-label="Minute"
              >
                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="standup-format">Standup format</label>
            <select
              id="standup-format"
              value={settings.standup_format}
              onChange={(e) =>
                setSettings({ ...settings, standup_format: e.target.value })
              }
            >
              <option value="markdown">Markdown</option>
              <option value="plain">Plain text</option>
              <option value="slack">Slack-friendly</option>
            </select>
          </div>
        </div>

        <div className="settings-actions">
          <button className="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
