import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryList } from "./EntryList";
import { setupTauriMocks, resetTauriMocks, mockEntry, mockEntryToday, mockInvoke } from "../test/mocks";
import type { Entry } from "../lib/tauri";

describe("EntryList", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("shows empty state when no entries", () => {
    render(<EntryList entries={[]} onEntryDeleted={vi.fn()} />);
    expect(screen.getByText("No entries yet. Create your first entry!")).toBeInTheDocument();
  });

  it("displays today's entries in Today section", () => {
    render(<EntryList entries={[mockEntryToday]} onEntryDeleted={vi.fn()} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("displays past entries in Recent section", () => {
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);
    expect(screen.getByText("Recent")).toBeInTheDocument();
  });

  it("shows task count for entries", () => {
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);
    // mockEntry has 2 tasks, 1 completed
    expect(screen.getByText("1/2 tasks")).toBeInTheDocument();
  });

  it("expands entry on click to show details", async () => {
    const user = userEvent.setup();
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);

    // Click on the entry card
    const entryCard = screen.getByText("1/2 tasks").closest(".entry-card");
    await user.click(entryCard!);

    // Should now show entry content and tasks
    expect(screen.getByText("Test entry content")).toBeInTheDocument();
    expect(screen.getByText(/Test task/)).toBeInTheDocument();
    expect(screen.getByText(/Completed task/)).toBeInTheDocument();
  });

  it("shows blockers in expanded view", async () => {
    const user = userEvent.setup();
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);

    const entryCard = screen.getByText("1/2 tasks").closest(".entry-card");
    await user.click(entryCard!);

    expect(screen.getByText(/Test blocker/)).toBeInTheDocument();
  });

  it("collapses entry when clicked again", async () => {
    const user = userEvent.setup();
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);

    const entryCard = screen.getByText("1/2 tasks").closest(".entry-card");

    // Expand
    await user.click(entryCard!);
    expect(screen.getByText("Test entry content")).toBeInTheDocument();

    // Collapse
    await user.click(entryCard!);
    expect(screen.queryByText("Test entry content")).not.toBeInTheDocument();
  });

  it("shows delete button and calls onEntryDeleted when confirmed", async () => {
    const user = userEvent.setup();
    const onEntryDeleted = vi.fn();

    render(<EntryList entries={[mockEntry]} onEntryDeleted={onEntryDeleted} />);

    // Find delete button
    const deleteBtn = screen.getByRole("button", { name: "x" });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("delete_entry", { id: "entry-1" });
    });

    await waitFor(() => {
      expect(onEntryDeleted).toHaveBeenCalled();
    });
  });

  it("groups entries by date", () => {
    const entries: Entry[] = [
      {
        ...mockEntry,
        id: "entry-2",
        date: "2024-01-19",
      },
      {
        ...mockEntry,
        id: "entry-3",
        date: "2024-01-19",
      },
    ];

    render(<EntryList entries={entries} onEntryDeleted={vi.fn()} />);

    // Should show date header with count (format: "Fri, Jan 19 (2 entries)")
    // The date group shows count in format "(X entries)"
    expect(screen.getByText(/\(2 entries\)/)).toBeInTheDocument();
  });

  it("displays completed tasks with checkmark", async () => {
    const user = userEvent.setup();
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);

    const entryCard = screen.getByText("1/2 tasks").closest(".entry-card");
    await user.click(entryCard!);

    // Check that completed task shows [x]
    expect(screen.getByText(/\[x\] Completed task/)).toBeInTheDocument();
    expect(screen.getByText(/\[ \] Test task/)).toBeInTheDocument();
  });

  it("shows time for each entry", () => {
    render(<EntryList entries={[mockEntry]} onEntryDeleted={vi.fn()} />);
    // The time should be displayed (format depends on locale)
    const timeElement = screen.getByText(/AM|PM/i);
    expect(timeElement).toBeInTheDocument();
  });
});
