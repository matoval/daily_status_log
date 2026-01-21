import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandupReport } from "./StandupReport";
import { setupTauriMocks, resetTauriMocks, mockStandupReport, mockInvoke, mockWriteText } from "../test/mocks";

describe("StandupReport", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("shows initial generate prompt", () => {
    render(<StandupReport onClose={vi.fn()} />);
    expect(screen.getByText("Generate Standup Report")).toBeInTheDocument();
    expect(screen.getByText("Generate Report")).toBeInTheDocument();
  });

  it("can close with cancel button from initial view", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StandupReport onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("can close with x button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StandupReport onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "x" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("generates report when clicking generate button", async () => {
    const user = userEvent.setup();
    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("generate_standup", { format: "markdown" });
    });
  });

  it("shows report content after generation", async () => {
    const user = userEvent.setup();
    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText("Standup Report")).toBeInTheDocument();
    });

    // Check that the report content is in the textarea
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(mockStandupReport.content);
  });

  it("shows entry count in report view", async () => {
    const user = userEvent.setup();
    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText(/1 entries since last standup/)).toBeInTheDocument();
    });
  });

  it("allows editing the report content", async () => {
    const user = userEvent.setup();
    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Custom report content");

    expect(textarea).toHaveValue("Custom report content");
  });

  it("copies to clipboard and saves when clicking copy button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<StandupReport onClose={onClose} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText("Copy to Clipboard & Save")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Copy to Clipboard & Save"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockStandupReport.content);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_standup", {
        id: mockStandupReport.id,
        content: mockStandupReport.content,
        entryIds: [mockStandupReport.entries[0].id],
      });
    });
  });

  it("shows copied message after successful copy", async () => {
    const user = userEvent.setup();
    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText("Copy to Clipboard & Save")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Copy to Clipboard & Save"));

    await waitFor(() => {
      expect(screen.getByText(/Copied to clipboard/)).toBeInTheDocument();
    });
  });

  it("can cancel from report view", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StandupReport onClose={onClose} />);

    await user.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText("Standup Report")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows loading state while generating", async () => {
    const user = userEvent.setup();

    // Make the mock take some time
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "generate_standup") {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockStandupReport), 100);
        });
      }
      return Promise.resolve();
    });

    render(<StandupReport onClose={vi.fn()} />);

    await user.click(screen.getByText("Generate Report"));

    expect(screen.getByText("Generating report...")).toBeInTheDocument();
  });
});
