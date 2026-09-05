import { useState, useEffect, useCallback } from "react";
import {
  fetchMyTickets,
  fetchCategories,
  type Ticket,
  type Category,
  type Priority,
  type TicketStatus,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface MyTicketsProps {
  onNavigateToCreateTicket?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export default function MyTickets({
  onNavigateToCreateTicket,
  onSelectTicket,
}: MyTicketsProps) {
  const { currentRequester } = useRequester();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Sort & Pagination states
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Load category list for filter dropdown
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories for filter:", err));
  }, []);

  const currentRequesterId = currentRequester?.id;

  // Fetch tickets whenever context or query controls change
  const loadTickets = useCallback(async () => {
    if (!currentRequesterId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchMyTickets({
        requesterId: currentRequesterId,
        search: search.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        requestedPriority: (requestedPriority as Priority) || undefined,
        status: (status as TicketStatus) || undefined,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      });

      if (response && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
        setPagination(
          response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        );
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error("Failed to load tickets:", err);
      setError(err.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [currentRequesterId, search, categoryId, requestedPriority, status, sortBy, sortOrder, page]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const hasActiveFilters = Boolean(
    search.trim() || categoryId || requestedPriority || status
  );

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setStatus("");
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value);
    setPage(1);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRequestedPriority(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (ticketStatus: TicketStatus) => {
    const s = ticketStatus.toLowerCase();
    return (
      <span className={`zen-badge zen-badge-status-${s}`}>
        {ticketStatus.replace("_", " ")}
      </span>
    );
  };

  const renderPriorityBadge = (priority: Priority) => {
    const p = priority.toLowerCase();
    return (
      <span className={`zen-badge zen-badge-priority-${p}`}>
        {priority}
      </span>
    );
  };

  return (
    <div data-testid="my-tickets-container">
      {/* Header bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 text-dark">
            <span style={{ color: "var(--color-primary)" }}>My Support Tickets</span>
          </h1>
          <p className="text-muted small mb-0">
            View, track, and manage all your submitted IT requests
          </p>
        </div>
        {onNavigateToCreateTicket && (
          <button
            type="button"
            className="btn btn-zen-primary touch-target px-3"
            onClick={onNavigateToCreateTicket}
          >
            + New Request
          </button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="zen-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          {/* Keyword Search */}
          <div className="col-12 col-md-4">
            <label htmlFor="ticket-search-input" className="form-label small fw-bold mb-1 text-muted">
              Search Tickets
            </label>
            <input
              id="ticket-search-input"
              data-testid="ticket-search-input"
              type="text"
              className="form-control"
              placeholder="Search by ticket # or summary..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="category-filter-select" className="form-label small fw-bold mb-1 text-muted">
              Category
            </label>
            <select
              id="category-filter-select"
              data-testid="category-filter-select"
              className="form-select"
              value={categoryId}
              onChange={handleCategoryChange}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="priority-filter-select" className="form-label small fw-bold mb-1 text-muted">
              Priority
            </label>
            <select
              id="priority-filter-select"
              data-testid="priority-filter-select"
              className="form-select"
              value={requestedPriority}
              onChange={handlePriorityChange}
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <label htmlFor="status-filter-select" className="form-label small fw-bold mb-1 text-muted">
              Status
            </label>
            <select
              id="status-filter-select"
              data-testid="status-filter-select"
              className="form-select"
              value={status}
              onChange={handleStatusChange}
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="col-6 col-md-2">
            <label htmlFor="sort-by-select" className="form-label small fw-bold mb-1 text-muted">
              Sort By
            </label>
            <div className="input-group">
              <select
                id="sort-by-select"
                data-testid="sort-by-select"
                className="form-select"
                value={sortBy}
                onChange={handleSortByChange}
              >
                <option value="createdAt">Date</option>
                <option value="ticketNumber">Ticket #</option>
                <option value="summary">Summary</option>
                <option value="requestedPriority">Priority</option>
                <option value="currentStatus">Status</option>
              </select>
              <button
                type="button"
                data-testid="sort-order-btn"
                className="btn btn-outline-secondary"
                onClick={toggleSortOrder}
                title={sortOrder === "desc" ? "Newest to Oldest (Descending)" : "Oldest to Newest (Ascending)"}
                aria-label="Toggle sort direction"
              >
                {sortOrder === "desc" ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>

        {/* Clear Filters Action */}
        {hasActiveFilters && (
          <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Filtering active results
            </span>
            <button
              type="button"
              data-testid="clear-filters-btn"
              className="btn btn-sm btn-outline-secondary touch-target px-3"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error loading tickets:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-5 zen-card mb-4" data-testid="loading-indicator">
          <div className="spinner-border text-success mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted small mb-0">Loading your tickets...</p>
        </div>
      )}

      {/* Content Area */}
      {!loading && !error && (
        <>
          {/* Dual Empty States (AC-11) */}
          {tickets.length === 0 && (
            <div className="zen-card p-5 text-center my-4">
              {hasActiveFilters ? (
                /* State B: Filters active but 0 matches */
                <div data-testid="no-results-state">
                  <div className="mb-3">
                    <span className="fs-1 text-muted">🔍</span>
                  </div>
                  <h4 className="h5 fw-bold text-dark mb-2">No Matching Tickets Found</h4>
                  <p className="text-muted mb-4" style={{ maxWidth: 450, margin: "0 auto" }}>
                    No tickets match your search or filter criteria. Try clearing search keywords or selecting different filter options.
                  </p>
                  <button
                    type="button"
                    data-testid="clear-filters-btn-empty"
                    className="btn btn-zen-secondary touch-target px-4"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                /* State A: Total queue empty */
                <div data-testid="empty-queue-state">
                  <div className="mb-3">
                    <span className="fs-1" style={{ color: "var(--color-primary)" }}>📋</span>
                  </div>
                  <h4 className="h5 fw-bold text-dark mb-2">Empty Ticket Queue</h4>
                  <p className="text-muted mb-4" style={{ maxWidth: 450, margin: "0 auto" }}>
                    You have not submitted any support tickets yet. Need IT help? Submit your first request below.
                  </p>
                  {onNavigateToCreateTicket && (
                    <button
                      type="button"
                      data-testid="create-ticket-cta-btn"
                      className="btn btn-zen-primary touch-target px-4"
                      onClick={onNavigateToCreateTicket}
                    >
                      + File New Request
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tickets List */}
          {tickets.length > 0 && (
            <>
              {/* Desktop Data Table (>= 768px) */}
              <div className="d-none d-md-block zen-table-container mb-4" data-testid="ticket-table">
                <table className="zen-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: "16%" }}>Ticket #</th>
                      <th scope="col" style={{ width: "16%" }}>Date</th>
                      <th scope="col" style={{ width: "15%" }}>Category</th>
                      <th scope="col" style={{ width: "15%" }}>System</th>
                      <th scope="col" style={{ width: "10%" }}>Priority</th>
                      <th scope="col" style={{ width: "12%" }}>Status</th>
                      <th scope="col">Summary</th>
                      <th scope="col" style={{ width: "8%" }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} data-testid={`ticket-row-${ticket.ticketNumber}`}>
                        <td>
                          <span className="fw-bold font-monospace" style={{ color: "var(--color-primary)" }}>
                            {ticket.ticketNumber}
                          </span>
                        </td>
                        <td className="text-muted small">{formatDate(ticket.createdAt)}</td>
                        <td>{ticket.category?.name || "General"}</td>
                        <td>{ticket.relatedSystem?.name || "None"}</td>
                        <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                        <td>{renderStatusBadge(ticket.currentStatus)}</td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: 260 }} title={ticket.summary}>
                            {ticket.summary}
                          </div>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success touch-target"
                            onClick={() => onSelectTicket?.(ticket.id)}
                            title="View Ticket Details"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View (< 768px) */}
              <div className="d-md-none mb-4" data-testid="ticket-cards-list">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="zen-ticket-card"
                    data-testid={`ticket-card-${ticket.ticketNumber}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold font-monospace" style={{ color: "var(--color-primary)" }}>
                        {ticket.ticketNumber}
                      </span>
                      <div>{renderStatusBadge(ticket.currentStatus)}</div>
                    </div>

                    <h6 className="fw-bold text-dark mb-2">{ticket.summary}</h6>

                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3 text-muted small">
                      <span>🏷️ {ticket.category?.name || "General"}</span>
                      <span>•</span>
                      <span>💻 {ticket.relatedSystem?.name || "None"}</span>
                      <span>•</span>
                      <span>{renderPriorityBadge(ticket.requestedPriority)}</span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <span className="text-muted small">{formatDate(ticket.createdAt)}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-zen-secondary touch-target px-3"
                        onClick={() => onSelectTicket?.(ticket.id)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls (AC-10) */}
              <div className="zen-card p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="text-muted small" data-testid="pagination-info">
                  Showing{" "}
                  <strong>
                    {(pagination.page - 1) * pagination.limit + 1}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong>{" "}
                  of <strong>{pagination.total}</strong> tickets
                  {pagination.totalPages > 1 && (
                    <span> (Page {pagination.page} of {pagination.totalPages})</span>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    data-testid="pagination-prev-btn"
                    className="btn btn-sm btn-outline-secondary zen-pagination-btn"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    data-testid="pagination-next-btn"
                    className="btn btn-sm btn-outline-secondary zen-pagination-btn"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
