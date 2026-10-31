import React, { useState } from "react";
import { ActionTaken, createTicketAction, updateTicketAction } from "../api";

interface ActionsTakenSectionProps {
  ticketId: number;
  actions: ActionTaken[];
  readOnly?: boolean;
  isTicketTerminal?: boolean;
  currentUserName?: string;
  onActionAdded?: (action: ActionTaken) => void;
  onActionUpdated?: (action: ActionTaken) => void;
}

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  actions,
  readOnly = false,
  isTicketTerminal = false,
  currentUserName = "IT Staff",
  onActionAdded,
  onActionUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);

  // Form states
  const [actionDateTime, setActionDateTime] = useState<string>(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setActionDateTime(new Date().toISOString().slice(0, 16));
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFieldErrors({});
    setGeneralError(null);
    setEditingActionId(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (action: ActionTaken) => {
    resetForm();
    setEditingActionId(action.id);
    setActionDateTime(
      action.actionDateTime
        ? new Date(action.actionDateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );
    setDescription(action.description);
    setResult(action.result);
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || "");
    setAttachmentNotes(action.attachmentNotes || "");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSetCurrentTime = () => {
    setActionDateTime(new Date().toISOString().slice(0, 16));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!description.trim()) {
      errors.description = "Action description is required (1-2000 characters)";
    } else if (description.trim().length > 2000) {
      errors.description = "Action description cannot exceed 2000 characters";
    }

    if (!result.trim()) {
      errors.result = "Action result is required (1-2000 characters)";
    } else if (result.trim().length > 2000) {
      errors.result = "Action result cannot exceed 2000 characters";
    }

    if (followUpRequired) {
      if (!followUpNote.trim()) {
        errors.followUpNote =
          "Follow-up note is required when follow-up is needed (1-1000 characters)";
      } else if (followUpNote.trim().length > 1000) {
        errors.followUpNote = "Follow-up note cannot exceed 1000 characters";
      }
    }

    if (attachmentNotes.trim().length > 1000) {
      errors.attachmentNotes = "Attachment notes cannot exceed 1000 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const payload = {
      actionDateTime: actionDateTime
        ? new Date(actionDateTime).toISOString()
        : new Date().toISOString(),
      description: description.trim(),
      result: result.trim(),
      followUpRequired,
      followUpNote: followUpRequired ? followUpNote.trim() : null,
      attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
    };

    try {
      if (editingActionId !== null) {
        const res = await updateTicketAction(ticketId, editingActionId, payload);
        if (onActionUpdated) {
          onActionUpdated(res.action);
        }
      } else {
        const res = await createTicketAction(ticketId, payload);
        if (onActionAdded) {
          onActionAdded(res.action);
        }
      }
      handleCloseModal();
    } catch (err: any) {
      setGeneralError(err.message || "Failed to save action taken");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime())
        ? isoString
        : d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="actions-taken-container" style={{ marginTop: "1.5rem" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--zg-text-main, #0f172a)",
              margin: 0,
            }}
          >
            Actions Taken
          </h3>
          <span
            data-testid="actions-count-badge"
            style={{
              backgroundColor: "var(--zg-primary-light, #d8f3dc)",
              color: "var(--zg-primary, #1b4332)",
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "0.15rem 0.5rem",
              borderRadius: "9999px",
            }}
          >
            {actions.length}
          </span>
        </div>

        {!readOnly && !isTicketTerminal && (
          <button
            type="button"
            data-testid="record-action-button"
            onClick={handleOpenCreateModal}
            style={{
              backgroundColor: "var(--zg-primary, #1b4332)",
              color: "#ffffff",
              border: "none",
              padding: "0.4rem 0.85rem",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--zg-primary-hover, #2d6a4f)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--zg-primary, #1b4332)")
            }
          >
            <span>+</span> Record Action
          </button>
        )}
      </div>

      {/* Terminal Lock Notice */}
      {isTicketTerminal && (
        <div
          data-testid="terminal-lock-banner"
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "#f1f5f9",
            color: "#475569",
            fontSize: "0.8125rem",
            borderRadius: "0.375rem",
            marginBottom: "0.75rem",
            border: "1px solid #e2e8f0",
          }}
        >
          🔒 Ticket is closed or cancelled. Actions Taken are locked against modification.
        </div>
      )}

      {/* Actions Timeline List */}
      {actions.length === 0 ? (
        <div
          data-testid="empty-actions-notice"
          style={{
            padding: "1.5rem",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            border: "1px dashed var(--zg-border, #e2e8f0)",
            borderRadius: "0.5rem",
            color: "var(--zg-text-muted, #64748b)",
            fontSize: "0.875rem",
          }}
        >
          No actions recorded yet for this ticket.
        </div>
      ) : (
        <div
          className="actions-timeline"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {actions.map((act) => (
            <div
              key={act.id}
              data-testid={`action-card-${act.id}`}
              style={{
                backgroundColor: "var(--zg-action-bg, #ffffff)",
                border: "1px solid var(--zg-action-border, #e2e8f0)",
                borderRadius: "0.5rem",
                padding: "1rem",
                boxShadow: "var(--zg-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))",
              }}
            >
              {/* Card Header: Performer & Timestamp */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    data-testid={`action-performer-${act.id}`}
                    style={{
                      backgroundColor: "var(--zg-action-performer-bg, #e6f4ea)",
                      color: "var(--zg-action-performer-text, #137333)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "0.25rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span>✓</span> {act.performedBy?.fullName || "Staff"}
                    {act.performedBy?.role && (
                      <span
                        style={{
                          opacity: 0.75,
                          fontSize: "0.7rem",
                          fontWeight: 500,
                        }}
                      >
                        ({act.performedBy.role})
                      </span>
                    )}
                  </span>

                  <span
                    data-testid={`action-time-${act.id}`}
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--zg-text-muted, #64748b)",
                    }}
                  >
                    {formatDate(act.actionDateTime)}
                  </span>
                </div>

                {!readOnly && !isTicketTerminal && (
                  <button
                    type="button"
                    data-testid={`edit-action-btn-${act.id}`}
                    onClick={() => handleOpenEditModal(act)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--zg-primary, #1b4332)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "0.2rem 0.4rem",
                      borderRadius: "0.25rem",
                      textDecoration: "underline",
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Action Description */}
              <div style={{ marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--zg-text-muted, #64748b)",
                    display: "block",
                    marginBottom: "0.15rem",
                  }}
                >
                  Action Description:
                </span>
                <p
                  data-testid={`action-desc-${act.id}`}
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--zg-text-main, #0f172a)",
                    margin: 0,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {act.description}
                </p>
              </div>

              {/* Action Result */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.375rem",
                  marginBottom: "0.5rem",
                  borderLeft: "3px solid var(--zg-primary, #1b4332)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--zg-text-muted, #64748b)",
                    display: "block",
                    marginBottom: "0.15rem",
                  }}
                >
                  Result / Outcome:
                </span>
                <p
                  data-testid={`action-result-${act.id}`}
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--zg-text-main, #0f172a)",
                    margin: 0,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {act.result}
                </p>
              </div>

              {/* Follow-Up Badge & Note */}
              <div style={{ marginTop: "0.5rem" }}>
                {act.followUpRequired ? (
                  <div
                    data-testid={`action-followup-container-${act.id}`}
                    style={{
                      backgroundColor: "var(--zg-action-followup-bg, #fff7ed)",
                      border: "1px solid var(--zg-action-followup-border, #fdba74)",
                      borderRadius: "0.375rem",
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <span
                        data-testid={`followup-badge-${act.id}`}
                        style={{
                          backgroundColor: "#ea580c",
                          color: "#ffffff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.4rem",
                          borderRadius: "0.2rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Follow-Up Required
                      </span>
                    </div>
                    {act.followUpNote && (
                      <p
                        data-testid={`action-followup-note-${act.id}`}
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--zg-action-followup-text, #9a3412)",
                          margin: 0,
                        }}
                      >
                        {act.followUpNote}
                      </p>
                    )}
                  </div>
                ) : (
                  <span
                    data-testid={`followup-none-badge-${act.id}`}
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--zg-text-muted, #64748b)",
                      display: "inline-block",
                    }}
                  >
                    No follow-up needed
                  </span>
                )}
              </div>

              {/* Attachment Notes */}
              {act.attachmentNotes && (
                <div
                  data-testid={`action-attachment-notes-${act.id}`}
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--zg-text-muted, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span>📎</span>
                  <span>
                    <strong>Attachment Ref:</strong> {act.attachmentNotes}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog for Record/Edit Action Taken */}
      {isModalOpen && (
        <div
          data-testid="action-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            data-testid="action-modal-content"
            style={{
              backgroundColor: "var(--zg-surface, #ffffff)",
              borderRadius: "0.5rem",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "var(--zg-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3
                id="action-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--zg-text-main, #0f172a)",
                }}
              >
                {editingActionId !== null ? "Edit Action Taken" : "Record Action Taken"}
              </h3>
              <button
                type="button"
                data-testid="close-modal-x"
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  color: "var(--zg-text-muted, #64748b)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {generalError && (
              <div
                data-testid="action-modal-error"
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  marginBottom: "1rem",
                  fontSize: "0.875rem",
                }}
              >
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Field 1: Performer (Read-only) */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  htmlFor="performer-name-field"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                    color: "var(--zg-text-main, #0f172a)",
                  }}
                >
                  Performed By (Auto-bound):
                </label>
                <input
                  id="performer-name-field"
                  type="text"
                  readOnly
                  disabled
                  value={currentUserName}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid var(--zg-border, #e2e8f0)",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    color: "var(--zg-text-muted, #64748b)",
                  }}
                />
              </div>

              {/* Field 2: Action Date/Time */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  htmlFor="action-datetime-field"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                    color: "var(--zg-text-main, #0f172a)",
                  }}
                >
                  Action Date & Time:
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    id="action-datetime-field"
                    type="datetime-local"
                    value={actionDateTime}
                    onChange={(e) => setActionDateTime(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      border: "1px solid var(--zg-border, #e2e8f0)",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid var(--zg-border, #e2e8f0)",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Field 3: Action Description */}
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.25rem",
                  }}
                >
                  <label
                    htmlFor="action-description-field"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--zg-text-main, #0f172a)",
                    }}
                  >
                    Action Description: <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--zg-text-muted, #64748b)",
                    }}
                  >
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  id="action-description-field"
                  data-testid="action-description-input"
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({ ...prev, description: "" }));
                    }
                  }}
                  placeholder="Describe technical work, inspections, diagnostic commands run..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: `1px solid ${
                      fieldErrors.description ? "#dc2626" : "var(--zg-border, #e2e8f0)"
                    }`,
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                  }}
                />
                {fieldErrors.description && (
                  <span
                    data-testid="error-action-description"
                    style={{
                      color: "#dc2626",
                      fontSize: "0.75rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {fieldErrors.description}
                  </span>
                )}
              </div>

              {/* Field 4: Result / Outcome */}
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.25rem",
                  }}
                >
                  <label
                    htmlFor="action-result-field"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--zg-text-main, #0f172a)",
                    }}
                  >
                    Result / Outcome: <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--zg-text-muted, #64748b)",
                    }}
                  >
                    {result.length}/2000
                  </span>
                </div>
                <textarea
                  id="action-result-field"
                  data-testid="action-result-input"
                  rows={3}
                  value={result}
                  onChange={(e) => {
                    setResult(e.target.value);
                    if (fieldErrors.result) {
                      setFieldErrors((prev) => ({ ...prev, result: "" }));
                    }
                  }}
                  placeholder="Detail test outcomes, link status, ping latency, error resolution..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: `1px solid ${
                      fieldErrors.result ? "#dc2626" : "var(--zg-border, #e2e8f0)"
                    }`,
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                  }}
                />
                {fieldErrors.result && (
                  <span
                    data-testid="error-action-result"
                    style={{
                      color: "#dc2626",
                      fontSize: "0.75rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {fieldErrors.result}
                  </span>
                )}
              </div>

              {/* Field 5: Follow-Up Required Checkbox */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--zg-text-main, #0f172a)",
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="followup-required-checkbox"
                    checked={followUpRequired}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFollowUpRequired(checked);
                      if (!checked) {
                        setFollowUpNote("");
                        setFieldErrors((prev) => ({ ...prev, followUpNote: "" }));
                      }
                    }}
                    style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
                  />
                  Follow-Up Required?
                </label>
              </div>

              {/* Field 6: Follow-Up Note (Conditionally rendered when checked) */}
              {followUpRequired && (
                <div
                  data-testid="followup-note-container"
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--zg-action-followup-bg, #fff7ed)",
                    border: "1px solid var(--zg-action-followup-border, #fdba74)",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <label
                      htmlFor="followup-note-field"
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--zg-action-followup-text, #9a3412)",
                      }}
                    >
                      Follow-up Note: <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--zg-action-followup-text, #9a3412)",
                      }}
                    >
                      {followUpNote.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="followup-note-field"
                    data-testid="followup-note-input"
                    rows={2}
                    value={followUpNote}
                    onChange={(e) => {
                      setFollowUpNote(e.target.value);
                      if (fieldErrors.followUpNote) {
                        setFieldErrors((prev) => ({ ...prev, followUpNote: "" }));
                      }
                    }}
                    onBlur={() => {
                      // Work norm blur rule: if unchecked, clear
                      if (!followUpRequired) {
                        setFollowUpNote("");
                      }
                    }}
                    placeholder="Specify follow-up date, monitoring instructions, or user check-in requirements..."
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: `1px solid ${
                        fieldErrors.followUpNote ? "#dc2626" : "#fed7aa"
                      }`,
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                    }}
                  />
                  {fieldErrors.followUpNote && (
                    <span
                      data-testid="error-followup-note"
                      style={{
                        color: "#dc2626",
                        fontSize: "0.75rem",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      {fieldErrors.followUpNote}
                    </span>
                  )}
                </div>
              )}

              {/* Field 7: Attachment Notes */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="attachment-notes-field"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                    color: "var(--zg-text-main, #0f172a)",
                  }}
                >
                  Attachment Notes (Optional):
                </label>
                <input
                  id="attachment-notes-field"
                  data-testid="attachment-notes-input"
                  type="text"
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                  placeholder="e.g. Refer to uploaded photo switch_rack_c02.jpg"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid var(--zg-border, #e2e8f0)",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              {/* Modal Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  data-testid="cancel-action-button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-action-button"
                  disabled={isSubmitting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    backgroundColor: "var(--zg-primary, #1b4332)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingActionId !== null
                    ? "Update Action"
                    : "Save Action Taken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ActionsTakenSection;
