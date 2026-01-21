import { mockInvoke, mockWriteText } from "./setup";
import type { Entry, Settings, StandupReport, Task } from "../lib/tauri";

export const mockTask: Task = {
  text: "Test task",
  completed: false,
};

export const mockCompletedTask: Task = {
  text: "Completed task",
  completed: true,
};

export const mockEntry: Entry = {
  id: "entry-1",
  created_at: "2024-01-20T10:30:00Z",
  date: "2024-01-20",
  content: "Test entry content",
  tasks: [mockTask, mockCompletedTask],
  blockers: "Test blocker",
  synced_at: null,
};

export const mockEntryToday: Entry = {
  id: "entry-today",
  created_at: new Date().toISOString(),
  date: new Date().toISOString().split("T")[0],
  content: "Today's entry",
  tasks: [{ text: "Today's task", completed: false }],
  blockers: null,
  synced_at: null,
};

export const mockSettings: Settings = {
  reminder_enabled: true,
  reminder_time: "09:00",
  standup_format: "markdown",
};

export const mockStandupReport: StandupReport = {
  id: "standup-1",
  date: "2024-01-20",
  content: "## What I've been working on\n\n### Completed\n- Completed task\n\n### In Progress\n- Test task\n",
  entries: [mockEntry],
};

export function setupTauriMocks() {
  mockInvoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case "get_entries":
        return Promise.resolve([mockEntry]);
      case "get_entry":
        return Promise.resolve(mockEntry);
      case "create_entry":
        return Promise.resolve({
          ...mockEntry,
          id: "new-entry",
          content: args?.content as string,
          tasks: args?.tasks as Task[],
          blockers: args?.blockers as string | null,
        });
      case "delete_entry":
        return Promise.resolve(true);
      case "get_settings":
        return Promise.resolve(mockSettings);
      case "update_settings":
        return Promise.resolve(undefined);
      case "generate_standup":
        return Promise.resolve(mockStandupReport);
      case "save_standup":
        return Promise.resolve(undefined);
      case "mark_standup_shared":
        return Promise.resolve(true);
      default:
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  });

  mockWriteText.mockResolvedValue(undefined);

  return mockInvoke;
}

export function resetTauriMocks() {
  mockInvoke.mockReset();
  mockWriteText.mockReset();
}

export { mockInvoke, mockWriteText };
