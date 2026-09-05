import { useState, useEffect, useCallback } from "react";
import * as api from "../api.js";
import type { TicketDetailResponse } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import AttachmentSection from "./AttachmentSection.js";

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { currentRequester } = useRequester();
  const requesterId = currentRequester?.id;
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadTicket = useCallback(async () => {
    if (!requesterId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.fetchTicketDetail(ticketId, requesterId);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId, requesterId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  function renderPriorityBadge(priority: string) {
    const classMap: Record<string, string> = {
      LOW: "zen-badge-priority-low",
      MEDIUM: "zen-badge-priority-medium",
      HIGH: "zen-badge-priority-high",
      URGENT: "zen-badge-priority-urgent",
    };
    return (
      <span className={`badge ${classMap[priority] || "bg-secondary"}`}>
        {priority}
      </span>
    );
  }

  function renderStatusBadge(status: string) {
    const classMap: Record<string, string> = {
      NEW: "zen-badge-status-new",
      IN_PROGRESS: "zen-badge-status-in-progress",
      RESOLVED: "zen-badge-status-resolved",
      CLOSED: "zen-badge-status-closed",
      CANCELLED: "zen-badge-status-cancelled",
    };
    return (
      <span className={`badge ${classMap[status] || "bg-secondary"}`}>
        {status}
      </span>
    );
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="zen-card p-5 text-center my-4" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-card p-4 my-4" data-testid="ticket-detail-error">
        <div className="alert alert-danger mb-3" role="alert">
          <strong>Error:</strong> {error || "Ticket not found or inaccessible."}
        </div>
        <button
          type="button"
          className="btn btn-zen-secondary touch-target"
          onClick={onBack}
        >
          ← Back to Ticket List
        </button>
      </div>
    );
  }

  return (
    <div data-testid="ticket-detail-container" className="my-2">
      {/* Navigation & Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <button
          type="button"
          data-testid="back-to-tickets-btn"
          className="btn btn-outline-secondary btn-sm touch-target px-3"
          onClick={onBack}
        >
          ← Back to Ticket List
        </button>
        <div className="d-flex align-items-center gap-2">
          {renderPriorityBadge(ticket.requestedPriority)}
          {renderStatusBadge(ticket.currentStatus)}
        </div>
      </div>

      {/* Main Read-Only Surface with Zen Green #F0F4F1 background */}
      <div
        className="zen-card p-4 border"
        style={{ backgroundColor: "var(--color-bg-page, #F0F4F1)" }}
        data-testid="ticket-detail-card"
      >
        {/* Title & Number */}
        <div className="border-bottom pb-3 mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <span
              className="font-monospace fw-bold fs-4"
              style={{ color: "var(--color-primary)" }}
              data-testid="ticket-number-display"
            >
              {ticket.ticketNumber}
            </span>
            <small className="text-muted">
              Submitted: {formatDate(ticket.createdAt)}
            </small>
          </div>
          <h2 className="h4 fw-bold text-dark mt-2 mb-1" data-testid="ticket-summary-display">
            {ticket.summary}
          </h2>
        </div>

        {/* Metadata Grid */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="p-2 bg-white rounded border">
              <span className="text-muted small fw-bold d-block text-uppercase">Category</span>
              <span className="fw-semibold text-dark">{ticket.category?.name || "General"}</span>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="p-2 bg-white rounded border">
              <span className="text-muted small fw-bold d-block text-uppercase">Related System</span>
              <span className="fw-semibold text-dark">{ticket.relatedSystem?.name || "None"}</span>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="p-2 bg-white rounded border">
              <span className="text-muted small fw-bold d-block text-uppercase">Assigned Owner</span>
              <span className="fw-semibold text-secondary">{ticket.ticketOwner || "Unassigned"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 bg-white p-3 rounded border">
          <h6 className="text-muted small fw-bold text-uppercase mb-2">Description</h6>
          <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }} data-testid="ticket-description-display">
            {ticket.description}
          </p>
        </div>

        {/* Requester Context Pill */}
        {ticket.requester && (
          <div className="p-3 bg-white rounded border mb-3 d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <span className="text-muted small d-block">Requester:</span>
              <strong className="text-dark">{ticket.requester.fullName}</strong>
              <span className="badge bg-light text-success border ms-2">
                {ticket.requester.department}
              </span>
            </div>
            <div className="text-muted small">
              Contact: {ticket.requester.email}
            </div>
          </div>
        )}

        {/* Governed Attachment Lifecycle Section */}
        {currentRequester && (
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={currentRequester.id}
            activeAttachments={ticket.attachments || []}
            removedAttachments={ticket.removedAttachments || []}
            onAttachmentChange={loadTicket}
          />
        )}
      </div>
    </div>
  );
}
