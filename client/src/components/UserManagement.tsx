import React, { useState, useEffect, useCallback } from "react";
import {
  AdminUser,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);

  // Create User Form State
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    fullName: "",
    email: "",
    role: "REQUESTER",
    initialPassword: "",
    department: "",
    isActive: true,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit User Form State
  const [editForm, setEditForm] = useState<UpdateAdminUserPayload>({
    fullName: "",
    email: "",
    role: "REQUESTER",
    department: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password Form State
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      });
      setUsers(data.users || []);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load users list");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Create User
  const handleOpenCreate = () => {
    setCreateForm({
      fullName: "",
      email: "",
      role: "REQUESTER",
      initialPassword: "",
      department: "",
      isActive: true,
    });
    setCreateErrors({});
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});

    const errors: Record<string, string> = {};
    if (!createForm.fullName.trim()) errors.fullName = "Full name is required";
    if (!createForm.email.trim()) errors.email = "Email is required";
    if (!createForm.initialPassword) errors.initialPassword = "Initial password is required";

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await createAdminUser(createForm);
      setSuccessMessage(res.message || "User created successfully.");
      setIsCreateOpen(false);
      await loadUsers();
    } catch (err: any) {
      if (err.fieldErrors) {
        setCreateErrors(err.fieldErrors);
      } else {
        setCreateErrors({ general: err.message || "Failed to create user" });
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Edit User
  const handleOpenEdit = (target: AdminUser) => {
    setEditingUser(target);
    setEditForm({
      fullName: target.fullName,
      email: target.email,
      role: target.role,
      department: target.department || "",
      isActive: target.isActive,
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    try {
      setEditSubmitting(true);
      const res = await updateAdminUser(editingUser.id, editForm);
      setSuccessMessage(res.message || "User updated successfully.");
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      if (err.code === "CANNOT_DEACTIVATE_SELF") {
        setEditError("Administrators cannot deactivate their own account (BR-18).");
      } else if (err.code === "LAST_ADMIN_PROTECTED") {
        setEditError("Cannot deactivate or demote the last active administrator (BR-19).");
      } else if (err.code === "EMAIL_ALREADY_EXISTS") {
        setEditError("A user with this email address already exists.");
      } else {
        setEditError(err.message || "Failed to update user.");
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleOpenReset = (target: AdminUser) => {
    setResetTargetUser(target);
    setResetPasswordInput("");
    setResetError(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetError(null);

    if (!resetPasswordInput) {
      setResetError("A new initial password is required");
      return;
    }

    try {
      setResetSubmitting(true);
      const res = await resetUserPassword(resetTargetUser.id, resetPasswordInput);
      setSuccessMessage(res.message || "Password reset successfully.");
      setResetTargetUser(null);
      await loadUsers();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span
            className="badge rounded-pill text-white px-2 py-1"
            style={{ backgroundColor: "#5E35B1" }}
            data-testid="role-badge"
          >
            Admin
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            className="badge rounded-pill text-white px-2 py-1"
            style={{ backgroundColor: "#1565C0" }}
            data-testid="role-badge"
          >
            IT Staff
          </span>
        );
      case "REQUESTER":
      default:
        return (
          <span
            className="badge rounded-pill px-2 py-1"
            style={{
              backgroundColor: "var(--color-primary-light, #EAF6EF)",
              color: "var(--color-primary, #006B3C)",
            }}
            data-testid="role-badge"
          >
            Requester
          </span>
        );
    }
  };

  return (
    <div className="container-fluid px-0" data-testid="user-management-view">
      {/* Alert Banners */}
      {successMessage && (
        <div
          className="alert alert-success alert-dismissible fade show mb-4 shadow-sm"
          role="alert"
          data-testid="admin-success-alert"
        >
          <span>✓ {successMessage}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {errorMessage && (
        <div
          className="alert alert-danger alert-dismissible fade show mb-4 shadow-sm"
          role="alert"
          data-testid="admin-error-alert"
        >
          <span>⚠ {errorMessage}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setErrorMessage(null)}
          />
        </div>
      )}

      {/* Header and Controls Toolbar */}
      <div className="zen-card p-3 p-md-4 mb-4 shadow-sm">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h4 className="fw-bold mb-1" style={{ color: "var(--color-primary, #006B3C)" }}>
              User Administration
            </h4>
            <p className="text-muted small mb-0">
              Manage system user accounts, roles, access states, and administrative password resets.
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-open-create-user"
            className="btn text-white fw-medium px-3 py-2 d-flex align-items-center gap-2"
            style={{
              backgroundColor: "var(--color-primary, #006B3C)",
              minHeight: 44,
            }}
            onClick={handleOpenCreate}
          >
            <span>+</span>
            <span>Create User</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-7 col-lg-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                🔍
              </span>
              <input
                type="text"
                data-testid="admin-search-input"
                className="form-control border-start-0"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minHeight: 44 }}
              />
            </div>
          </div>
          <div className="col-12 col-md-5 col-lg-4">
            <select
              data-testid="admin-role-filter"
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ minHeight: 44 }}
            >
              <option value="ALL">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List Table (Desktop & Tablet) */}
      <div className="zen-card p-0 shadow-sm overflow-hidden mb-4">
        {loading ? (
          <div className="text-center py-5" data-testid="admin-loading-spinner">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading users...</span>
            </div>
            <p className="text-muted small mt-2 mb-0">Loading accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-5" data-testid="admin-empty-state">
            <p className="text-muted mb-2">No users found matching your search or filter.</p>
            {(search || roleFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("ALL");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" data-testid="admin-users-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-4">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Department</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">First Login Flag</th>
                    <th scope="col" className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td className="ps-4 fw-medium text-dark">{u.fullName}</td>
                      <td className="text-muted small">{u.email}</td>
                      <td className="text-muted small">{u.department || "—"}</td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td>
                        {u.isActive ? (
                          <span
                            className="badge rounded-pill text-white px-2 py-1"
                            style={{ backgroundColor: "var(--color-primary, #006B3C)" }}
                            data-testid="status-badge"
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            className="badge rounded-pill bg-secondary text-white px-2 py-1"
                            data-testid="status-badge"
                          >
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        {u.mustChangePassword ? (
                          <span className="badge bg-warning text-dark px-2 py-1" data-testid="must-change-badge">
                            Must Change
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border px-2 py-1">
                            Cleared
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            data-testid={`btn-edit-user-${u.id}`}
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User Profile"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-reset-password-${u.id}`}
                            className="btn btn-sm btn-outline-warning text-dark"
                            onClick={() => handleOpenReset(u)}
                            title="Reset Initial Password"
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (< 768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3" data-testid="admin-users-mobile-cards">
              {users.map((u) => (
                <div key={u.id} className="border rounded p-3 bg-white shadow-sm" data-testid={`user-card-${u.id}`}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">{u.fullName}</h6>
                      <div className="text-muted small">{u.email}</div>
                    </div>
                    <div>{getRoleBadge(u.role)}</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 my-2 small">
                    <span className="text-muted">
                      Status:{" "}
                      <span className={`fw-medium ${u.isActive ? "text-success" : "text-secondary"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="text-muted">
                      Dept: {u.department || "—"}
                    </span>
                    {u.mustChangePassword && (
                      <>
                        <span>•</span>
                        <span className="text-warning fw-medium">Must Change Password</span>
                      </>
                    )}
                  </div>

                  <div className="d-flex gap-2 mt-3 pt-2 border-top">
                    <button
                      type="button"
                      data-testid={`btn-mobile-edit-${u.id}`}
                      className="btn btn-sm btn-outline-secondary flex-grow-1"
                      style={{ minHeight: 44 }}
                      onClick={() => handleOpenEdit(u)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`btn-mobile-reset-${u.id}`}
                      className="btn btn-sm btn-outline-warning text-dark flex-grow-1"
                      style={{ minHeight: 44 }}
                      onClick={() => handleOpenReset(u)}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Create User Modal */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-header border-bottom px-4 py-3">
                  <h5 className="modal-title fw-bold" style={{ color: "var(--color-primary, #006B3C)" }}>
                    Create User Account
                  </h5>
                  <button
                    type="button"
                    data-testid="btn-cancel-create-user"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setIsCreateOpen(false)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  {createErrors.general && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      ⚠ {createErrors.general}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      data-testid="create-user-fullname"
                      className={`form-control ${createErrors.fullName ? "is-invalid" : ""}`}
                      placeholder="e.g. John Smith"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      required
                    />
                    {createErrors.fullName && (
                      <div className="invalid-feedback">{createErrors.fullName}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      data-testid="create-user-email"
                      className={`form-control ${createErrors.email ? "is-invalid" : ""}`}
                      placeholder="e.g. john.smith@email.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                    />
                    {createErrors.email && (
                      <div className="invalid-feedback">{createErrors.email}</div>
                    )}
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Role *</label>
                      <select
                        data-testid="create-user-role"
                        className="form-select"
                        value={createForm.role}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            role: e.target.value as "REQUESTER" | "IT_STAFF" | "ADMIN",
                          })
                        }
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        data-testid="create-user-department"
                        className="form-control"
                        placeholder="e.g. Engineering"
                        value={createForm.department}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, department: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Password *</label>
                    <input
                      type="password"
                      data-testid="create-user-password"
                      className={`form-control ${createErrors.initialPassword ? "is-invalid" : ""}`}
                      placeholder="Minimum 8 characters with upper, lower, digit, symbol"
                      value={createForm.initialPassword}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, initialPassword: e.target.value })
                      }
                      required
                    />
                    {createErrors.initialPassword && (
                      <div className="invalid-feedback">{createErrors.initialPassword}</div>
                    )}
                    <div className="form-text small text-muted">
                      Must be $\ge 8$ characters and include uppercase, lowercase, digit, and special symbol.
                    </div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="createActiveSwitch"
                      data-testid="create-user-isactive"
                      checked={createForm.isActive}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, isActive: e.target.checked })
                      }
                    />
                    <label className="form-check-label small" htmlFor="createActiveSwitch">
                      Account is active and permitted to login
                    </label>
                  </div>

                  <div className="p-3 bg-light rounded small text-muted">
                    ℹ️ <strong>First-Login Policy:</strong> The user will be required to change this
                    initial password immediately upon first login before accessing application features (BR-03).
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-submit-create-user"
                    className="btn text-white px-4"
                    style={{ backgroundColor: "var(--color-primary, #006B3C)" }}
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Edit User Modal */}
      {/* ------------------------------------------------------------------ */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header border-bottom px-4 py-3">
                  <h5 className="modal-title fw-bold" style={{ color: "var(--color-primary, #006B3C)" }}>
                    Edit User Profile
                  </h5>
                  <button
                    type="button"
                    data-testid="btn-cancel-edit-user"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setEditingUser(null)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  {editError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" data-testid="edit-user-error">
                      ⚠ {editError}
                    </div>
                  )}

                  {/* Safety Guardrail Notice if editing own account */}
                  {currentUser && editingUser.id === currentUser.id && (
                    <div className="alert alert-warning py-2 px-3 small mb-3" data-testid="self-edit-warning">
                      🛡️ <strong>Safety Guardrail (BR-18):</strong> You are editing your own administrator account.
                      Self-deactivation is prohibited.
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      data-testid="edit-user-fullname"
                      className="form-control"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      data-testid="edit-user-email"
                      className="form-control"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Role *</label>
                      <select
                        data-testid="edit-user-role"
                        className="form-select"
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            role: e.target.value as "REQUESTER" | "IT_STAFF" | "ADMIN",
                          })
                        }
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        data-testid="edit-user-department"
                        className="form-control"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="editActiveSwitch"
                      data-testid="edit-user-isactive"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="editActiveSwitch">
                      Account is Active
                    </label>
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-submit-edit-user"
                    className="btn text-white px-4"
                    style={{ backgroundColor: "var(--color-primary, #006B3C)" }}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. Reset Password Modal */}
      {/* ------------------------------------------------------------------ */}
      {resetTargetUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleResetSubmit}>
                <div className="modal-header border-bottom px-4 py-3">
                  <h5 className="modal-title fw-bold" style={{ color: "var(--color-primary, #006B3C)" }}>
                    Reset User Password
                  </h5>
                  <button
                    type="button"
                    data-testid="btn-cancel-reset-password"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setResetTargetUser(null)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  {resetError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" data-testid="reset-password-error">
                      ⚠ {resetError}
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-muted small mb-2">
                      Resetting initial password for <strong>{resetTargetUser.fullName}</strong> (
                      <code>{resetTargetUser.email}</code>).
                    </p>
                    <label className="form-label small fw-semibold">New Initial Password *</label>
                    <input
                      type="password"
                      data-testid="reset-user-password"
                      className="form-control"
                      placeholder="Enter compliant new initial password"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      required
                    />
                    <div className="form-text small text-muted">
                      Minimum 8 characters with uppercase, lowercase, digit, and symbol (@$!%*?&#^_-).
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded small text-muted">
                    ℹ️ <strong>Mandatory Reset Policy:</strong> Resetting this password sets{" "}
                    <code>mustChangePassword = true</code>. The user will be forced to choose their own
                    new password on next login (BR-20).
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setResetTargetUser(null)}
                    disabled={resetSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-submit-reset-password"
                    className="btn btn-warning text-dark fw-medium px-4"
                    disabled={resetSubmitting}
                  >
                    {resetSubmitting ? "Resetting..." : "Reset Password"}
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
