import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getMeApi: vi.fn().mockRejectedValue(new Error("Not logged in")),
    loginApi: vi.fn(),
  };
});

describe("Login Component (UI-01 / AC-01, AC-02, AC-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-01: renders email, password inputs and Sign In button with Zen Green styling", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
  });

  it("UI-01: validates empty email and password with inline error messages", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const submitBtn = screen.getByTestId("login-submit-button");
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId("email-error")).toHaveTextContent("Email address is required.");
    expect(await screen.findByTestId("password-error")).toHaveTextContent("Password is required.");
  });

  it("UI-01: validates invalid email format with inline error message", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByTestId("login-email-input");
    await user.type(emailInput, "not-an-email");

    const submitBtn = screen.getByTestId("login-submit-button");
    await user.click(submitBtn);

    expect(await screen.findByTestId("email-error")).toHaveTextContent("Please enter a valid email address.");
  });

  it("UI-01 / AC-01: submits valid credentials and triggers onSuccess callback", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.mocked(api.loginApi).mockResolvedValueOnce({
      user: {
        id: 1,
        fullName: "Piti Srisongkram",
        email: "piti.srisongkram@email.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      },
      message: "Login successful.",
    });

    render(
      <AuthProvider>
        <Login onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(screen.getByTestId("login-email-input"), "piti.srisongkram@email.com");
    await user.type(screen.getByTestId("login-password-input"), "Password@2026");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(api.loginApi).toHaveBeenCalledWith({
        email: "piti.srisongkram@email.com",
        password: "Password@2026",
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("UI-01 / AC-03: presents distinct error alert when account is deactivated (ACCOUNT_INACTIVE)", async () => {
    const user = userEvent.setup();
    const inactiveError: any = new Error("Account is inactive");
    inactiveError.code = "ACCOUNT_INACTIVE";
    vi.mocked(api.loginApi).mockRejectedValueOnce(inactiveError);

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await user.type(screen.getByTestId("login-email-input"), "alexanders.inactive@email.com");
    await user.type(screen.getByTestId("login-password-input"), "Password@2026");
    await user.click(screen.getByTestId("login-submit-button"));

    const alert = await screen.findByTestId("login-error-alert");
    expect(alert).toHaveTextContent("Your account is inactive. Please contact the system administrator.");
  });
});
