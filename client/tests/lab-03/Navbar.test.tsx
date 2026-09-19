import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../../src/components/Navbar.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getMeApi: vi.fn(),
    logoutApi: vi.fn().mockResolvedValue({ message: "Logout successful." }),
  };
});

describe("Navbar Component (UI-03 / AC-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-03: renders Sign In button when user is unauthenticated", async () => {
    vi.mocked(api.getMeApi).mockRejectedValueOnce(new Error("Not logged in"));

    render(
      <AuthProvider>
        <RequesterProvider>
          <Navbar activeTab="my-tickets" onSelectTab={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("nav-signin-button")).toBeInTheDocument();
    });
  });

  it("UI-03: renders Requester tabs and badge when authenticated as REQUESTER", async () => {
    vi.mocked(api.getMeApi).mockResolvedValueOnce({
      user: {
        id: 1,
        fullName: "Sorawit Chaithong",
        email: "sorawit.chaithong@email.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <Navbar activeTab="my-tickets" onSelectTab={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-fullname")).toHaveTextContent("Sorawit Chaithong");
      expect(screen.getByTestId("role-badge")).toHaveTextContent("Requester");
      expect(screen.getByTestId("nav-my-tickets")).toBeInTheDocument();
      expect(screen.getByTestId("nav-create-ticket")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-staff-queue")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-admin-users")).not.toBeInTheDocument();
    });
  });

  it("UI-03: renders Ticket Queue tab and IT Staff badge when authenticated as IT_STAFF", async () => {
    vi.mocked(api.getMeApi).mockResolvedValueOnce({
      user: {
        id: 2,
        fullName: "Piti Srisongkram",
        email: "piti.srisongkram@email.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <Navbar activeTab="staff-queue" onSelectTab={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-fullname")).toHaveTextContent("Piti Srisongkram");
      expect(screen.getByTestId("role-badge")).toHaveTextContent("IT Staff");
      expect(screen.getByTestId("nav-staff-queue")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-admin-users")).not.toBeInTheDocument();
    });
  });

  it("UI-03: renders Ticket Queue and User Management tabs when authenticated as ADMIN", async () => {
    vi.mocked(api.getMeApi).mockResolvedValueOnce({
      user: {
        id: 9,
        fullName: "Admin TokTickIT",
        email: "admin.toktickit@email.com",
        role: "ADMIN",
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <Navbar activeTab="admin-users" onSelectTab={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-fullname")).toHaveTextContent("Admin TokTickIT");
      expect(screen.getByTestId("role-badge")).toHaveTextContent("Admin");
      expect(screen.getByTestId("nav-staff-queue")).toBeInTheDocument();
      expect(screen.getByTestId("nav-admin-users")).toBeInTheDocument();
    });
  });

  it("UI-03: triggers logout when clicking Logout button", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMeApi).mockResolvedValueOnce({
      user: {
        id: 2,
        fullName: "Piti Srisongkram",
        email: "piti.srisongkram@email.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <Navbar activeTab="staff-queue" onSelectTab={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("nav-logout-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("nav-logout-button"));

    await waitFor(() => {
      expect(api.logoutApi).toHaveBeenCalled();
    });
  });
});
