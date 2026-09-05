import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js");

const MOCK_REQUESTERS: api.RequesterUser[] = [
  {
    id: 1,
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    department: "Science",
    isActive: true,
  },
  {
    id: 2,
    fullName: "Piti Srisongkram",
    email: "piti.srisongkram@gmail.com",
    department: "Engineering",
    isActive: true,
  },
];

describe("RequesterSelector & Navbar (UI-01 / AC-02, BR-03, BR-04)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(MOCK_REQUESTERS);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Development Requester selector with disclaimer banner when no user is selected", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Select Development Requester/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This is for testing only and is not a login screen/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Only active development requesters are loaded from PostgreSQL/i)
    ).toBeInTheDocument();

    // Verify select dropdown has mock active requesters
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Sorawit Chaithong/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Piti Srisongkram/i })).toBeInTheDocument();
  });

  it("selects a development requester, persists selection, and displays user badge in Navbar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Sorawit Chaithong/i })).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Check Navbar contains selected requester's name
    expect(screen.getAllByText(/Sorawit Chaithong/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Science/i).length).toBeGreaterThan(0);

    // Check localStorage contains the selected user
    const stored = localStorage.getItem("toktickit_development_requester");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).fullName).toBe("Sorawit Chaithong");
  });

  it("allows switching identity when clicking 'Change Requester'", async () => {
    // Pre-populate localStorage
    localStorage.setItem(
      "toktickit_development_requester",
      JSON.stringify(MOCK_REQUESTERS[0])
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText(/Sorawit Chaithong/i).length).toBeGreaterThan(0);
    });

    const changeBtn = screen.getByRole("button", { name: /Change Requester/i });
    fireEvent.click(changeBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Select Development Requester/i })
      ).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Piti Srisongkram/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Engineering/i).length).toBeGreaterThan(0);
    });
  });

  it("displays error message and retry button when API fails to load requesters", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("Network Error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry Loading/i })).toBeInTheDocument();
  });
});