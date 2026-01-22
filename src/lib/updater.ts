import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    console.log("[Updater] Checking for updates...");
    const update = await check();

    if (update) {
      console.log(`[Updater] Update available: ${update.version}`);
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body,
      };
    }

    console.log("[Updater] No updates available");
    return null;
  } catch (error) {
    console.error("[Updater] Error checking for updates:", error);
    return null;
  }
}

export async function downloadAndInstallUpdate(): Promise<boolean> {
  try {
    console.log("[Updater] Starting update download...");
    const update = await check();

    if (!update) {
      console.log("[Updater] No update available");
      return false;
    }

    // Ask user to confirm
    const confirmed = await ask(
      `Version ${update.version} is available. Would you like to update now?`,
      {
        title: "Update Available",
        kind: "info",
      }
    );

    if (!confirmed) {
      console.log("[Updater] User declined update");
      return false;
    }

    console.log("[Updater] Downloading update...");
    await update.downloadAndInstall();

    console.log("[Updater] Update installed, relaunching...");
    await relaunch();

    return true;
  } catch (error) {
    console.error("[Updater] Error installing update:", error);
    return false;
  }
}

export async function checkAndPromptForUpdate(): Promise<void> {
  const update = await checkForUpdates();

  if (update) {
    await downloadAndInstallUpdate();
  }
}
