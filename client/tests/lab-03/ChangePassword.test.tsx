import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordModal from "../../src/components/ChangePasswordModal.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getMeApi: vi.fn().mockResolvedValue({
      user: {
        id: 3,
        fullName: "Bob Smith",
        email: "bob.smith@email.com",
        role: "REQUESTER",
        mustChangePassword: true,
      },
    }),
    changePasswordApi: vi.fn(),
  };
});

describe("ChangePasswordModal Component (UI-02 / AC-04, AC-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-02: does not render when isOpen is false", () => {
    const { container } = render(
      <AuthProvider>
        <ChangePasswordModal isOpen={false} />
      </AuthProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it("UI-02: renders modal with inputs, checklist, and initially disabled submit button", () => {
    render(
      <AuthProvider>
        <ChangePasswordModal isOpen={true} />
      </AuthProvider>
    );

    expect(screen.getByTestId("current-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("new-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-rules-checklist")).toBeInTheDocument();

    const submitBtn = screen.getByTestId("update-password-button");
    expect(submitBtn).toBeDisabled();
  });

  it("UI-02 / AC-05: updates checklist dynamically and enables submit when password satisfies complexity", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ChangePasswordModal isOpen={true} />
      </AuthProvider>
    );

    const currentInput = screen.getByTestId("current-password-input");
    const newInput = screen.getByTestId("new-password-input");
    const confirmInput = screen.getByTestId("confirm-password-input");
    const submitBtn = screen.getByTestId("update-password-button");

    await user.type(currentInput, "Password@2026");
    await user.type(newInput, "ValidPass#2026");
    await user.type(confirmInput, "ValidPass#2026");

    expect(submitBtn).not.toBeDisabled();
  });

  it("UI-02 / AC-04: successfully submits password change and triggers onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(api.changePasswordApi).mockResolvedValueOnce({
      message: "Password changed successfully.",
    });

    render(
      <AuthProvider>
        <ChangePasswordModal isOpen={true} onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(screen.getByTestId("current-password-input"), "Password@2026");
    await user.type(screen.getByTestId("new-password-input"), "ValidPass#2026");
    await user.type(screen.getByTestId("confirm-password-input"), "ValidPass#2026");
    await user.click(screen.getByTestId("update-password-button"));

    await waitFor(() => {
      expect(api.changePasswordApi).toHaveBeenCalledWith({
        currentPassword: "Password@2026",
        newPassword: "ValidPass#2026",
        confirmPassword: "ValidPass#2026",
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
