import React, { useState, useEffect, useCallback } from "react";
import * as api from "../api.js";
import type { TicketDetailResponse, CommentItem } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { currentRequester } = useRequester();
  const { user } = useAuth();
  const activeRequesterId = user ? user.id : currentRequester?.id;

  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Comments stream state (FR-06 / AC-10)
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Resolution indication state (FR-07 / AC-11)
  const [isIndicatingResolved, setIsIndicatingResolved] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!activeRequesterId) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const data = await api.fetchTicketDetail(ticketId, activeRequesterId);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId, activeRequesterId]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await api.fetchComments(ticketId);
      if (data && Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err: any) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
    loadComments();
  }, [loadTicket, loadComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2000 characters");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const created = await api.postComment(ticketId, trimmed);
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleIndicateResolved = async () => {
    setIsIndicatingResolved(true);
    setResolveError(null);

    try {
      await api.indicateProblemResolved(ticketId);
      if (ticket) {
        setTicket({ ...ticket, resolvedByRequester: true });
      }
      loadComments();
    } catch (err: any) {
      setResolveError(err.message || "Failed to indicate problem resolved");
    } finally {
      setIsIndicatingResolved(false);
    }
  };

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

  const canIndicateResolved =
    !ticket.resolvedByRequester &&
    ticket.currentStatus !== "CLOSED" &&
    ticket.currentStatus !== "CANCELLED";

  return (
    <div data-testid="ticket-detail-view" className="my-2">
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
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {ticket.resolvedByRequester && (
            <span
              className="badge bg-success text-white d-inline-flex align-items-center gap-1"
              data-testid="problem-resolved-badge"
            >
              ✓ Problem Indicated Resolved
            </span>
          )}
          {canIndicateResolved && (
            <button
              type="button"
              data-testid="indicate-resolved-btn"
              className="btn btn-outline-success btn-sm touch-target px-3"
              onClick={handleIndicateResolved}
              disabled={isIndicatingResolved}
            >
              {isIndicatingResolved ? "Updating..." : "✓ Problem Appears Resolved"}
            </button>
          )}
          {renderPriorityBadge(ticket.requestedPriority)}
          {renderStatusBadge(ticket.currentStatus)}
        </div>
      </div>

      {resolveError && (
        <div className="alert alert-danger py-2 small mb-3" data-testid="resolve-error">
          {resolveError}
        </div>
      )}

      {/* Main Read-Only Surface with Zen Green #F0F4F1 background */}
      <div
        className="zen-card p-4 border zen-readonly-surface"
        style={{ backgroundColor: "var(--color-readonly-bg, #f0f4f1)" }}
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
        {activeRequesterId && (
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={activeRequesterId}
            activeAttachments={ticket.attachments || []}
            removedAttachments={ticket.removedAttachments || []}
            onAttachmentChange={loadTicket}
          />
        )}

        {/* Public Comments Stream (FR-06 / AC-10) */}
        <div className="mt-4 pt-4 border-top" data-testid="comments-section">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="h5 fw-bold text-dark mb-0">
              Public Discussion ({comments.length})
            </h3>
            {loadingComments && (
              <span className="spinner-border spinner-border-sm text-success" role="status">
                <span className="visually-hidden">Loading comments...</span>
              </span>
            )}
          </div>

          {/* Comments list */}
          <div className="comments-stream mb-4" data-testid="comments-list">
            {comments.length === 0 ? (
              <p className="text-muted small mb-0 py-2 fst-italic" data-testid="no-comments-msg">
                No comments yet. Start the discussion below.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  data-testid={`comment-item-${comment.id}`}
                  className="p-3 bg-white rounded border mb-2 shadow-sm"
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-dark small" data-testid="comment-author-name">
                        {comment.author?.fullName || "User"}
                      </strong>
                      <span
                        className={`badge ${
                          comment.author?.role === "REQUESTER"
                            ? "zen-badge-role-requester"
                            : comment.author?.role === "ADMIN"
                            ? "zen-badge-role-admin"
                            : "zen-badge-role-staff"
                        }`}
                        data-testid="comment-author-role"
                      >
                        {comment.author?.role === "REQUESTER"
                          ? "Requester"
                          : comment.author?.role === "ADMIN"
                          ? "Admin"
                          : "IT Staff"}
                      </span>
                    </div>
                    <span className="text-muted small" data-testid="comment-timestamp">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p
                    className="mb-0 text-dark small"
                    style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                    data-testid="comment-content"
                  >
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* New Comment Submission Form */}
          <form onSubmit={handlePostComment} data-testid="new-comment-form">
            {commentError && (
              <div className="alert alert-danger py-2 small mb-2" data-testid="comment-error">
                {commentError}
              </div>
            )}
            <div className="mb-2">
              <label htmlFor="new-comment-input" className="form-label small fw-semibold text-muted">
                Post a Public Message
              </label>
              <textarea
                id="new-comment-input"
                data-testid="new-comment-input"
                className="form-control"
                rows={3}
                maxLength={2000}
                placeholder="Type a message or question regarding this ticket..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isSubmittingComment}
                required
              />
              <div className="d-flex justify-content-between mt-1">
                <small className="text-muted">{commentText.length} / 2000 characters</small>
              </div>
            </div>
            <button
              type="submit"
              data-testid="submit-comment-btn"
              className="btn btn-zen-primary btn-sm touch-target px-4"
              disabled={isSubmittingComment || !commentText.trim()}
            >
              {isSubmittingComment ? "Posting..." : "Post Comment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
