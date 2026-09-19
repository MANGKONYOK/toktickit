import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface LoginProps {
  onSuccess?: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      if (err.code === "ACCOUNT_INACTIVE") {
        setErrorMessage("Your account is inactive. Please contact the system administrator.");
      } else if (err.code === "INVALID_CREDENTIALS") {
        setErrorMessage("Invalid email or password. Please try again.");
      } else {
        setErrorMessage(err.message || "Failed to sign in. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ backgroundColor: "var(--color-page-bg, #F5F7F6)" }}
    >
      <div
        className="card shadow-sm border-0 p-4"
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
        }}
      >
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <span style={{ fontSize: "1.75rem" }}>🌿</span>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--color-primary, #006B3C)" }}>
              TokTickIT
            </h1>
          </div>
          <p className="text-muted small mb-0">Sign in to your account</p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            data-testid="login-error-alert"
            className="alert alert-danger d-flex align-items-center justify-content-between p-2 small mb-3"
            style={{ backgroundColor: "#FCE8E6", borderColor: "#F8B7B4", color: "#C5221F" }}
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              className="btn-close btn-close-sm"
              aria-label="Close"
              onClick={() => setErrorMessage(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="emailInput" className="form-label small fw-semibold text-dark">
              Email Address
            </label>
            <input
              id="emailInput"
              type="email"
              data-testid="login-email-input"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              style={{ minHeight: "44px" }}
              disabled={isLoading}
            />
            {fieldErrors.email && (
              <div className="invalid-feedback small" data-testid="email-error">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="passwordInput" className="form-label small fw-semibold text-dark">
              Password
            </label>
            <input
              id="passwordInput"
              type="password"
              data-testid="login-password-input"
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              style={{ minHeight: "44px" }}
              disabled={isLoading}
            />
            {fieldErrors.password && (
              <div className="invalid-feedback small" data-testid="password-error">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            data-testid="login-submit-button"
            className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
            style={{
              backgroundColor: "var(--color-primary, #006B3C)",
              borderColor: "var(--color-primary, #006B3C)",
              minHeight: "44px",
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Signing In...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
export default Login;
