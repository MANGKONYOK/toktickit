import React from "react";
import { useRequester } from "../context/RequesterContext.js";

interface NavbarProps {
  activeTab: "my-tickets" | "create-ticket";
  onSelectTab: (tab: "my-tickets" | "create-ticket") => void;
}

export default function Navbar({ activeTab, onSelectTab }: NavbarProps) {
  const { currentRequester, openSelector } = useRequester();

  return (
    <header className="zen-header py-2 px-3 mb-4">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between">
        {/* Brand and Navigation */}
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2 text-white fw-bold fs-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              className="d-inline-block"
              viewBox="0 0 16 16"
            >
              <path d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a.5.5 0 0 1-.5.5 1.5 1.5 0 0 0 0 3 .5.5 0 0 1 .5.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11.5V10a.5.5 0 0 1 .5-.5 1.5 1.5 0 1 0 0-3A.5.5 0 0 1 0 6z" />
            </svg>
            <span>TokTickIT</span>
          </div>

          <nav className="d-flex align-items-center gap-2">
            <button
              type="button"
              data-testid="nav-my-tickets"
              className={`btn btn-link zen-nav-tab border-0 ${activeTab === "my-tickets" ? "active" : ""}`}
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
              className={`btn btn-link zen-nav-tab border-0 ${activeTab === "create-ticket" ? "active" : ""}`}
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
          </nav>
        </div>

        {/* User Identity & Switcher */}
        <div className="d-flex align-items-center gap-3">
          {currentRequester ? (
            <div className="d-flex align-items-center gap-2">
              <div className="zen-badge-user d-flex align-items-center gap-2">
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
                <span className="opacity-75">({currentRequester.department})</span>
              </div>

              <button
                type="button"
                data-testid="nav-change-requester"
                className="btn btn-sm btn-zen-outline-light"
                onClick={openSelector}
                title="Switch Development Requester"
              >
                Change Requester
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold"
              onClick={openSelector}
            >
              Select Requester
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
