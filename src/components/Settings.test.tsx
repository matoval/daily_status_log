import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { setupTauriMocks, resetTauriMocks, mockSettings, mockInvoke } from "../test/mocks";

describe("Settings", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("loads and displays settings", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_settings");
  });

  it("shows reminder enabled checkbox", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Enable daily reminder")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText("Enable daily reminder");
    expect(checkbox).toBeChecked();
  });

  it("shows reminder time selects", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour");
    const minuteSelect = screen.getByLabelText("Minute");
    expect(hourSelect).toHaveValue("09");
    expect(minuteSelect).toHaveValue("00");
  });

  it("shows standup format select", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Standup format")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Standup format");
    expect(select).toHaveValue("markdown");
  });

  it("can toggle reminder enabled", async () => {
    const user = userEvent.setup();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Enable daily reminder")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText("Enable daily reminder");
    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it("disables time selects when reminder is disabled", async () => {
    const user = userEvent.setup();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Enable daily reminder")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText("Enable daily reminder");
    await user.click(checkbox);

    const hourSelect = screen.getByLabelText("Hour");
    const minuteSelect = screen.getByLabelText("Minute");
    expect(hourSelect).toBeDisabled();
    expect(minuteSelect).toBeDisabled();
  });

  it("can change reminder time", async () => {
    const user = userEvent.setup();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour");
    const minuteSelect = screen.getByLabelText("Minute");

    await user.selectOptions(hourSelect, "17");
    await user.selectOptions(minuteSelect, "30");

    expect(hourSelect).toHaveValue("17");
    expect(minuteSelect).toHaveValue("30");
  });

  it("can change standup format", async () => {
    const user = userEvent.setup();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Standup format")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Standup format");
    await user.selectOptions(select, "plain");

    expect(select).toHaveValue("plain");
  });

  it("saves settings when clicking save button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_settings", {
        settings: mockSettings,
      });
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("saves modified settings", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Enable daily reminder")).toBeInTheDocument();
    });

    // Disable reminder
    await user.click(screen.getByLabelText("Enable daily reminder"));

    // Change format
    await user.selectOptions(screen.getByLabelText("Standup format"), "slack");

    // Save
    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_settings", {
        settings: {
          reminder_enabled: false,
          reminder_time: "09:00",
          standup_format: "slack",
        },
      });
    });
  });

  it("can close with cancel button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("can close with x button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "x" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "x" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows loading state initially", () => {
    render(<Settings onClose={vi.fn()} />);
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
  });
});
