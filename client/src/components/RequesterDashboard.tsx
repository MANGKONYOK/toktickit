import React, { useState, useEffect } from "react";
import {
  fetchRequesterDashboard,
  type RequesterDashboardResponse,
  type TicketStatus,
  type Priority,
} from "../api.js";

interface RequesterDashboardProps {
  onNavigateToMyTickets?: (filter?: { status?: string; tab?: string }) => void;
  onNavigateToCreateTicket?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export default function RequesterDashboard({
  onNavigateToMyTickets,
  onNavigateToCreateTicket,
  onSelectTicket,
}: RequesterDashboardProps) {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRequesterDashboard();
      setData(res);
    } catch (err: any) {
      console.error("Failed to load requester dashboard:", err);
      setError(err.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: TicketStatus) => {
    const statusClassMap: Record<string, string> = {
      NEW: "zen-badge-status-new",
      OPEN: "zen-badge-status-new",
      IN_PROGRESS: "zen-badge-status-in_progress",
      WAITING_FOR_REQUESTER: "zen-badge-status-in_progress",
      RESOLVED: "zen-badge-status-resolved",
      CLOSED: "zen-badge-status-closed",
      REOPENED: "zen-badge-status-in_progress",
      CANCELLED: "zen-badge-status-cancelled",
    };
    const cls = statusClassMap[status] || "zen-badge-status-new";
    const label = status.replace(/_/g, " ");
    return (
      <span className={`zen-badge ${cls}`} data-testid={`status-badge-${status}`}>
        {label}
      </span>
    );
  };

  const getPriorityBadge = (priority: Priority) => {
    const pClassMap: Record<string, string> = {
      LOW: "zen-badge-priority-low",
      MEDIUM: "zen-badge-priority-medium",
      HIGH: "zen-badge-priority-high",
      URGENT: "zen-badge-priority-urgent",
    };
    const cls = pClassMap[priority] || "zen-badge-priority-low";
    return (
      <span className={`zen-badge ${cls}`} data-testid={`priority-badge-${priority}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-5 text-center" data-testid="dashboard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading dashboard…</span>
        </div>
        <p className="mt-2 text-muted">Loading your support dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 d-flex justify-content-between align-items-center" role="alert">
        <div>
          <strong>Error loading dashboard:</strong> {error}
        </div>
        <button className="btn btn-sm btn-outline-danger" onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recentTickets } = data;
  const isCompletelyEmpty =
    metrics.totalOpen === 0 &&
    metrics.waitingForRequester === 0 &&
    metrics.recentlyUpdated === 0 &&
    metrics.recentlyResolved === 0 &&
    recentTickets.length === 0;

  return (
    <div className="requester-dashboard" data-testid="requester-dashboard">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "var(--zg-text-main, #1b2e24)" }}>
            Requester Support Dashboard
          </h2>
          <p className="text-muted small mb-0">
            Overview of your active tickets, updates, and pending responses
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-zen-primary touch-target d-inline-flex align-items-center gap-2"
            data-testid="dashboard-create-ticket-btn"
            onClick={onNavigateToCreateTicket}
          >
            <span>+</span>
            <span>Create New Ticket</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Open */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="zg-metric-card h-100"
            data-testid="metric-card-total-open"
            onClick={() => onNavigateToMyTickets?.({ tab: "open" })}
            title="Click to view all open tickets"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Total Open Tickets</span>
              <span className="badge rounded-pill bg-light text-success border">Open</span>
            </div>
            <div className="zg-metric-card-value" data-testid="metric-value-total-open">
              {metrics.totalOpen}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Currently in flight</span>
              <span className="text-success fw-medium">View queue &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 2: Waiting for Requester */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className={`zg-metric-card h-100 ${metrics.waitingForRequester > 0 ? "alert-amber" : ""}`}
            data-testid="metric-card-waiting"
            onClick={() => onNavigateToMyTickets?.({ status: "WAITING_FOR_REQUESTER" })}
            title="Click to view tickets awaiting your feedback"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Waiting for Your Input</span>
              {metrics.waitingForRequester > 0 && (
                <span className="badge bg-warning text-dark">Action Needed</span>
              )}
            </div>
            <div
              className="zg-metric-card-value"
              data-testid="metric-value-waiting"
              style={metrics.waitingForRequester > 0 ? { color: "var(--zg-amber-text, #9a3412)" } : undefined}
            >
              {metrics.waitingForRequester}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Staff awaiting response</span>
              <span className="text-success fw-medium">Review &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 3: Recently Updated */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="zg-metric-card h-100"
            data-testid="metric-card-recently-updated"
            onClick={() => onNavigateToMyTickets?.({ tab: "recent" })}
            title="Click to view tickets updated in the last 7 days"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Updated Past 7 Days</span>
              <span className="badge rounded-pill bg-light text-muted border">Recent</span>
            </div>
            <div className="zg-metric-card-value" data-testid="metric-value-recently-updated">
              {metrics.recentlyUpdated}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Active progress</span>
              <span className="text-success fw-medium">View &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 4: Resolved & Closed */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="zg-metric-card h-100"
            data-testid="metric-card-recently-resolved"
            onClick={() => onNavigateToMyTickets?.({ status: "RESOLVED" })}
            title="Click to view resolved and closed tickets"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Resolved & Closed</span>
              <span className="badge rounded-pill bg-light text-primary border">Resolved</span>
            </div>
            <div className="zg-metric-card-value" data-testid="metric-value-recently-resolved">
              {metrics.recentlyResolved}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Completed requests</span>
              <span className="text-success fw-medium">History &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Empty State OR Recent Requests Table */}
      {isCompletelyEmpty ? (
        <div className="zen-card p-5 text-center my-4" data-testid="requester-dashboard-empty">
          <div className="display-6 mb-3">📋</div>
          <h3 className="h5 fw-bold text-dark mb-2">No Support Requests Yet</h3>
          <p className="text-muted mx-auto mb-4" style={{ maxWidth: 460 }}>
            You do not have any active or previous support tickets. If you need IT assistance,
            create your first ticket and our support team will help you right away.
          </p>
          <button
            type="button"
            className="btn btn-zen-primary touch-target px-4"
            onClick={onNavigateToCreateTicket}
            data-testid="empty-create-ticket-btn"
          >
            Create Your First Ticket
          </button>
        </div>
      ) : (
        <div className="zen-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 className="h5 fw-bold text-dark mb-1">Recent Requests</h3>
              <p className="text-muted small mb-0">Your 5 most recently active support requests</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-zen-secondary"
              onClick={() => onNavigateToMyTickets?.()}
            >
              View All My Tickets
            </button>
          </div>

          <div className="zen-table-container">
            <table className="zen-table" data-testid="recent-tickets-table">
              <thead>
                <tr>
                  <th style={{ width: "160px" }}>Ticket ID</th>
                  <th>Summary</th>
                  <th style={{ width: "130px" }}>Priority</th>
                  <th style={{ width: "160px" }}>Status</th>
                  <th style={{ width: "170px" }}>Last Updated</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} data-testid={`recent-ticket-row-${ticket.id}`}>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-success fw-bold text-decoration-none"
                        onClick={() => onSelectTicket?.(ticket.id)}
                        data-testid={`ticket-link-${ticket.id}`}
                      >
                        {ticket.ticketNumber}
                      </button>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{ticket.summary}</div>
                    </td>
                    <td>{getPriorityBadge(ticket.requestedPriority)}</td>
                    <td>{getStatusBadge(ticket.currentStatus)}</td>
                    <td className="text-muted small">
                      {new Date(ticket.updatedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={() => onSelectTicket?.(ticket.id)}
                        data-testid={`view-ticket-${ticket.id}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

