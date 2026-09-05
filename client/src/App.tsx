import { useState } from "react";
import * as api from "./api.js";
import type { Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import TicketDetail from "./components/TicketDetail.js";

type UiState = "idle" | "loading" | "success" | "error";

function MainContent() {
  const { currentRequester, isSelectorOpen } = useRequester();
  const [activeTab, setActiveTab] = useState<"my-tickets" | "create-ticket">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Preserved Lab 1 capability for system status check and regression test suite
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await api.checkSystem();
      setCategories(result?.categories || []);
      setState("success");
    } catch {
      setErrorMessage("Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-bg-page)" }}>
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedTicketId(null);
          setActiveTab(tab);
        }}
      />
      <RequesterSelector />

      <main className="container flex-grow-1 pb-5" style={{ maxWidth: 1200 }}>
        {currentRequester && (
          <div className="mb-4 p-3 zen-card d-flex flex-wrap align-items-center justify-content-between">
            <div>
              <span className="text-muted small">Active Testing Requester Context:</span>
              <h5 className="mb-0 fw-bold text-dark">
                {currentRequester.fullName}{" "}
                <span className="badge bg-light text-success border ms-2">
                  {currentRequester.department}
                </span>
              </h5>
            </div>
            <div className="text-muted small">
              Simulated ID: <code className="text-success fw-bold">#{currentRequester.id}</code> | Email: {currentRequester.email}
            </div>
          </div>
        )}

        {currentRequester && !isSelectorOpen && (
          selectedTicketId !== null ? (
            <TicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
          ) : activeTab === "create-ticket" ? (
            <CreateTicket onNavigateToMyTickets={() => setActiveTab("my-tickets")} />
          ) : (
            <MyTickets
              onNavigateToCreateTicket={() => setActiveTab("create-ticket")}
              onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
            />
          )
        )}

        {/* Preserved Lab 1 System Diagnostics Section for Regression Verification */}
        <div className="zen-card p-4 mt-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h5 mb-1 text-dark">System Diagnostics</h2>
              <p className="text-muted small mb-0">Core API connectivity and reference data health</p>
            </div>
            <button
              className="btn btn-outline-success touch-target px-3"
              onClick={handleCheck}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading…" : "Check System Diagnostics"}
            </button>
          </div>

          {state === "success" && (
            <div className="mt-4">
              <p className="fs-5 mb-3">
                <strong>System Status:</strong>{" "}
                <span className="fw-bold" style={{ color: "var(--color-primary)" }}>
                  Online
                </span>
              </p>
              <h2 className="h5 mb-3">Supported Request Categories:</h2>
              <ol className="list-group list-group-numbered">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">
                    {cat.name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {state === "error" && (
            <div className="mt-4">
              <p className="fs-5 mb-2">
                <strong>System Status:</strong>{" "}
                <span className="text-danger fw-bold">Offline</span>
              </p>
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}