import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js");

const MOCK_REQUESTER: api.RequesterUser = {
  id: 1,
  fullName: "Sorawit Chaithong",
  email: "sorawit.chaithong@email.com",
  department: "Science",
  isActive: true,
};

const MOCK_CATEGORIES: api.Category[] = [
  { id: 1, name: "Account and Access", isActive: true },
  { id: 2, name: "Hardware", isActive: true },
];

const MOCK_SYSTEMS: api.RelatedSystem[] = [
  { id: 1, name: "Email", isActive: true },
  { id: 2, name: "Corporate Laptop", isActive: true },
];

describe("CreateTicket Component (UI-02, UI-03, UI-04 / AC-01, AC-05, AC-06, BR-05, BR-06, BR-07, BR-14)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit_development_requester",
      JSON.stringify(MOCK_REQUESTER)
    );

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([MOCK_REQUESTER]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_SYSTEMS);
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: MOCK_CATEGORIES,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function openCreateTicketTab() {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    });

    const createTabBtn = screen.getByRole("button", { name: /Create Ticket/i });
    fireEvent.click(createTabBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Create Support Ticket/i })
      ).toBeInTheDocument();
    });
  }

  it("UI-02 / AC-05: displays inline field validation errors when submitting empty / invalid fields", async () => {
    await openCreateTicketTab();

    // Verify read-only requester context header (UI Spec §4.3)
    expect(screen.getByText(/Filing Support Request As:/i)).toBeInTheDocument();
    expect(screen.getAllByText("Sorawit Chaithong").length).toBeGreaterThanOrEqual(2);

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please select a category/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a related system/i)).toBeInTheDocument();
      expect(screen.getByText(/Summary is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });

    // Test character bounds
    const summaryInput = screen.getByLabelText(/Summary/i);
    fireEvent.change(summaryInput, { target: { value: "abc" } }); // < 5 chars
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Summary must be between 5 and 100 characters/i)
      ).toBeInTheDocument();
    });
  });

  it("UI-03 / AC-01, BR-14: displays busy loading state on submit button during async creation call", async () => {
    let resolveCreation: (value: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreation = resolve;
    });

    vi.spyOn(api, "createTicket").mockImplementation(() => createPromise as any);

    await openCreateTicketTab();

    const categorySelect = screen.getByLabelText(/Category/i);
    const systemSelect = screen.getByLabelText(/Related System/i);
    const summaryInput = screen.getByLabelText(/Summary/i);
    const descInput = screen.getByLabelText(/Description/i);

    fireEvent.change(categorySelect, { target: { value: "2" } });
    fireEvent.change(systemSelect, { target: { value: "2" } });
    fireEvent.change(summaryInput, {
      target: { value: "Laptop screen flickering intermittently" },
    });
    fireEvent.change(descInput, {
      target: {
        value: "The screen flickers whenever I move the laptop display hinge.",
      },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify busy state
    await waitFor(() => {
      expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Submitting.../i })).toBeDisabled();

    // Resolve creation
    resolveCreation!({
      id: 101,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 2,
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      summary: "Laptop screen flickering intermittently",
      description: "The screen flickers whenever I move the laptop display hinge.",
      ticketOwner: "Unassigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Ticket Created Successfully!/i })
      ).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
    });
  });

  it("UI-04 / AC-06, BR-07: preserves form field values when API submission fails", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new Error("Database connection timeout")
    );

    await openCreateTicketTab();

    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    const systemSelect = screen.getByLabelText(/Related System/i) as HTMLSelectElement;
    const summaryInput = screen.getByLabelText(/Summary/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

    fireEvent.change(categorySelect, { target: { value: "1" } });
    fireEvent.change(systemSelect, { target: { value: "1" } });
    fireEvent.change(summaryInput, {
      target: { value: "Valid Summary for preservation test" },
    });
    fireEvent.change(descInput, {
      target: {
        value: "Valid Description text that should not be wiped when API throws an error.",
      },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Database connection timeout/i)
      ).toBeInTheDocument();
    });

    // Verify fields are completely preserved
    expect(categorySelect.value).toBe("1");
    expect(systemSelect.value).toBe("1");
    expect(summaryInput.value).toBe("Valid Summary for preservation test");
    expect(descInput.value).toBe(
      "Valid Description text that should not be wiped when API throws an error."
    );
  });

  it("maps server fieldErrors to inline form errors when server returns field errors", async () => {
    const serverError = new Error("Validation error") as any;
    serverError.fieldErrors = [
      { field: "summary", message: "Server error: summary flagged by security scanner" },
    ];
    vi.spyOn(api, "createTicket").mockRejectedValue(serverError);

    await openCreateTicketTab();

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Summary/i), {
      target: { value: "Valid Summary for test" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Valid Description for testing server error mapping." },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Server error: summary flagged by security scanner/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error alert and retry button when reference data loading fails", async () => {
    vi.spyOn(api, "fetchCategories").mockRejectedValueOnce(
      new Error("Categories service unavailable")
    );

    await openCreateTicketTab();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load reference data/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry Loading/i })).toBeInTheDocument();

    // Now mock success on retry
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    const retryBtn = screen.getByRole("button", { name: /Retry Loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(/Failed to load reference data/i)
      ).not.toBeInTheDocument();
    });
  });
});