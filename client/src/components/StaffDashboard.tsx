import React, { useState, useEffect } from "react";
import {
  fetchStaffDashboard,
  fetchAdminDashboard,
  type StaffDashboardResponse,
  type AdminUserStats,
  type TicketStatus,
  type Priority,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

interface StaffDashboardProps {
  onNavigateToQueue?: (filter?: {
    assigned?: "all" | "unassigned" | "me";
    status?: string;
    priority?: string;
  }) => void;
  onSelectTicket?: (ticketId: number) => void;
  onNavigateToUsers?: () => void;
}

export default function StaffDashboard({
  onNavigateToQueue,
  onSelectTicket,
  onNavigateToUsers,
}: StaffDashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [staffData, setStaffData] = useState<StaffDashboardResponse | null>(null);
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const adminRes = await fetchAdminDashboard();
        setStaffData(adminRes.staffDashboard);
        setUserStats(adminRes.userStats);
      } else {
        const staffRes = await fetchStaffDashboard();
        setStaffData(staffRes);
      }
    } catch (err: any) {
      console.error("Failed to load staff dashboard:", err);
      setError(err.message || "Failed to load operational dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

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
    return <span className={`zen-badge ${cls}`}>{label}</span>;
  };

  const getPriorityBadge = (priority: Priority) => {
    const pClassMap: Record<string, string> = {
      LOW: "zen-badge-priority-low",
      MEDIUM: "zen-badge-priority-medium",
      HIGH: "zen-badge-priority-high",
      URGENT: "zen-badge-priority-urgent",
    };
    const cls = pClassMap[priority] || "zen-badge-priority-low";
    return <span className={`zen-badge ${cls}`}>{priority}</span>;
  };

  if (loading) {
    return (
      <div className="py-5 text-center" data-testid="staff-dashboard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading dashboard…</span>
        </div>
        <p className="mt-2 text-muted">Loading operational metrics & triage data…</p>
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

  if (!staffData) return null;

  const { metrics, recentActions, urgentAttentionTickets } = staffData;

  return (
    <div className="staff-dashboard" data-testid="staff-dashboard">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "var(--zg-text-main, #1b2e24)" }}>
            IT Operations & Triage Dashboard
          </h2>
          <p className="text-muted small mb-0">
            Real-time queue analytics, dispatch health, and urgent attention tickets
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-zen-secondary touch-target"
            onClick={() => onNavigateToQueue?.({ assigned: "all" })}
            data-testid="dashboard-view-all-queue-btn"
          >
            Open Full Queue
          </button>
        </div>
      </div>

      {/* 4 Operational Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Unassigned Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className={`zg-metric-card h-100 ${metrics.unassignedTickets > 0 ? "alert-amber" : ""}`}
            data-testid="metric-card-unassigned"
            onClick={() => onNavigateToQueue?.({ assigned: "unassigned" })}
            title="Click to view unassigned tickets"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Unassigned Tickets</span>
              {metrics.unassignedTickets > 0 ? (
                <span className="badge bg-warning text-dark">Needs Owner</span>
              ) : (
                <span className="badge bg-light text-success border">All Assigned</span>
              )}
            </div>
            <div
              className="zg-metric-card-value"
              data-testid="metric-value-unassigned"
              style={metrics.unassignedTickets > 0 ? { color: "var(--zg-amber-text, #9a3412)" } : undefined}
            >
              {metrics.unassignedTickets}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Awaiting dispatch</span>
              <span className="text-success fw-medium">Triage &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 2: My Active Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="zg-metric-card h-100"
            data-testid="metric-card-my-assigned"
            onClick={() => onNavigateToQueue?.({ assigned: "me" })}
            title="Click to view tickets assigned to you"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">My Active Tickets</span>
              <span className="badge bg-success text-white">Assigned to Me</span>
            </div>
            <div className="zg-metric-card-value" data-testid="metric-value-my-assigned">
              {metrics.myAssignedTickets}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Your active workload</span>
              <span className="text-success fw-medium">View mine &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 3: Awaiting Feedback */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="zg-metric-card h-100"
            data-testid="metric-card-waiting-feedback"
            onClick={() => onNavigateToQueue?.({ status: "WAITING_FOR_REQUESTER" })}
            title="Click to view tickets waiting for requester feedback"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Awaiting Feedback</span>
              <span className="badge rounded-pill bg-light text-muted border">Pending User</span>
            </div>
            <div className="zg-metric-card-value" data-testid="metric-value-waiting-feedback">
              {metrics.waitingForRequester}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>Waiting for requester</span>
              <span className="text-success fw-medium">Inspect &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card 4: Urgent Attention */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className={`zg-metric-card h-100 ${metrics.urgentTickets > 0 ? "alert-urgent" : ""}`}
            data-testid="metric-card-urgent"
            onClick={() => onNavigateToQueue?.({ priority: "URGENT" })}
            title="Click to view urgent tickets"
          >
            <div className="d-flex justify-content-between align-items-start">
              <span className="zg-metric-card-title">Urgent Tickets</span>
              {metrics.urgentTickets > 0 ? (
                <span className="badge bg-danger text-white">Priority 1</span>
              ) : (
                <span className="badge bg-light text-muted border">None Urgent</span>
              )}
            </div>
            <div
              className="zg-metric-card-value"
              data-testid="metric-value-urgent"
              style={metrics.urgentTickets > 0 ? { color: "#dc2626" } : undefined}
            >
              {metrics.urgentTickets}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center justify-content-between">
              <span>SLA impact risk</span>
              <span className="text-danger fw-medium">Respond &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin User Management Statistics (FR-14, AC-21) */}
      {isAdmin && userStats && (
        <div className="zen-card p-4 mb-4" data-testid="admin-user-stats-section">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <h3 className="h5 fw-bold text-dark mb-1">User Account Health & Distribution</h3>
              <p className="text-muted small mb-0">System-wide account activation and role allocations</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-zen-primary"
              onClick={onNavigateToUsers}
              data-testid="admin-manage-users-btn"
            >
              Manage Users &rarr;
            </button>
          </div>

          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="p-3 border rounded bg-light text-center">
                <div className="text-muted small">Total Users</div>
                <div className="fs-3 fw-bold text-dark" data-testid="admin-stat-total-users">
                  {userStats.totalUsers}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 border rounded bg-light text-center">
                <div className="text-muted small">Active Accounts</div>
                <div className="fs-3 fw-bold text-success" data-testid="admin-stat-active-users">
                  {userStats.activeUsers}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 border rounded bg-light text-center">
                <div className="text-muted small">Inactive Accounts</div>
                <div className="fs-3 fw-bold text-danger" data-testid="admin-stat-inactive-users">
                  {userStats.inactiveUsers}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 border rounded bg-light text-center" data-testid="admin-stat-by-role">
                <div className="text-muted small mb-1">Role Allocation</div>
                <div className="small fw-semibold">
                  <span className="text-success">{userStats.byRole.REQUESTER || 0} Req</span> |{" "}
                  <span className="text-primary">{userStats.byRole.IT_STAFF || 0} Staff</span> |{" "}
                  <span className="text-purple" style={{ color: "#5E35B1" }}>
                    {userStats.byRole.ADMIN || 0} Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Middle Row: Status & Priority Distributions */}
      <div className="row g-3 mb-4">
        {/* Status Distribution */}
        <div className="col-12 col-lg-7">
          <div className="zen-card p-4 h-100" data-testid="status-distribution-section">
            <h3 className="h6 fw-bold text-dark mb-3">Ticket Volume by Status</h3>
            <div className="row g-2">
              {Object.entries(metrics.ticketsByStatus).map(([statusKey, count]) => (
                <div key={statusKey} className="col-6 col-md-3">
                  <div
                    className="p-2 border rounded bg-light d-flex flex-column justify-content-between"
                    style={{ cursor: "pointer", minHeight: "68px" }}
                    onClick={() => onNavigateToQueue?.({ status: statusKey })}
                    title={`Click to filter by ${statusKey}`}
                  >
                    <span className="small text-truncate text-muted">{statusKey.replace(/_/g, " ")}</span>
                    <span className="fw-bold fs-5 text-dark" data-testid={`status-count-${statusKey}`}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="col-12 col-lg-5">
          <div className="zen-card p-4 h-100" data-testid="priority-distribution-section">
            <h3 className="h6 fw-bold text-dark mb-3">Workload by Priority</h3>
            <div className="row g-2">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((pKey) => {
                const count = metrics.ticketsByPriority[pKey] || 0;
                return (
                  <div key={pKey} className="col-6">
                    <div
                      className="p-2 border rounded bg-light d-flex flex-column justify-content-between"
                      style={{ cursor: "pointer", minHeight: "68px" }}
                      onClick={() => onNavigateToQueue?.({ priority: pKey })}
                      title={`Click to filter by ${pKey}`}
                    >
                      <span className="small text-muted">{pKey}</span>
                      <div className="d-flex align-items-center justify-content-between">
                        <span
                          className={`fw-bold fs-5 ${pKey === "URGENT" && count > 0 ? "text-danger" : "text-dark"}`}
                          data-testid={`priority-count-${pKey}`}
                        >
                          {count}
                        </span>
                        {getPriorityBadge(pKey)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Urgent Attention Tickets & Recent Actions Log */}
      <div className="row g-3 mb-4">
        {/* Urgent Attention Tickets */}
        <div className="col-12 col-lg-6">
          <div className="zen-card p-4 h-100" data-testid="urgent-attention-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="h6 fw-bold text-dark mb-1">Urgent Attention Queue</h3>
                <p className="text-muted small mb-0">High-priority or critical open items requiring rapid response</p>
              </div>
            </div>

            {urgentAttentionTickets.length === 0 ? (
              <div className="p-4 text-center text-muted border rounded bg-light" data-testid="urgent-attention-empty">
                <span className="me-2">✓</span> No urgent tickets currently pending attention.
              </div>
            ) : (
              <div className="zen-table-container">
                <table className="zen-table">
                  <thead>
                    <tr>
                      <th style={{ width: "150px" }}>Ticket ID</th>
                      <th>Summary</th>
                      <th style={{ width: "110px" }}>Owner</th>
                      <th style={{ width: "110px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urgentAttentionTickets.map((t) => (
                      <tr key={t.id} data-testid={`urgent-ticket-row-${t.id}`}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-success fw-bold text-decoration-none"
                            onClick={() => onSelectTicket?.(t.id)}
                            data-testid={`urgent-ticket-link-${t.id}`}
                          >
                            {t.ticketNumber}
                          </button>
                        </td>
                        <td>
                          <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 220 }}>
                            {t.summary}
                          </div>
                        </td>
                        <td className="small text-muted">{t.ticketOwner}</td>
                        <td>{getStatusBadge(t.currentStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Actions Taken Log */}
        <div className="col-12 col-lg-6">
          <div className="zen-card p-4 h-100" data-testid="recent-actions-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="h6 fw-bold text-dark mb-1">Your Recent Actions Log</h3>
                <p className="text-muted small mb-0">Audit history of interventions you recently recorded</p>
              </div>
            </div>

            {recentActions.length === 0 ? (
              <div className="p-4 text-center text-muted border rounded bg-light" data-testid="recent-actions-empty">
                No recent actions recorded yet. Interventions you log will show here.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="p-3 border rounded bg-white shadow-sm"
                    data-testid={`recent-action-item-${action.id}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-bold text-success text-decoration-none small"
                        onClick={() => onSelectTicket?.(action.ticketId)}
                        data-testid={`action-ticket-link-${action.id}`}
                      >
                        {action.ticketNumber}
                      </button>
                      <span className="text-muted small">
                        {new Date(action.actionDateTime).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="small fw-semibold text-dark mb-1">{action.description}</div>
                    <div className="small text-muted mb-2">{action.result}</div>
                    {action.followUpRequired && (
                      <span className="zg-badge-followup small" data-testid={`action-followup-badge-${action.id}`}>
                        Follow-Up Required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

