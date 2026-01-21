import { invoke } from "@tauri-apps/api/core";
import { Entry } from "./tauri";

export interface SearchFilters {
  completed_only?: boolean;
  in_progress_only?: boolean;
  has_blockers?: boolean;
}

export async function searchEntries(
  fromDate: string | null,
  toDate: string | null,
  query: string | null,
  filters?: SearchFilters
): Promise<Entry[]> {
  return invoke("search_entries", { fromDate, toDate, query, filters });
}
