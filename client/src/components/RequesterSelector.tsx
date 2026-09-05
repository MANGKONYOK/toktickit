import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function RequesterSelector() {
  const {
    currentRequester,
    requesters = [],
    isLoading,
    error,
    isSelectorOpen,
    setRequester,
    closeSelector,
    refreshRequesters,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<number | "">("");

  useEffect(() => {
    const list = Array.isArray(requesters) ? requesters : [];
    if (currentRequester) {
      setSelectedId(currentRequester.id);
    } else if (list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, [currentRequester, requesters]);

  if (!isSelectorOpen) {
    return null;
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId === "") return;
    const list = Array.isArray(requesters) ? requesters : [];
    const target = list.find((r) => r.id === Number(selectedId));
    if (target) {
      setRequester(target);
    }
  };

  const safeList = Array.isArray(requesters) ? requesters : [];

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(2px)" }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="requester-selector-title"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
        <div className="modal-content zen-card shadow-lg border-0">
          <div className="modal-body p-4 text-center">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle"
              style={{
                width: 56,
                height: 56,
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
              </svg>
            </div>

            <h3 id="requester-selector-title" className="h4 fw-bold mb-2 text-dark">
              Select Development Requester
            </h3>
            <p className="text-muted small mb-4">
              Choose a development requester to simulate the current requester context for Lab 2.
              <br />
              <strong className="text-secondary">This is for testing only and is not a login screen.</strong>
            </p>

            {isLoading && (
              <div className="py-4 text-center">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading requesters...</span>
                </div>
                <p className="small text-muted mt-2">Loading active development users...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger text-start small mb-4">
                <strong>Error:</strong> {error}
                <div className="mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => refreshRequesters()}
                  >
                    Retry Loading
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <form onSubmit={handleContinue} className="text-start">
                <div className="mb-3">
                  <label htmlFor="requester-select" className="form-label fw-semibold small">
                    Development Requester <span className="text-danger">*</span>
                  </label>
                  <select
                    id="requester-select"
                    className="form-select form-select-lg"
                    value={selectedId}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    required
                  >
                    {safeList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName} ({r.department}) — {r.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="alert zen-alert-info small mb-3 d-flex align-items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="me-2 flex-shrink-0"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
                  </svg>
                  <span>Only active development requesters are loaded from PostgreSQL.</span>
                </div>

                <div
                  className="p-3 mb-4 rounded border"
                  style={{ backgroundColor: "var(--color-bg-page)" }}
                >
                  <div className="d-flex align-items-start">
                    <div className="me-2 text-muted">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2" />
                      </svg>
                    </div>
                    <div>
                      <div className="fw-bold small text-dark">Authentication coming in Lab 3</div>
                      <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                        In Lab 3, this selection will be replaced with real credentials, password
                        hashing, and session-based authentication.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  {currentRequester && (
                    <button
                      type="button"
                      className="btn btn-secondary px-3"
                      onClick={closeSelector}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    data-testid="continue-requester-btn"
                    className="btn btn-zen-primary touch-target px-4"
                    disabled={selectedId === "" || safeList.length === 0}
                  >
                    Continue &rarr;
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}