import React from "react";

const AdminsTab = ({
  admins,
  loading,
  futsals,
  adminForm,
  setAdminForm,
  formErrors,
  submitting,
  onCreateAdmin,
  onDeleteAdmin,
}) => {
  return (
    <section className="tab-content">
      <div className="content-header">
        <h3>Manage Admins</h3>
      </div>

      {/* Create Admin Form */}
      <div className="create-admin-section">
        <h4>Create New Admin</h4>
        <form onSubmit={onCreateAdmin} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                className={formErrors.name ? "error" : ""}
              />
              {formErrors.name && <div className="error-message">{formErrors.name}</div>}
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                className={formErrors.email ? "error" : ""}
              />
              {formErrors.email && <div className="error-message">{formErrors.email}</div>}
            </div>
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              placeholder="Phone number"
              value={adminForm.phone}
              onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                placeholder="Password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className={formErrors.password ? "error" : ""}
              />
              {formErrors.password && <div className="error-message">{formErrors.password}</div>}
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={adminForm.password_confirmation}
                onChange={(e) => setAdminForm({ ...adminForm, password_confirmation: e.target.value })}
                className={formErrors.password_confirmation ? "error" : ""}
              />
              {formErrors.password_confirmation && (
                <div className="error-message">{formErrors.password_confirmation}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Assign to Futsal (optional)</label>
            <select
              value={adminForm.futsal_id}
              onChange={(e) => setAdminForm({ ...adminForm, futsal_id: e.target.value })}
            >
              <option value="">-- Select a futsal --</option>
              {futsals.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.futsal_name} - {f.location}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Admin"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAdminForm({
                  name: "",
                  email: "",
                  phone: "",
                  password: "",
                  password_confirmation: "",
                  futsal_id: "",
                });
              }}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Admins List */}
      <div className="admins-list-section">
        <h4>Existing Admins</h4>

        {loading && <div className="loading-text">Loading admins...</div>}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Managed Futsal</th>
                <th>Actions</th>
              </tr>  
              </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td><strong>{admin.name}</strong></td>
                  <td>{admin.email}</td>
                  <td>{admin.phone || "-"}</td>
                  <td>
                    {admin.managed_futsals?.length > 0 ? (
                      admin.managed_futsals.map((f) => f.name).join(", ")
                    ) : (
                      <span className="no-futsal">No futsal assigned</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-delete" onClick={() => onDeleteAdmin(admin.id)} title="Delete admin">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="empty-message">
                    No admins found. Create one using the form above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AdminsTab;