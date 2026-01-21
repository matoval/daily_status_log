import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export interface Task {
  text: string;
  completed: boolean;
}

export interface Entry {
  id: string;
  created_at: string;
  date: string;
  content: string;
  tasks: Task[];
  blockers: string | null;
  synced_at: string | null;
}

export interface Settings {
  reminder_enabled: boolean;
  reminder_time: string;
  standup_format: string;
  ai_enabled: boolean;
  ollama_model: string;
  sync_enabled: boolean;
  sync_url: string;
  sync_api_key: string;
}

export interface StandupReport {
  id: string;
  date: string;
  content: string;
  entries: Entry[];
}

export async function createEntry(
  content: string,
  tasks: Task[],
  blockers: string | null
): Promise<Entry> {
  return invoke("create_entry", { content, tasks, blockers });
}

export async function getEntries(
  fromDate?: string,
  toDate?: string
): Promise<Entry[]> {
  return invoke("get_entries", { fromDate, toDate });
}

export async function getEntry(id: string): Promise<Entry | null> {
  return invoke("get_entry", { id });
}

export async function deleteEntry(id: string): Promise<boolean> {
  return invoke("delete_entry", { id });
}

export async function generateStandup(format?: string): Promise<StandupReport> {
  return invoke("generate_standup", { format });
}

export async function saveStandup(
  id: string,
  content: string,
  entryIds: string[]
): Promise<void> {
  return invoke("save_standup", { id, content, entryIds });
}

export async function markStandupShared(id: string): Promise<boolean> {
  return invoke("mark_standup_shared", { id });
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}

export async function copyToClipboard(text: string): Promise<void> {
  return writeText(text);
}

export interface SyncResult {
  uploaded: number;
  downloaded: number;
  errors: string[];
}

export async function syncEntries(): Promise<SyncResult> {
  return invoke("sync_entries");
}

export async function testSyncConnection(url: string, apiKey: string): Promise<boolean> {
  return invoke("test_sync_connection", { url, apiKey });
}
