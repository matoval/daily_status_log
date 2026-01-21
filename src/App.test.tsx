import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { setupTauriMocks, resetTauriMocks, mockEntry, mockInvoke } from "./test/mocks";

describe("App", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("renders the app header", async () => {
    render(<App />);

    expect(screen.getByText("Daily Status Log")).toBeInTheDocument();
  });

  it("shows settings button", () => {
    render(<App />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows new entry button", () => {
    render(<App />);

    expect(screen.getByText("+ New Entry")).toBeInTheDocument();
  });

  it("shows generate standup button", () => {
    render(<App />);

    expect(screen.getByText("Generate Standup")).toBeInTheDocument();
  });

  it("loads entries on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_entries", {
        fromDate: undefined,
        toDate: undefined,
      });
    });
  });

  it("shows loading state initially", () => {
    render(<App />);

    expect(screen.getByText("Loading entries...")).toBeInTheDocument();
  });

  it("displays entries after loading", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Recent")).toBeInTheDocument();
    });
  });

  it("opens settings modal when clicking settings button", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Settings"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });
  });

  it("closes settings modal", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Settings"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    });
  });

  it("opens standup modal when clicking generate standup button", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Generate Standup"));

    await waitFor(() => {
      expect(screen.getByText("Generate Standup Report")).toBeInTheDocument();
    });
  });

  it("closes standup modal", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Generate Standup"));

    await waitFor(() => {
      expect(screen.getByText("Generate Standup Report")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Generate Standup Report")).not.toBeInTheDocument();
    });
  });

  it("opens entry form when clicking new entry", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("+ New Entry"));

    expect(screen.getByText("New Entry")).toBeInTheDocument();
  });

  it("reloads entries after creating a new entry", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_entries", expect.anything());
    });

    // Clear the mock to track new calls
    mockInvoke.mockClear();
    setupTauriMocks();

    // Open form and submit
    await user.click(screen.getByText("+ New Entry"));

    const contentInput = screen.getByPlaceholderText("Describe your work...");
    await user.type(contentInput, "New work");

    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "New task{enter}");

    await user.click(screen.getByText("Save Entry"));

    // Should reload entries
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_entries", expect.anything());
    });
  });

  it("shows entry list with tasks", async () => {
    render(<App />);

    await waitFor(() => {
      // mockEntry has 1/2 tasks completed
      expect(screen.getByText("1/2 tasks")).toBeInTheDocument();
    });
  });
});
