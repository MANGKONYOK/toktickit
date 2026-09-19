import React from "react";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";

export type NavTab = "my-tickets" | "create-ticket" | "staff-queue" | "admin-users";

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenLogin?: () => void;
}

export default function Navbar({ activeTab, onSelectTab, onOpenLogin }: NavbarProps) {
  const { currentRequester, openSelector } = useRequester();
  const { user, logout } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span
            data-testid="role-badge"
            className="badge rounded-pill text-white px-2 py-1"
            style={{ backgroundColor: "#5E35B1" }}
          >
            Admin
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            data-testid="role-badge"
            className="badge rounded-pill text-white px-2 py-1"
            style={{ backgroundColor: "#1565C0" }}
          >
            IT Staff
          </span>
        );
      case "REQUESTER":
      default:
        return (
          <span
            data-testid="role-badge"
            className="badge rounded-pill px-2 py-1"
            style={{ backgroundColor: "var(--color-primary-light, #EAF6EF)", color: "var(--color-primary, #006B3C)" }}
          >
            Requester
          </span>
        );
    }
  };

  return (
    <header className="zen-header py-2 px-3 mb-4">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-2">
        {/* Brand and Navigation */}
        <div className="d-flex align-items-center gap-3 gap-md-4 flex-wrap">
          <div className="d-flex align-items-center gap-2 text-white fw-bold fs-5">
            <span style={{ fontSize: "1.25rem" }}>🌿</span>
            <span>TokTickIT</span>
          </div>

          <nav className="d-flex align-items-center gap-1 gap-md-2" data-testid="nav-menu">
            {/* Requester Tabs (or default when not staff/admin) */}
            {(!user || user.role === "REQUESTER") && (
              <>
                <button
                  type="button"
                  data-testid="nav-my-tickets"
                  className={`btn btn-link zen-nav-tab border-0 text-nowrap ${activeTab === "my-tickets" ? "active" : ""}`}
                  onClick={() => onSelectTab("my-tickets")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="me-1"
                    viewBox="0 0 16 16"
                  >
                    <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z" />
                    <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8m0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5" />
                  </svg>
                  My Tickets
                </button>

                <button
                  type="button"
                  data-testid="nav-create-ticket"
                  className={`btn btn-link zen-nav-tab border-0 text-nowrap ${activeTab === "create-ticket" ? "active" : ""}`}
                  onClick={() => onSelectTab("create-ticket")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="me-1"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                  </svg>
                  Create Ticket
                </button>
              </>
            )}

            {/* IT Staff Tabs */}
            {user && (user.role === "IT_STAFF" || user.role === "ADMIN") && (
              <button
                type="button"
                data-testid="nav-staff-queue"
                className={`btn btn-link zen-nav-tab border-0 text-nowrap ${activeTab === "staff-queue" ? "active" : ""}`}
                onClick={() => onSelectTab("staff-queue")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm12-1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z" />
                  <path d="M4 4h8v2H4V4zm0 3h8v2H4V7zm0 3h5v2H4v-2z" />
                </svg>
                Ticket Queue
              </button>
            )}

            {/* Admin Tabs */}
            {user && user.role === "ADMIN" && (
              <button
                type="button"
                data-testid="nav-admin-users"
                className={`btn btn-link zen-nav-tab border-0 text-nowrap ${activeTab === "admin-users" ? "active" : ""}`}
                onClick={() => onSelectTab("admin-users")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                </svg>
                User Management
              </button>
            )}
          </nav>
        </div>

        {/* User Identity & Actions */}
        <div className="d-flex align-items-center gap-2">
          {user ? (
            <div className="d-flex align-items-center gap-2" data-testid="authenticated-user-section">
              <div className="zen-badge-user d-flex align-items-center gap-2 text-nowrap">
                <span>👤</span>
                <span className="fw-semibold" data-testid="user-fullname">{user.fullName}</span>
                {getRoleBadge(user.role)}
              </div>

              <button
                type="button"
                data-testid="nav-logout-button"
                className="btn btn-sm btn-zen-outline-light text-nowrap"
                onClick={logout}
                title="Sign out of TokTickIT"
              >
                Logout
              </button>
            </div>
          ) : currentRequester ? (
            /* Lab 2 Fallback for simulated requester selector */
            <div className="d-flex align-items-center gap-2">
              <div className="zen-badge-user d-flex align-items-center gap-2 text-nowrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                  <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1" />
                </svg>
                <span className="fw-semibold">{currentRequester.fullName}</span>
                <span className="opacity-75 d-none d-sm-inline">({currentRequester.department})</span>
              </div>

              <button
                type="button"
                data-testid="nav-change-requester"
                className="btn btn-sm btn-zen-outline-light text-nowrap"
                onClick={openSelector}
                title="Switch Development Requester"
              >
                Change<span className="d-none d-sm-inline"> Requester</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="nav-signin-button"
              className="btn btn-sm btn-light fw-bold text-nowrap"
              onClick={onOpenLogin || openSelector}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
