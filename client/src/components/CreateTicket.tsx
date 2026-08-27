import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  Priority,
  Ticket,
} from "../api.js";

interface CreateTicketProps {
  onNavigateToMyTickets?: () => void;
}

interface FormErrors {
  categoryId?: string;
  relatedSystemId?: string;
  requestedPriority?: string;
  summary?: string;
  description?: string;
}

export default function CreateTicket({ onNavigateToMyTickets }: CreateTicketProps) {
  const { currentRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState<boolean>(true);

  // Form State
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState<Priority>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // UI States
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    async function loadReferenceData() {
      setIsLoadingReferences(true);
      try {
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        const safeCats = Array.isArray(cats) ? cats : [];
        const safeSystems = Array.isArray(systems) ? systems : [];
        setCategories(safeCats);
        setRelatedSystems(safeSystems);

        if (safeCats.length > 0) setCategoryId(safeCats[0].id);
        if (safeSystems.length > 0) setRelatedSystemId(safeSystems[0].id);
      } catch (err) {
        console.error("Failed to load reference data:", err);
      } finally {
        setIsLoadingReferences(false);
      }
    }

    loadReferenceData();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    if (!relatedSystemId) {
      newErrors.relatedSystemId = "Please select a related system";
    }

    if (!requestedPriority) {
      newErrors.requestedPriority = "Please select a priority level";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      newErrors.summary = "Summary is required";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      newErrors.summary = "Summary must be between 5 and 100 characters";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      newErrors.description = "Description is required";
    } else if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      newErrors.description = "Description must be between 10 and 2000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    if (!currentRequester) {
      setServerError("Please select a development requester before creating a ticket.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await createTicket({
        requesterId: currentRequester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority,
        summary: summary.trim(),
        description: description.trim(),
      });

      setCreatedTicket(ticket);
      setServerError(null);
    } catch (err: any) {
      setServerError(err.message || "Failed to create ticket. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCreatedTicket(null);
    setServerError(null);
    setErrors({});
    setSummary("");
    setDescription("");
    setRequestedPriority("MEDIUM");
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (relatedSystems.length > 0) setRelatedSystemId(relatedSystems[0].id);
  };

  // Success Confirmation View (BR-08)
  if (createdTicket) {
    return (
      <div className="zen-card p-4 p-md-5 mb-4 text-center">
        <div
          className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle"
          style={{
            width: 64,
            height: 64,
            backgroundColor: "var(--color-pale-green)",
            color: "var(--color-primary)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
          </svg>
        </div>

        <h2 className="h4 fw-bold text-success mb-2">Ticket Created Successfully!</h2>
        <p className="text-muted mb-4">
          Your IT support request has been submitted and assigned a unique ticket number.
        </p>

        <div
          className="p-4 mb-4 rounded border d-inline-block text-start w-100"
          style={{ maxWidth: 540, backgroundColor: "var(--color-bg-page)" }}
        >
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Ticket Number:</span>
            <strong className="text-success fs-5">{createdTicket.ticketNumber}</strong>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Status:</span>
            <span className="badge bg-success">{createdTicket.currentStatus}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Priority:</span>
            <span className="badge bg-secondary">{createdTicket.requestedPriority}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Summary:</span>
            <span className="text-dark fw-semibold text-truncate ms-3" style={{ maxWidth: 300 }}>
              {createdTicket.summary}
            </span>
          </div>
        </div>

        <div className="d-flex justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-zen-secondary px-4"
            onClick={handleResetForm}
          >
            + Create Another Ticket
          </button>
          {onNavigateToMyTickets && (
            <button
              type="button"
              className="btn btn-zen-primary px-4"
              onClick={onNavigateToMyTickets}
            >
              View My Tickets &rarr;
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="zen-card p-4 p-md-5 mb-4">
      <div className="mb-4">
        <h2 className="h4 fw-bold text-dark mb-1">Create Support Ticket</h2>
        <p className="text-muted small">
          Submit an IT support request. Fields marked with <span className="text-danger">*</span> are mandatory.
        </p>
      </div>

      {serverError && (
        <div className="alert alert-danger mb-4 d-flex align-items-center" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            className="me-2 flex-shrink-0"
            viewBox="0 0 16 16"
          >
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
          </svg>
          <div>{serverError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3 mb-3">
          {/* Category Dropdown */}
          <div className="col-md-4">
            <label htmlFor="ticket-category" className="form-label fw-semibold small">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="ticket-category"
              className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(Number(e.target.value));
                if (errors.categoryId) setErrors({ ...errors, categoryId: undefined });
              }}
              disabled={isLoadingReferences || isSubmitting}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <div className="zen-field-error">{errors.categoryId}</div>
            )}
          </div>

          {/* Related System Dropdown */}
          <div className="col-md-4">
            <label htmlFor="ticket-related-system" className="form-label fw-semibold small">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="ticket-related-system"
              className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => {
                setRelatedSystemId(Number(e.target.value));
                if (errors.relatedSystemId) setErrors({ ...errors, relatedSystemId: undefined });
              }}
              disabled={isLoadingReferences || isSubmitting}
              required
            >
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && (
              <div className="zen-field-error">{errors.relatedSystemId}</div>
            )}
          </div>

          {/* Requested Priority */}
          <div className="col-md-4">
            <label htmlFor="ticket-priority" className="form-label fw-semibold small">
              Requested Priority <span className="text-danger">*</span>
            </label>
            <select
              id="ticket-priority"
              className={`form-select ${errors.requestedPriority ? "is-invalid" : ""}`}
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value as Priority);
                if (errors.requestedPriority) setErrors({ ...errors, requestedPriority: undefined });
              }}
              disabled={isSubmitting}
              required
            >
              <option value="LOW">Low (Minor convenience)</option>
              <option value="MEDIUM">Medium (Normal business impact)</option>
              <option value="HIGH">High (Significant disruption)</option>
              <option value="URGENT">Urgent (Work completely stopped)</option>
            </select>
            {errors.requestedPriority && (
              <div className="zen-field-error">{errors.requestedPriority}</div>
            )}
          </div>
        </div>

        {/* Summary Input */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <label htmlFor="ticket-summary" className="form-label fw-semibold small">
              Summary <span className="text-danger">*</span>
            </label>
            <span className="text-muted small" style={{ fontSize: "0.8rem" }}>
              {summary.trim().length} / 100 characters (min 5)
            </span>
          </div>
          <input
            id="ticket-summary"
            type="text"
            className={`form-control ${errors.summary ? "is-invalid" : ""}`}
            placeholder="Brief summary of the issue (e.g. Laptop battery drains quickly)"
            value={summary}
            maxLength={100}
            onChange={(e) => {
              setSummary(e.target.value);
              if (errors.summary) setErrors({ ...errors, summary: undefined });
            }}
            disabled={isSubmitting}
            required
          />
          {errors.summary && (
            <div className="zen-field-error">{errors.summary}</div>
          )}
        </div>

        {/* Description Textarea */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <label htmlFor="ticket-description" className="form-label fw-semibold small">
              Description <span className="text-danger">*</span>
            </label>
            <span className="text-muted small" style={{ fontSize: "0.8rem" }}>
              {description.trim().length} / 2000 characters (min 10)
            </span>
          </div>
          <textarea
            id="ticket-description"
            rows={5}
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            placeholder="Detailed explanation of the issue, steps to reproduce, or error messages encountered..."
            value={description}
            maxLength={2000}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            disabled={isSubmitting}
            required
          />
          {errors.description && (
            <div className="zen-field-error">{errors.description}</div>
          )}
        </div>

        {/* Form Submission Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={handleResetForm}
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            className="btn btn-zen-primary px-4 d-flex align-items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Submitting...
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}