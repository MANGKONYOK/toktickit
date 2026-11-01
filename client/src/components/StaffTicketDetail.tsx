import React, { useState, useEffect, useCallback } from "react";
import * as api from "../api.js";
import type { StaffTicketDetail as StaffTicketDetailType, Priority, TicketStatus } from "../api.js";
import { useAuth } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export default function StaffTicketDetail({ ticketId, onBack }: StaffTicketDetailProps) {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionSuccess, setActionSuccess] = useState<string>("");

  // Operational controls state
  const [targetStatus, setTargetStatus] = useState<TicketStatus | "">("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);

  // Public comments state
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal notes state
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    setError("");
    try {
      const data = await api.fetchStaffTicketDetail(ticketId);
      setTicket(data.ticket);
      const allowed = ALLOWED_TRANSITIONS[data.ticket.currentStatus] || [];
      setTargetStatus(allowed.length > 0 ? allowed[0] : "");
    } catch (err: any) {
      setError(err.message || "Failed to load staff ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  // Ownership Claim / Unassign
  const handleAssignOwner = async (ownerId: number | null) => {
    if (!ticket) return;
    setIsUpdatingAssignee(true);
    setError("");
    try {
      const res = await api.assignTicketOwner(ticket.id, ownerId);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ticketOwnerId: res.ticket.ticketOwnerId,
              assignedOwnerName: res.ticket.assignedOwnerName,
              ticketOwner: res.ticket.assignedOwnerName || "Unassigned",
            }
          : null
      );
      showSuccessNotice(res.message || "Ownership updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update ownership.");
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // IT Priority Modification
  const handlePriorityChange = async (newPriority: Priority) => {
    if (!ticket || newPriority === ticket.itPriority) return;
    setIsUpdatingPriority(true);
    setError("");
    try {
      const res = await api.updateTicketPriority(ticket.id, newPriority);
      setTicket((prev) => (prev ? { ...prev, itPriority: res.ticket.itPriority } : null));
      showSuccessNotice("Operational IT Priority updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update IT Priority.");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Governed Status Transition
  const handleStatusTransition = async () => {
    if (!ticket || !targetStatus) return;
    setIsUpdatingStatus(true);
    setError("");
    try {
      const res = await api.transitionTicketStatus(ticket.id, targetStatus);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: res.ticket.currentStatus,
              status: res.ticket.status,
            }
          : null
      );
      const nextAllowed = ALLOWED_TRANSITIONS[res.ticket.currentStatus] || [];
      setTargetStatus(nextAllowed.length > 0 ? nextAllowed[0] : "");
      showSuccessNotice(`Status transitioned to ${res.ticket.status}.`);
    } catch (err: any) {
      setError(err.message || "Failed to transition status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Public Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await api.addComment(ticket.id, commentText.trim());
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, res.comment],
            }
          : null
      );
      setCommentText("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit Private Internal Note
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !noteText.trim()) return;

    setIsSubmittingNote(true);
    setNoteError(null);
    try {
      const res = await api.createInternalNote(ticket.id, noteText.trim());
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              internalNotes: [...prev.internalNotes, res.note],
            }
          : null
      );
      setNoteText("");
      showSuccessNotice("Confidential internal note added.");
    } catch (err: any) {
      setNoteError(err.message || "Failed to add internal note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case "URGENT":
        return { backgroundColor: "#FCE8E6", color: "#C5221F", fontWeight: 700 };
      case "HIGH":
        return { backgroundColor: "#FEF3D6", color: "#B06000", fontWeight: 600 };
      case "MEDIUM":
        return { backgroundColor: "#E6F4EA", color: "#137333", fontWeight: 500 };
      case "LOW":
        return { backgroundColor: "#F1F3F4", color: "#5F6368", fontWeight: 500 };
    }
  };

  const getStatusBadgeClass = (s: TicketStatus) => {
    switch (s) {
      case "NEW":
        return "badge bg-primary";
      case "OPEN":
        return "badge bg-info text-dark";
      case "IN_PROGRESS":
        return "badge bg-warning text-dark";
      case "WAITING_FOR_REQUESTER":
        return "badge bg-secondary";
      case "RESOLVED":
        return "badge bg-success";
      case "CLOSED":
        return "badge bg-dark";
      case "REOPENED":
        return "badge bg-danger";
      case "CANCELLED":
        return "badge bg-light text-muted border";
      default:
        return "badge bg-secondary";
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="staff-detail-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket...</span>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="zen-card p-4 my-4" data-testid="staff-detail-error">
        <div className="alert alert-danger mb-3">{error}</div>
        <button
          type="button"
          className="btn btn-outline-secondary touch-target"
          onClick={onBack}
          data-testid="back-to-queue-btn"
        >
          ← Back to Queue
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  const allowedTransitions = ALLOWED_TRANSITIONS[ticket.currentStatus] || [];
  const isTerminal = allowedTransitions.length === 0;

  return (
    <div className="staff-ticket-detail-view" data-testid="staff-ticket-detail">
      {/* Top Navigation Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm touch-target"
          onClick={onBack}
          data-testid="back-to-queue-btn"
        >
          ← Back to Ticket Queue
        </button>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Operational View</span>
          <span className="badge bg-light text-success border">IT Staff Portal</span>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="alert alert-success d-flex align-items-center mb-3 py-2 px-3" role="alert">
          <span className="me-2">✓</span> {actionSuccess}
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-3 py-2 px-3" role="alert">
          <span className="me-2">⚠️</span> {error}
        </div>
      )}

      {/* Ticket Header & Status Hero */}
      <div className="zen-card p-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h3 className="mb-0 fw-bold font-monospace" style={{ color: "var(--color-primary, #006b3c)" }}>
                {ticket.ticketNumber}
              </h3>
              <span className={getStatusBadgeClass(ticket.currentStatus)}>
                {ticket.currentStatus.replace(/_/g, " ")}
              </span>
              {ticket.resolvedByRequester && (
                <span className="badge bg-light text-success border" title="Requester indicated problem resolved">
                  ✓ Requester OK
                </span>
              )}
            </div>
            <h4 className="fw-semibold text-dark mb-0">{ticket.summary}</h4>
          </div>
          <div className="text-md-end text-muted small">
            <div>Created: {new Date(ticket.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(ticket.updatedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Operational Controls Toolbar */}
        <div className="border rounded p-3 bg-light mb-3" data-testid="operational-controls-toolbar">
          <h6 className="fw-bold mb-3" style={{ color: "var(--color-primary, #006b3c)" }}>
            ⚙️ Operational Controls
          </h6>
          <div className="row g-3 align-items-end">
            {/* 1. Ownership Control */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">Assigned IT Owner</label>
              <div className="d-flex gap-2 align-items-center">
                <span className="badge bg-white text-dark border p-2 flex-grow-1 text-truncate" data-testid="current-assignee-badge">
                  👤 {ticket.assignedOwnerName || "Unassigned"}
                </span>
                {user && ticket.ticketOwnerId !== user.id && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success touch-target"
                    onClick={() => handleAssignOwner(user.id)}
                    disabled={isUpdatingAssignee}
                    data-testid="claim-ownership-btn"
                  >
                    Claim
                  </button>
                )}
                {ticket.ticketOwnerId !== null && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary touch-target"
                    onClick={() => handleAssignOwner(null)}
                    disabled={isUpdatingAssignee}
                    data-testid="unassign-ownership-btn"
                  >
                    Unassign
                  </button>
                )}
              </div>
            </div>

            {/* 2. IT Operational Priority Modifier */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">
                Operational IT Priority (Requested: {ticket.requestedPriority})
              </label>
              <select
                className="form-select form-select-sm touch-target"
                value={ticket.itPriority}
                onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                disabled={isUpdatingPriority}
                data-testid="it-priority-select"
                style={getPriorityStyle(ticket.itPriority)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            {/* 3. Governed Status Transition */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">
                Advance Status (BR-14 State Machine)
              </label>
              {isTerminal ? (
                <div className="badge bg-secondary p-2 w-100 text-center" data-testid="terminal-status-notice">
                  Terminal State ({ticket.currentStatus})
                </div>
              ) : (
                <div className="input-group input-group-sm">
                  <select
                    className="form-select touch-target"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
                    disabled={isUpdatingStatus}
                    data-testid="status-transition-select"
                  >
                    {allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-success touch-target px-3"
                    onClick={handleStatusTransition}
                    disabled={isUpdatingStatus || !targetStatus}
                    data-testid="apply-status-btn"
                  >
                    {isUpdatingStatus ? "Updating..." : "Transition"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticket Metadata Grid */}
        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-3">
            <div className="p-2 border rounded bg-white">
              <span className="text-muted small d-block">Requester</span>
              <strong className="text-dark">{ticket.requester.fullName}</strong>
              <div className="small text-muted text-truncate">{ticket.requester.email}</div>
              {ticket.requester.department && (
                <span className="badge bg-light text-secondary border mt-1">
                  {ticket.requester.department}
                </span>
              )}
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="p-2 border rounded bg-white">
              <span className="text-muted small d-block">Category</span>
              <strong className="text-dark">{ticket.category.name}</strong>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="p-2 border rounded bg-white">
              <span className="text-muted small d-block">Related System</span>
              <strong className="text-dark">{ticket.relatedSystem.name}</strong>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="p-2 border rounded bg-white">
              <span className="text-muted small d-block">Requested Priority</span>
              <span className="badge mt-1" style={getPriorityStyle(ticket.requestedPriority)}>
                {ticket.requestedPriority}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Description */}
        <div className="mt-3 p-3 rounded" style={{ backgroundColor: "#F0F4F1" }}>
          <h6 className="fw-bold mb-2" style={{ color: "var(--color-primary, #006b3c)" }}>
            Description
          </h6>
          <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="zen-card p-4 mb-4">
        <AttachmentSection
          ticketId={ticket.id}
          requesterId={ticket.requester.id}
          activeAttachments={(ticket.attachments || []).filter((a) => !a.removedAt) as any}
          removedAttachments={(ticket.attachments || []).filter((a) => !!a.removedAt) as any}
          onAttachmentChange={loadTicket}
        />
      </div>

      {/* Discussion Streams: Public Comments & Confidential Internal Notes */}
      <div className="row g-4 mb-4">
        {/* Public Comments Column */}
        <div className="col-12 col-lg-6">
          <div className="zen-card p-4 h-100 d-flex flex-column" data-testid="public-comments-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark">
                💬 Public Comments ({ticket.comments.length})
              </h5>
              <span className="text-muted small">Visible to Requester & Staff</span>
            </div>

            <div className="flex-grow-1 overflow-auto pe-1 mb-3" style={{ maxHeight: 350 }}>
              {ticket.comments.length === 0 ? (
                <div className="text-center py-4 text-muted small bg-light rounded">
                  No public comments on this ticket yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="p-3 border rounded bg-light" data-testid={`public-comment-${comment.id}`}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-1">
                          <strong className="small text-dark">{comment.authorName}</strong>
                          <span
                            className={`badge ${
                              comment.authorRole === "REQUESTER"
                                ? "bg-info text-dark"
                                : comment.authorRole === "ADMIN"
                                ? "bg-danger text-white"
                                : "bg-success text-white"
                            }`}
                            style={{ fontSize: "0.65rem" }}
                          >
                            {comment.authorRole}
                          </span>
                        </div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mb-0 text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Compose Box */}
            <form onSubmit={handleCommentSubmit} className="mt-auto">
              {commentError && <div className="alert alert-danger py-1 px-2 small mb-2">{commentError}</div>}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Post a public message visible to requester..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={2000}
                  data-testid="public-comment-input"
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">{commentText.length}/2000</span>
                <button
                  type="submit"
                  className="btn btn-sm btn-outline-success touch-target"
                  disabled={isSubmittingComment || !commentText.trim()}
                  data-testid="submit-public-comment-btn"
                >
                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Private Internal Notes Column (Shaded Amber per Spec 7.1) */}
        <div className="col-12 col-lg-6">
          <div
            className="zen-card p-4 h-100 d-flex flex-column"
            style={{
              backgroundColor: "#FFF8E1",
              borderColor: "#FFE082",
            }}
            data-testid="internal-notes-panel"
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: "#78350F" }}>
                🔒 Internal Notes ({ticket.internalNotes.length})
              </h5>
              <span className="badge bg-warning text-dark border">
                Confidential — Staff Only
              </span>
            </div>
            <p className="small mb-3" style={{ color: "#92400E" }}>
              Private notes are never visible to Requesters. Use for troubleshooting logs, vendor tickets, or internal handoffs.
            </p>

            <div className="flex-grow-1 overflow-auto pe-1 mb-3" style={{ maxHeight: 350 }}>
              {ticket.internalNotes.length === 0 ? (
                <div className="text-center py-4 text-muted small bg-white rounded border">
                  No internal notes recorded yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {ticket.internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 border rounded bg-white shadow-sm"
                      data-testid={`internal-note-${note.id}`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-1">
                          <strong className="small text-dark">{note.authorName}</strong>
                          <span
                            className={`badge ${
                              note.authorRole === "ADMIN" ? "bg-danger text-white" : "bg-dark text-white"
                            }`}
                            style={{ fontSize: "0.65rem" }}
                          >
                            {note.authorRole}
                          </span>
                        </div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mb-0 text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal Note Compose Box */}
            <form onSubmit={handleNoteSubmit} className="mt-auto">
              {noteError && <div className="alert alert-danger py-1 px-2 small mb-2">{noteError}</div>}
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm bg-white"
                  rows={2}
                  placeholder="Record confidential operational notes, diagnostics, root-cause details..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={2000}
                  data-testid="internal-note-input"
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">{noteText.length}/2000</span>
                <button
                  type="submit"
                  className="btn btn-sm btn-warning text-dark fw-semibold touch-target shadow-sm"
                  disabled={isSubmittingNote || !noteText.trim()}
                  data-testid="submit-internal-note-btn"
                >
                  {isSubmittingNote ? "Saving Note..." : "Save Internal Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
