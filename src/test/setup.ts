import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Create mock functions that we can control from tests
export const mockInvoke = vi.fn();
export const mockWriteText = vi.fn().mockResolvedValue(undefined);

// Mock Tauri core API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

// Mock Tauri clipboard plugin
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: mockWriteText,
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);
