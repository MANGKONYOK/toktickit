import { useState } from "react";
import * as api from "../api.js";
import type { Attachment } from "../api.js";

interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  activeAttachments: Attachment[];
  removedAttachments: Attachment[];
  onAttachmentChange: () => void;
}

export default function AttachmentSection({
  ticketId,
  requesterId,
  activeAttachments,
  removedAttachments,
  onAttachmentChange,
}: AttachmentSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Soft-removal modal state
  const [targetAttachment, setTargetAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const isLimitReached = activeAttachments.length >= 5;

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB = 5,242,880 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds the maximum allowed size of 5MB.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    // Validate MIME types
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setUploadError("Unsupported file type. Only JPG, PNG, WEBP, and PDF files are allowed.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    if (isLimitReached) {
      setUploadError("Cannot upload: maximum 5 active attachments limit reached.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      await api.uploadAttachment(ticketId, selectedFile, requesterId);
      setSelectedFile(null);
      onAttachmentChange();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
  }

  function openRemovalModal(att: Attachment) {
    setTargetAttachment(att);
    setRemovalReason("");
    setRemovalError("");
  }

  function closeRemovalModal() {
    setTargetAttachment(null);
    setRemovalReason("");
    setRemovalError("");
  }

  async function handleConfirmRemoval(e: React.FormEvent) {
    e.preventDefault();
    if (!targetAttachment) return;

    if (removalReason.trim().length < 5) {
      setRemovalError("Removal reason must be at least 5 characters.");
      return;
    }

    setIsRemoving(true);
    setRemovalError("");
    try {
      await api.softRemoveAttachment(targetAttachment.id, removalReason.trim(), requesterId);
      closeRemovalModal();
      onAttachmentChange();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="mt-4 pt-3 border-top" data-testid="attachment-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold text-dark">
          📎 Attachments{" "}
          <span className="badge bg-light text-secondary border ms-1 font-monospace">
            {activeAttachments.length} / 5
          </span>
        </h5>
        {isLimitReached && (
          <span className="badge bg-warning text-dark">Active limit reached (5 max)</span>
        )}
      </div>

      {/* Upload Box */}
      <div className="p-3 mb-4 rounded border bg-light">
        <form onSubmit={handleUpload} className="row g-2 align-items-center">
          <div className="col-12 col-md-8">
            <label htmlFor="attachment-file-input" className="form-label small fw-bold text-muted mb-1">
              Add Supporting File (Max 5MB • JPG, PNG, WEBP, PDF)
            </label>
            <input
              id="attachment-file-input"
              data-testid="attachment-file-input"
              type="file"
              className="form-control form-control-sm"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              disabled={isLimitReached || isUploading}
            />
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            <button
              type="submit"
              data-testid="upload-attachment-btn"
              className="btn btn-zen-primary btn-sm touch-target w-100"
              disabled={!selectedFile || isLimitReached || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </form>
        {uploadError && (
          <div className="alert alert-danger p-2 mt-2 mb-0 small" role="alert" data-testid="upload-error">
            {uploadError}
          </div>
        )}
      </div>

      {/* Active Attachments List */}
      <div className="mb-4">
        <h6 className="fw-bold text-muted small text-uppercase mb-2">Active Files</h6>
        {activeAttachments.length === 0 ? (
          <p className="text-muted small italic mb-0">No active attachments for this ticket.</p>
        ) : (
          <div className="list-group" data-testid="active-attachments-list">
            {activeAttachments.map((att) => (
              <div
                key={att.id}
                className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                data-testid={`attachment-item-${att.id}`}
              >
                <div className="d-flex align-items-center text-truncate me-3">
                  <span className="fs-5 me-2">📄</span>
                  <div className="text-truncate">
                    <span className="fw-bold text-dark text-truncate d-block">
                      {att.fileName}
                    </span>
                    <small className="text-muted">
                      {formatBytes(att.fileSize)} • Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                  <a
                    href={api.getAttachmentDownloadUrl(att.id, requesterId)}
                    className="btn btn-outline-success btn-sm touch-target"
                    download={att.fileName}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`download-attachment-${att.id}`}
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm touch-target"
                    onClick={() => openRemovalModal(att)}
                    data-testid={`remove-attachment-${att.id}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Soft-Removed Attachments Audit Section */}
      {removedAttachments.length > 0 && (
        <div className="mt-4 pt-3 border-top" data-testid="removed-attachments-section">
          <h6 className="fw-bold text-secondary small text-uppercase mb-2">
            Audit Trail — Removed Files ({removedAttachments.length})
          </h6>
          <div className="list-group" data-testid="removed-attachments-list">
            {removedAttachments.map((att) => (
              <div
                key={att.id}
                className="list-group-item list-group-item-light d-flex justify-content-between align-items-center py-2 px-3 opacity-75"
              >
                <div className="text-truncate me-3">
                  <span className="text-decoration-line-through text-muted fw-bold d-block">
                    {att.fileName}
                  </span>
                  <small className="text-danger d-block">
                    <strong>Reason:</strong> {att.removalReason || "No reason recorded"}
                  </small>
                </div>
                <span className="badge bg-secondary">Download Blocked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft-Removal Accessible Modal */}
      {targetAttachment && (
        <div
          data-testid="removal-modal"
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="removal-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title text-danger fw-bold" id="removal-modal-title">
                  Confirm Attachment Removal
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemovalModal}
                  aria-label="Close"
                  disabled={isRemoving}
                />
              </div>
              <form onSubmit={handleConfirmRemoval}>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    You are removing <strong>{targetAttachment.fileName}</strong>. Under governed audit
                    rules, the file will be soft-removed and future binary downloads will be permanently
                    blocked. A mandatory audit reason is required.
                  </p>
                  <div className="mb-3">
                    <label htmlFor="removal-reason-input" className="form-label small fw-bold text-dark">
                      Removal Reason (Minimum 5 characters)*
                    </label>
                    <textarea
                      id="removal-reason-input"
                      data-testid="removal-reason-input"
                      className="form-control"
                      rows={3}
                      placeholder="e.g. File contained sensitive credentials or obsolete system logs..."
                      value={removalReason}
                      onChange={(e) => {
                        setRemovalReason(e.target.value);
                        if (removalError) setRemovalError("");
                      }}
                      required
                      minLength={5}
                      maxLength={255}
                      disabled={isRemoving}
                    />
                    <div className="d-flex justify-content-between mt-1">
                      <small className={removalReason.trim().length < 5 ? "text-danger" : "text-success"}>
                        {removalReason.trim().length} / 5 min characters
                      </small>
                      <small className="text-muted">Max 255</small>
                    </div>
                  </div>
                  {removalError && (
                    <div className="alert alert-danger p-2 small mb-0" role="alert">
                      {removalError}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-secondary touch-target"
                    onClick={closeRemovalModal}
                    disabled={isRemoving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="confirm-removal-btn"
                    className="btn btn-danger touch-target"
                    disabled={removalReason.trim().length < 5 || isRemoving}
                  >
                    {isRemoving ? "Removing..." : "Confirm Removal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
