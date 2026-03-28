import React from "react";

const FutsalsTab = ({ futsals, loading, onAdd, onEdit, onView, onToggle, onDelete }) => {
  return (
    <section className="tab-content">
      <div className="content-header">
        <h3>Manage Futsals</h3>
        <button className="btn-primary" onClick={onAdd}>
          + Add New Futsal
        </button>
      </div>

      {loading && <div className="loading-text">Loading futsals...</div>}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Contact</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>  
            </thead>
          <tbody>
            {futsals.map((f) => (
              <tr key={f.id}>
                <td>
                  <strong>{f.futsal_name}</strong>
                  {f.image && (
                    <div className="small-image-preview">
                      <img 
                        src={f.image} 
                        alt={f.futsal_name} 
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', marginTop: '5px' }} 
                      />
                    </div>
                  )}
                </td>
                <td>{f.location}</td>
                <td>{f.contact_number || "-"}</td>
                <td>
                  {f.manager_name ? (
                    <div>
                      <div><strong>{f.manager_name}</strong></div>
                      <small style={{ color: '#666' }}>{f.manager_email}</small>
                    </div>
                  ) : (
                    <span className="no-manager">No manager assigned</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${f.active ? "active" : "inactive"}`}>
                    {f.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-view" onClick={() => onView(f.id)} title="View details">
                       View
                    </button>
                    <button className="btn-edit" onClick={() => onEdit(f)} title="Edit futsal">
                       Edit
                    </button>
                    <button
                      className={f.active ? "btn-deactivate" : "btn-activate"}
                      onClick={() => onToggle(f)}
                      title={f.active ? "Deactivate futsal" : "Activate futsal"}
                    >
                      {f.active ? " Deactivate" : " Activate"}
                    </button>
                    <button className="btn-delete" onClick={() => onDelete(f)} title="Delete futsal">
                       Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {futsals.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="empty-message">
                  No futsals found. Click "Add New Futsal" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FutsalsTab;