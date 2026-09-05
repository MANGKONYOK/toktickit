import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachmentSection from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js");

const mockActiveAttachments: api.Attachment[] = [
  {
    id: 1,
    ticketId: 101,
    fileName: "diagnostics.pdf",
    fileSize: 204800,
    mimeType: "application/pdf",
    uploadedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    fileName: "error_log.png",
    fileSize: 102400,
    mimeType: "image/png",
    uploadedAt: "2026-09-01T10:10:00.000Z",
  },
];

const mockRemovedAttachments: api.Attachment[] = [
  {
    id: 3,
    ticketId: 101,
    fileName: "old_screenshot.jpg",
    fileSize: 51200,
    mimeType: "image/jpeg",
    uploadedAt: "2026-09-01T09:00:00.000Z",
    removedAt: "2026-09-01T09:30:00.000Z",
    removedById: 1,
    removalReason: "Accidentally uploaded confidential personal notes",
  },
];

describe("AttachmentSection Component - [UI-07 / AC-14..18, BR-09..12]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAttachmentDownloadUrl).mockImplementation(
      (id, reqId) => `http://localhost:3000/api/attachments/${id}/download?requesterId=${reqId}`
    );
  });

  it("renders active attachments with download links and remove buttons", () => {
    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        activeAttachments={mockActiveAttachments}
        removedAttachments={[]}
        onAttachmentChange={vi.fn()}
      />
    );

    expect(screen.getByText("diagnostics.pdf")).toBeInTheDocument();
    expect(screen.getByText("error_log.png")).toBeInTheDocument();
    expect(screen.getByTestId("download-attachment-1")).toBeInTheDocument();
    expect(screen.getByTestId("remove-attachment-1")).toBeInTheDocument();
  });

  it("disables upload controls when active attachments reach 5 (AC-16 / BR-10)", () => {
    const fiveAttachments: api.Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: 101,
      fileName: `file_${i + 1}.png`,
      fileSize: 1024,
      mimeType: "image/png",
      uploadedAt: "2026-09-01T10:00:00.000Z",
    }));

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        activeAttachments={fiveAttachments}
        removedAttachments={[]}
        onAttachmentChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Active limit reached/i)).toBeInTheDocument();
    expect(screen.getByTestId("attachment-file-input")).toBeDisabled();
    expect(screen.getByTestId("upload-attachment-btn")).toBeDisabled();
  });

  it("rejects files exceeding 5MB with client-side error (AC-15 / BR-09)", async () => {
    const user = userEvent.setup();

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        activeAttachments={[]}
        removedAttachments={[]}
        onAttachmentChange={vi.fn()}
      />
    );

    // Create a 6MB dummy file
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "oversized.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByTestId("attachment-file-input");
    await user.upload(fileInput, oversizedFile);

    expect(screen.getByTestId("upload-error")).toHaveTextContent(/exceeds the maximum allowed size of 5MB/i);
    expect(screen.getByTestId("upload-attachment-btn")).toBeDisabled();
  });

  it("opens soft-removal modal and enforces minimum 5 characters reason (AC-17 / BR-11)", async () => {
    const user = userEvent.setup();
    const onAttachmentChange = vi.fn();
    vi.mocked(api.softRemoveAttachment).mockResolvedValue({
      id: 1,
      isRemoved: true,
      removalReason: "File contained internal company secrets",
    });

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        activeAttachments={mockActiveAttachments}
        removedAttachments={[]}
        onAttachmentChange={onAttachmentChange}
      />
    );

    // Click remove on first attachment
    await user.click(screen.getByTestId("remove-attachment-1"));

    // Modal appears
    expect(screen.getByText("Confirm Attachment Removal")).toBeInTheDocument();
    const reasonInput = screen.getByTestId("removal-reason-input");
    const confirmBtn = screen.getByTestId("confirm-removal-btn");

    // Initially disabled because reason is empty (< 5 chars)
    expect(confirmBtn).toBeDisabled();

    // Type 4 characters -> still disabled
    await user.type(reasonInput, "oops");
    expect(confirmBtn).toBeDisabled();

    // Type 5+ characters -> enabled
    await user.type(reasonInput, " mistake file uploaded");
    expect(confirmBtn).not.toBeDisabled();

    // Submit removal
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith(1, "oops mistake file uploaded", 1);
      expect(onAttachmentChange).toHaveBeenCalled();
    });
  });

  it("renders audit trail for soft-removed attachments with download blocked (AC-18 / BR-12)", () => {
    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        activeAttachments={[]}
        removedAttachments={mockRemovedAttachments}
        onAttachmentChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("removed-attachments-section")).toBeInTheDocument();
    expect(screen.getByText("old_screenshot.jpg")).toBeInTheDocument();
    expect(screen.getByText(/Accidentally uploaded confidential personal notes/i)).toBeInTheDocument();
    expect(screen.getByText("Download Blocked")).toBeInTheDocument();
  });
});
