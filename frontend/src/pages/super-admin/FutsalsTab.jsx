import React, { useState } from "react";
import Pagination from "../../components/Pagination";
import FutsalDetailsModal from "./FutsalDetailsModal";

const FutsalsTab = ({ futsals, loading, onAdd, onEdit, onView, onToggle, onDelete }) => {
  const [selectedFutsal, setSelectedFutsal] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  // Calculate paginated data
  const totalItems = futsals.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFutsals = futsals.slice(startIndex, endIndex);

  const handlePageChange = (page, newItemsPerPage = null) => {
    if (newItemsPerPage) {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    } else {
      setCurrentPage(page);
    }
  };

  const handleView = (futsalId) => {
    const futsal = futsals.find(f => f.id === futsalId);
    setSelectedFutsal(futsal);
    if (onView) onView(futsalId);
  };

  if (loading) {
    return <div className="loading-text">Loading futsals...</div>;
  }

  return (
    <>
      <section className="tab-content">
        <div className="content-header">
          <h3>Manage Futsals</h3>
          <button className="btn-primary" onClick={onAdd}>
            + Add New Futsal
          </button>
        </div>

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
              {paginatedFutsals.map((f) => (
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
                      <button className="btn-view" onClick={() => handleView(f.id)}>View</button>
                      <button className="btn-edit" onClick={() => onEdit(f)}>Edit</button>
                      <button
                        className={f.active ? "btn-deactivate" : "btn-activate"}
                        onClick={() => onToggle(f)}
                      >
                        {f.active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="btn-delete" onClick={() => onDelete(f)}>Delete</button>
                    </div>
                   </td>
                </tr>
              ))}
              {paginatedFutsals.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="empty-message">
                    No futsals found. Click "Add New Futsal" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      </section>

      {selectedFutsal && (
        <FutsalDetailsModal 
          futsal={selectedFutsal} 
          onClose={() => setSelectedFutsal(null)} 
        />
      )}
    </>
  );
};

export default FutsalsTab;