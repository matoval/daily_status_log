import { invoke } from "@tauri-apps/api/core";

export interface OllamaStatus {
  available: boolean;
  models: string[];
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  return invoke("check_ollama_status");
}

export async function chatWithAI(
  message: string,
  model: string
): Promise<string> {
  return invoke("chat_with_ai", { message, model });
}
