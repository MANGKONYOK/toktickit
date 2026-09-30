import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export function ChangePasswordModal({ isOpen, onSuccess }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^_\-]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    currentPassword.trim().length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      if (err.code === "INVALID_CURRENT_PASSWORD") {
        setErrorMessage("Current password is incorrect.");
      } else if (err.code === "PASSWORD_COMPLEXITY_FAILED") {
        setErrorMessage("New password does not satisfy all complexity requirements.");
      } else {
        setErrorMessage(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "8px" }}>
          <div
            className="modal-header text-white"
            style={{ backgroundColor: "var(--color-primary, #006B3C)" }}
          >
            <h5 className="modal-title h6 fw-bold mb-0 d-flex align-items-center gap-2">
              <span>🔒</span> Mandatory Password Change
            </h5>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4">
              <p className="small text-muted mb-3">
                For security compliance, you must update your temporary initial password before accessing TokTickIT.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  data-testid="change-password-error"
                  className="alert alert-danger small p-2 mb-3"
                  style={{ backgroundColor: "#FCE8E6", borderColor: "#F8B7B4", color: "#C5221F" }}
                >
                  {errorMessage}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">
                  Current Password
                </label>
                <input
                  type="password"
                  data-testid="current-password-input"
                  className="form-control"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ minHeight: "44px" }}
                  disabled={isLoading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">
                  New Password
                </label>
                <input
                  type="password"
                  data-testid="new-password-input"
                  className="form-control"
                  placeholder="Enter new complex password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ minHeight: "44px" }}
                  disabled={isLoading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  data-testid="confirm-password-input"
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ minHeight: "44px" }}
                  disabled={isLoading}
                />
              </div>

              {/* Password Rules Checklist */}
              <div
                className="p-3 rounded small"
                style={{ backgroundColor: "var(--color-card-bg, #F0F4F1)" }}
                data-testid="password-rules-checklist"
              >
                <div className="fw-semibold text-dark mb-2">Password Requirements:</div>
                <ul className="list-unstyled mb-0" style={{ fontSize: "0.85rem" }}>
                  <li className={hasMinLength ? "text-success fw-medium" : "text-muted"}>
                    {hasMinLength ? "✓" : "○"} At least 8 characters
                  </li>
                  <li className={hasUppercase ? "text-success fw-medium" : "text-muted"}>
                    {hasUppercase ? "✓" : "○"} At least 1 uppercase letter (A-Z)
                  </li>
                  <li className={hasLowercase ? "text-success fw-medium" : "text-muted"}>
                    {hasLowercase ? "✓" : "○"} At least 1 lowercase letter (a-z)
                  </li>
                  <li className={hasDigit ? "text-success fw-medium" : "text-muted"}>
                    {hasDigit ? "✓" : "○"} At least 1 number (0-9)
                  </li>
                  <li className={hasSpecial ? "text-success fw-medium" : "text-muted"}>
                    {hasSpecial ? "✓" : "○"} At least 1 special character (@$!%*?&#^_-)
                  </li>
                  <li className={passwordsMatch ? "text-success fw-medium" : "text-muted"}>
                    {passwordsMatch ? "✓" : "○"} New passwords match
                  </li>
                </ul>
              </div>
            </div>

            <div className="modal-footer border-0 p-3 pt-0">
              <button
                type="submit"
                data-testid="update-password-button"
                className="btn w-100 text-white fw-semibold"
                style={{
                  backgroundColor: "var(--color-primary, #006B3C)",
                  borderColor: "var(--color-primary, #006B3C)",
                  minHeight: "44px",
                }}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? "Updating Password..." : "Update Password and Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
export default ChangePasswordModal;
