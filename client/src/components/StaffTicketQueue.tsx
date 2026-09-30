import React, { useState, useEffect, useCallback } from "react";
import {
  fetchStaffTickets,
  fetchCategories,
  type StaffTicketItem,
  type Category,
  type Priority,
  type TicketStatus,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

export default function StaffTicketQueue({ onSelectTicket }: StaffTicketQueueProps) {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter states
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [assigned, setAssigned] = useState<"all" | "unassigned" | "me">("all");

  // Sorting & pagination states
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  // Load category list for filter dropdown
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Fetch tickets whenever filter/sort/pagination states change
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffTickets({
        search: search.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        priority: (priority as Priority) || undefined,
        status: (status as TicketStatus) || undefined,
        assigned,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });

      if (response && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize || response.pagination.limit || 10,
          totalRecords: response.pagination.totalRecords !== undefined ? response.pagination.totalRecords : response.pagination.total,
          totalPages: response.pagination.totalPages || 1,
        });
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error("Failed to load staff tickets:", err);
      setError(err.message || "Failed to load operational queue");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, priority, status, assigned, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const hasActiveFilters = Boolean(
    search.trim() || categoryId || priority || status || assigned !== "all"
  );

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setPriority("");
    setStatus("");
    setAssigned("all");
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return <span className="ms-1">{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  const getPriorityBadgeClass = (p: Priority) => {
    switch (p) {
      case "URGENT":
        return "badge bg-danger text-white";
      case "HIGH":
        return "badge text-white";
      case "MEDIUM":
        return "badge text-dark";
      case "LOW":
      default:
        return "badge bg-light text-muted border";
    }
  };

  const getPriorityStyle = (p: Priority) => {
    if (p === "HIGH") return { backgroundColor: "var(--color-warning, #d97706)" };
    if (p === "MEDIUM") return { backgroundColor: "var(--color-pale-green, #eaf6ef)", color: "var(--color-primary, #006b3c)" };
    return {};
  };

  const getStatusBadgeClass = (s: TicketStatus) => {
    switch (s) {
      case "NEW":
        return "badge bg-info text-dark";
      case "OPEN":
        return "badge bg-primary text-white";
      case "IN_PROGRESS":
        return "badge bg-warning text-dark";
      case "WAITING_FOR_REQUESTER":
        return "badge bg-secondary text-white";
      case "RESOLVED":
        return "badge bg-success text-white";
      case "CLOSED":
        return "badge bg-dark text-white";
      case "REOPENED":
        return "badge bg-danger text-white";
      case "CANCELLED":
        return "badge bg-light text-muted border";
      default:
        return "badge bg-light text-dark";
    }
  };

  return (
    <div className="staff-ticket-queue" data-testid="staff-ticket-queue">
      {/* Header with Title and Quick Counter */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 mb-1 fw-bold text-dark">IT Staff Ticket Queue</h2>
          <p className="text-muted small mb-0">
            Operational service desk queue across all departments and systems
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
          <span className="badge px-3 py-2" style={{ backgroundColor: "var(--color-pale-green, #eaf6ef)", color: "var(--color-primary, #006b3c)", fontSize: "0.875rem" }}>
            Total Tickets: {pagination.totalRecords}
          </span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="zen-card p-3 mb-4">
        <div className="row g-2 align-items-end">
          {/* Keyword Search */}
          <div className="col-12 col-md-4">
            <label htmlFor="staff-search-input" className="form-label small fw-semibold text-muted mb-1">
              Search
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                </svg>
              </span>
              <input
                id="staff-search-input"
                type="text"
                data-testid="staff-queue-search"
                className="form-control border-start-0"
                placeholder="Search ticket # or summary..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="staff-category-select" className="form-label small fw-semibold text-muted mb-1">
              Category
            </label>
            <select
              id="staff-category-select"
              data-testid="staff-queue-category"
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* IT Priority Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="staff-priority-select" className="form-label small fw-semibold text-muted mb-1">
              Priority
            </label>
            <select
              id="staff-priority-select"
              data-testid="staff-queue-priority"
              className="form-select"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="staff-status-select" className="form-label small fw-semibold text-muted mb-1">
              Status
            </label>
            <select
              id="staff-status-select"
              data-testid="staff-queue-status"
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Assignment Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="staff-assigned-select" className="form-label small fw-semibold text-muted mb-1">
              Assignment
            </label>
            <select
              id="staff-assigned-select"
              data-testid="staff-queue-assigned"
              className="form-select"
              value={assigned}
              onChange={(e) => {
                setAssigned(e.target.value as "all" | "unassigned" | "me");
                setPage(1);
              }}
            >
              <option value="all">All Tickets</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {hasActiveFilters && (
          <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">Active filters applied</span>
            <button
              type="button"
              data-testid="clear-filters-btn"
              className="btn btn-sm btn-link text-danger text-decoration-none p-0"
              onClick={handleClearFilters}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4" role="alert">
          <div>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="zen-card p-5 text-center" data-testid="staff-queue-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading operational queue...</span>
          </div>
          <p className="mt-2 text-muted small">Loading ticket queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty / No-Results States */
        <div
          className="zen-card p-5 text-center"
          data-testid={hasActiveFilters ? "no-results-state" : "empty-queue-state"}
        >
          <div className="fs-1 mb-2">📋</div>
          <h5 className="fw-bold text-dark">
            {hasActiveFilters ? "No tickets match your filter criteria" : "No tickets in the queue"}
          </h5>
          <p className="text-muted small mb-3">
            {hasActiveFilters
              ? "Try adjusting or clearing your search and filter options."
              : "There are currently no tickets submitted to the IT service desk."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              data-testid="reset-filters-cta"
              className="btn btn-zen-primary touch-target px-4"
              onClick={handleClearFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View (>= 768px) */}
          <div className="d-none d-md-block zen-card overflow-hidden mb-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="staff-tickets-table">
                <thead style={{ backgroundColor: "var(--color-pale-green, #eaf6ef)" }}>
                  <tr>
                    <th
                      scope="col"
                      className="user-select-none cursor-pointer"
                      onClick={() => handleSort("ticketNumber")}
                      data-testid="sort-ticketNumber"
                    >
                      Ticket # {renderSortIndicator("ticketNumber")}
                    </th>
                    <th
                      scope="col"
                      className="user-select-none cursor-pointer"
                      onClick={() => handleSort("createdAt")}
                      data-testid="sort-createdAt"
                    >
                      Date {renderSortIndicator("createdAt")}
                    </th>
                    <th scope="col">Requester</th>
                    <th
                      scope="col"
                      className="user-select-none cursor-pointer"
                      onClick={() => handleSort("summary")}
                      data-testid="sort-summary"
                    >
                      Summary {renderSortIndicator("summary")}
                    </th>
                    <th scope="col">Category</th>
                    <th scope="col">System</th>
                    <th
                      scope="col"
                      className="user-select-none cursor-pointer"
                      onClick={() => handleSort("priority")}
                      data-testid="sort-priority"
                    >
                      Priority {renderSortIndicator("priority")}
                    </th>
                    <th
                      scope="col"
                      className="user-select-none cursor-pointer"
                      onClick={() => handleSort("status")}
                      data-testid="sort-status"
                    >
                      Status {renderSortIndicator("status")}
                    </th>
                    <th scope="col">Assigned To</th>
                    <th scope="col" className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      data-testid={`staff-ticket-row-${ticket.id}`}
                      style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                      onClick={() => onSelectTicket?.(ticket.id)}
                    >
                      <td className="fw-bold font-monospace text-nowrap" style={{ color: "var(--color-primary, #006b3c)" }}>
                        {ticket.ticketNumber}
                      </td>
                      <td className="small text-muted text-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{ticket.requesterName}</div>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: 260 }} title={ticket.summary}>
                          {ticket.summary}
                        </div>
                      </td>
                      <td className="text-nowrap">{ticket.categoryName}</td>
                      <td className="text-nowrap text-muted small">{ticket.relatedSystemName || "—"}</td>
                      <td>
                        <span
                          className={getPriorityBadgeClass(ticket.itPriority || ticket.priority)}
                          style={getPriorityStyle(ticket.itPriority || ticket.priority)}
                        >
                          {ticket.itPriority || ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(ticket.status)}>
                          {ticket.status.replace(/_/g, " ")}
                        </span>
                        {ticket.resolvedByRequester && (
                          <span
                            className="badge bg-light text-success border ms-1"
                            title="Requester indicated problem resolved"
                          >
                            ✓ Requester OK
                          </span>
                        )}
                      </td>
                      <td>
                        {ticket.assignedOwnerName ? (
                          <span className="badge bg-light text-dark border">
                            👤 {ticket.assignedOwnerName}
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          type="button"
                          data-testid={`view-ticket-${ticket.id}`}
                          className="btn btn-sm btn-outline-success touch-target px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket?.(ticket.id);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards View (< 768px) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-4" data-testid="staff-tickets-mobile">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="zen-card p-3"
                data-testid={`staff-ticket-card-${ticket.id}`}
                onClick={() => onSelectTicket?.(ticket.id)}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="fw-bold font-monospace" style={{ color: "var(--color-primary, #006b3c)" }}>
                    {ticket.ticketNumber}
                  </span>
                  <div className="d-flex gap-1 flex-wrap">
                    <span
                      className={getPriorityBadgeClass(ticket.itPriority || ticket.priority)}
                      style={getPriorityStyle(ticket.itPriority || ticket.priority)}
                    >
                      {ticket.itPriority || ticket.priority}
                    </span>
                    <span className={getStatusBadgeClass(ticket.status)}>
                      {ticket.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-1">{ticket.summary}</h6>
                <div className="small text-muted mb-2">
                  <span>Requester: <strong className="text-dark">{ticket.requesterName}</strong></span>
                  <span className="mx-1">•</span>
                  <span>{ticket.categoryName}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div className="small text-muted">
                    {ticket.assignedOwnerName ? (
                      <span>👤 {ticket.assignedOwnerName}</span>
                    ) : (
                      <span className="text-muted fst-italic">Unassigned</span>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid={`mobile-view-ticket-${ticket.id}`}
                    className="btn btn-sm btn-zen-primary touch-target px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTicket?.(ticket.id);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Toolbar */}
          <div className="zen-card p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="small text-muted" data-testid="pagination-summary">
              Showing{" "}
              <strong>
                {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.totalRecords)}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
              </strong>{" "}
              of <strong>{pagination.totalRecords}</strong> tickets
            </div>

            <div className="d-flex align-items-center gap-2">
              <label htmlFor="staff-pagesize-select" className="small text-muted d-none d-sm-inline">
                Per page:
              </label>
              <select
                id="staff-pagesize-select"
                data-testid="page-size-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>

              <div className="btn-group" role="group" aria-label="Pagination buttons">
                <button
                  type="button"
                  data-testid="pagination-prev"
                  className="btn btn-sm btn-outline-secondary touch-target px-3"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="btn btn-sm btn-outline-secondary disabled px-3">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  data-testid="pagination-next"
                  className="btn btn-sm btn-outline-secondary touch-target px-3"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
