import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export type ExportFormat = "json" | "csv" | "markdown";

export async function exportEntries(
  fromDate: string | null,
  toDate: string | null,
  format: ExportFormat
): Promise<string> {
  return invoke("export_entries", { fromDate, toDate, format });
}

export async function saveExportFile(
  content: string,
  format: ExportFormat
): Promise<boolean> {
  const extensions: Record<ExportFormat, string> = {
    json: "json",
    csv: "csv",
    markdown: "md",
  };

  const filterNames: Record<ExportFormat, string> = {
    json: "JSON",
    csv: "CSV",
    markdown: "Markdown",
  };

  const defaultName = `daily-status-export.${extensions[format]}`;

  const filePath = await save({
    defaultPath: defaultName,
    filters: [
      {
        name: filterNames[format],
        extensions: [extensions[format]],
      },
    ],
  });

  if (filePath) {
    await writeTextFile(filePath, content);
    return true;
  }

  return false;
}
