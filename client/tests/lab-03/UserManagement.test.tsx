import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "../../src/components/UserManagement.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockUsers: api.AdminUser[] = [
  {
    id: 1,
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    department: "Science",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: 2,
    fullName: "Piti Srisongkram",
    email: "piti.srisongkram@email.com",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    department: "IT Infrastructure",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: 10,
    fullName: "Admin TokTickIT",
    email: "admin.toktickit@email.com",
    role: "ADMIN",
    isActive: true,
    mustChangePassword: false,
    department: "System Administration",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];

const mockAdminUser = {
  id: 10,
  fullName: "Admin TokTickIT",
  email: "admin.toktickit@email.com",
  role: "ADMIN" as const,
  mustChangePassword: false,
};

describe("UserManagement Component (UI-07 / AC-20..22, BR-16..21)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(api, "getMeApi").mockResolvedValue({
      user: mockAdminUser,
    });

    vi.spyOn(api, "fetchAdminUsers").mockImplementation(async (params) => {
      let filtered = [...mockUsers];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
      }
      if (params?.role && params.role !== "ALL") {
        filtered = filtered.filter((u) => u.role === params.role);
      }
      return { users: filtered };
    });
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );
  };

  it("UI-07: renders User Administration header, search input, role filter, and user table", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("user-management-view")).toBeInTheDocument();
    });

    expect(screen.getByText("User Administration")).toBeInTheDocument();
    expect(screen.getByTestId("admin-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-role-filter")).toBeInTheDocument();
    expect(screen.getByTestId("btn-open-create-user")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-10")).toBeInTheDocument();
    });

    const table = screen.getByTestId("admin-users-table");
    expect(table).toHaveTextContent("Sorawit Chaithong");
    expect(table).toHaveTextContent("Piti Srisongkram");
    expect(table).toHaveTextContent("Admin TokTickIT");
  });

  it("UI-07: filters user list by keyword search", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("admin-search-input");
    await user.type(searchInput, "piti");

    await waitFor(() => {
      const table = screen.getByTestId("admin-users-table");
      expect(table).toHaveTextContent("Piti Srisongkram");
      expect(table).not.toHaveTextContent("Sorawit Chaithong");
    });
  });

  it("UI-07: filters user list by role dropdown", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    const roleSelect = screen.getByTestId("admin-role-filter");
    await user.selectOptions(roleSelect, "ADMIN");

    await waitFor(() => {
      const table = screen.getByTestId("admin-users-table");
      expect(table).toHaveTextContent("Admin TokTickIT");
      expect(table).not.toHaveTextContent("Sorawit Chaithong");
      expect(table).not.toHaveTextContent("Piti Srisongkram");
    });
  });

  it("UI-07 / AC-20: opens Create User modal, fills form, and creates new user", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, "createAdminUser").mockResolvedValue({
      user: {
        id: 11,
        fullName: "New Staff Member",
        email: "newstaff@email.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        department: "Support",
        createdAt: new Date().toISOString(),
      },
      message: "User created successfully.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("btn-open-create-user")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-open-create-user"));

    expect(screen.getByText("Create User Account")).toBeInTheDocument();
    expect(screen.getByTestId("create-user-fullname")).toBeInTheDocument();

    await user.type(screen.getByTestId("create-user-fullname"), "New Staff Member");
    await user.type(screen.getByTestId("create-user-email"), "newstaff@email.com");
    await user.selectOptions(screen.getByTestId("create-user-role"), "IT_STAFF");
    await user.type(screen.getByTestId("create-user-password"), "InitialPass@2026");

    await user.click(screen.getByTestId("btn-submit-create-user"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "New Staff Member",
          email: "newstaff@email.com",
          role: "IT_STAFF",
          initialPassword: "InitialPass@2026",
          isActive: true,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toHaveTextContent(
        "User created successfully."
      );
    });
  });

  it("UI-07: opens Edit User modal, updates profile attributes, and handles safety warning", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(api, "updateAdminUser").mockResolvedValue({
      user: {
        ...mockUsers[0],
        fullName: "Sorawit Updated",
        department: "Advanced Sciences",
      },
      message: "User updated successfully.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-edit-user-1"));

    expect(screen.getByText("Edit User Profile")).toBeInTheDocument();
    const nameInput = screen.getByTestId("edit-user-fullname");
    expect(nameInput).toHaveValue("Sorawit Chaithong");

    await user.clear(nameInput);
    await user.type(nameInput, "Sorawit Updated");

    await user.click(screen.getByTestId("btn-submit-edit-user"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fullName: "Sorawit Updated",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toHaveTextContent(
        "User updated successfully."
      );
    });
  });

  it("UI-07 / AC-21: displays guardrail error when self-deactivation is rejected (CANNOT_DEACTIVATE_SELF)", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(api, "updateAdminUser").mockRejectedValue({
      code: "CANNOT_DEACTIVATE_SELF",
      message: "Administrators cannot deactivate their own account",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-10")).toBeInTheDocument();
    });

    // Edit adminUser (id 10) who is currentUser
    await user.click(screen.getByTestId("btn-edit-user-10"));

    expect(screen.getByTestId("self-edit-warning")).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-submit-edit-user"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-error")).toHaveTextContent(
        "Administrators cannot deactivate their own account"
      );
    });
  });

  it("UI-07 / AC-22: displays guardrail error when last admin deactivation is rejected (LAST_ADMIN_PROTECTED)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "updateAdminUser").mockRejectedValue({
      code: "LAST_ADMIN_PROTECTED",
      message: "Cannot deactivate or demote the last active administrator",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-10")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-edit-user-10"));
    await user.click(screen.getByTestId("btn-submit-edit-user"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-error")).toHaveTextContent(
        "Cannot deactivate or demote the last active administrator"
      );
    });
  });

  it("UI-07: opens Reset Password modal, inputs new password, and submits reset", async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(api, "resetUserPassword").mockResolvedValue({
      message: "Password reset successfully. User must change password at next login.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("btn-reset-password-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("btn-reset-password-1"));

    expect(screen.getByText("Reset User Password")).toBeInTheDocument();
    const passInput = screen.getByTestId("reset-user-password");

    await user.type(passInput, "ResetPass@2026");
    await user.click(screen.getByTestId("btn-submit-reset-password"));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(1, "ResetPass@2026");
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toHaveTextContent(
        "Password reset successfully."
      );
    });
  });
});
