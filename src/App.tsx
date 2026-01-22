import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { EntryForm } from "./components/EntryForm";
import { EntryList } from "./components/EntryList";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import { Toast } from "./components/Toast";
import { getEntries, getSettings, syncEntries, Entry, SyncResult } from "./lib/tauri";

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const hasSyncedOnStartup = useRef(false);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const loaded = await getEntries();
      setEntries(loaded);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const performSync = useCallback(async (showNoChanges = false): Promise<void> => {
    try {
      console.log("[Sync] Starting sync...");
      const result: SyncResult = await syncEntries();
      console.log("[Sync] Result:", result);

      if (result.uploaded > 0 || result.downloaded > 0) {
        const messages = [];
        if (result.uploaded > 0) messages.push(`${result.uploaded} uploaded`);
        if (result.downloaded > 0) messages.push(`${result.downloaded} downloaded`);
        showToast(`Synced: ${messages.join(", ")}`, "success");

        if (result.downloaded > 0) {
          loadEntries();
        }
      } else if (showNoChanges) {
        showToast("Already in sync", "info");
      }

      if (result.errors.length > 0) {
        console.error("[Sync] Errors:", result.errors);
        // Show first error message for more detail
        const firstError = result.errors[0];
        const shortError = firstError.length > 50 ? firstError.substring(0, 50) + "..." : firstError;
        showToast(`Sync error: ${shortError}`, "error");
      }
    } catch (error) {
      console.error("[Sync] Failed:", error);
      showToast(`Sync failed: ${error}`, "error");
    }
  }, [showToast, loadEntries]);

  const loadSyncSettingsAndSync = useCallback(async () => {
    try {
      const settings = await getSettings();
      const enabled = settings.sync_enabled && !!settings.sync_url && !!settings.sync_api_key;
      setSyncEnabled(enabled);

      // Auto sync on startup if enabled
      if (enabled && !hasSyncedOnStartup.current) {
        hasSyncedOnStartup.current = true;
        performSync(false);
      }
    } catch (error) {
      console.error("Failed to load sync settings:", error);
    }
  }, [performSync]);

  const handleEntryCreated = useCallback(async () => {
    await loadEntries();

    // Auto sync after creating an entry
    if (syncEnabled) {
      performSync(false);
    }
  }, [loadEntries, syncEnabled, performSync]);

  useEffect(() => {
    loadEntries();
    loadSyncSettingsAndSync();
  }, [loadEntries, loadSyncSettingsAndSync]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Daily Status Log</h1>
        <div className="header-actions">
          <button
            className={`chat-btn ${showChat ? "active" : ""}`}
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? "Close Chat" : "AI Chat"}
          </button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
      </header>

      <div className="app-layout">
        <div className={`app-main ${showChat ? "with-chat" : ""}`}>
          <div className="app-actions">
            <EntryForm onEntryCreated={handleEntryCreated} />
          </div>

          <div className="app-content">
            {isLoading ? (
              <p className="loading">Loading entries...</p>
            ) : (
              <EntryList entries={entries} onEntryDeleted={loadEntries} />
            )}
          </div>
        </div>

        {showChat && (
          <div className="chat-panel">
            <Chat onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>

      {showSettings && (
        <Settings
          onClose={() => { setShowSettings(false); loadSyncSettingsAndSync(); }}
          onSyncRequested={() => performSync(true)}
        />
      )}

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </main>
  );
}

export default App;
