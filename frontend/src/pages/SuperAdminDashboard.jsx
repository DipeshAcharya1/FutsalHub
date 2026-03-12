import React, { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import api from "../api/axios";
import "../styles/SuperAdminDashboard.css";

const SuperAdminDashboard = () => {
  const [futsals, setFutsals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Form states for admin creation
  const [adminForm, setAdminForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "", 
    password_confirmation: "", 
    futsal_id: "" 
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Tab state
  const [tab, setTab] = useState('futsals');
  
  // Modal states for futsal management
  const [showFutsalModal, setShowFutsalModal] = useState(false);
  const [editingFutsal, setEditingFutsal] = useState(null);
  const [futsalForm, setFutsalForm] = useState({ 
    name: '', 
    location: '', 
    contact_number: '', 
    description: '', 
    manager_id: '' 
  });

  // Show success message
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ===== DATA LOADING FUNCTIONS =====
  const loadFutsals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/futsals');
      setFutsals(res.data || []);
    } catch (e) {
      setError('Failed to load futsals');
    } finally { 
      setLoading(false); 
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try { 
      const res = await api.get('/super-admin/admins'); 
      setAdmins(res.data || []); 
    } catch(e) { 
      setError('Failed to load admins'); 
    } finally { 
      setLoading(false); 
    }
  };

  // Initial load
  useEffect(() => { 
    loadFutsals(); 
    loadAdmins();
  }, []);

  // Load tab-specific data
  useEffect(() => {
    if (tab === 'admins') loadAdmins();
  }, [tab]);

  // ===== ADMIN MANAGEMENT =====
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    // Client-side validation
    const errs = {};
    if (!adminForm.name.trim()) errs.name = 'Name is required';
    if (!adminForm.email.trim()) errs.email = 'Email is required';
    if (!adminForm.password) errs.password = 'Password is required';
    if (adminForm.password !== adminForm.password_confirmation) 
      errs.password_confirmation = 'Passwords do not match';
    
    if (Object.keys(errs).length) { 
      setFormErrors(errs); 
      return; 
    }

    try {
      setSubmitting(true);
      await api.post('/super-admin/admins', adminForm);
      
      // Reset form
      setAdminForm({ 
        name: "", email: "", phone: "", 
        password: "", password_confirmation: "", 
        futsal_id: "" 
      });
      
      showSuccess('Admin created successfully');
      loadAdmins(); // Refresh admins list
      loadFutsals(); // Refresh futsals to show updated manager assignments
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin');
      if (err.response?.data?.errors) setFormErrors(err.response.data.errors);
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      await api.delete(`/super-admin/admins/${adminId}`);
      showSuccess('Admin deleted successfully');
      loadAdmins();
      loadFutsals(); // Refresh futsals to update manager assignments
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  // ===== FUTSAL MANAGEMENT =====
  const openAddFutsal = () => { 
    setEditingFutsal(null); 
    setFutsalForm({ name:'', location:'', contact_number:'', description:'', manager_id:'' }); 
    setShowFutsalModal(true); 
  };

  const openEditFutsal = (f) => { 
    setEditingFutsal(f); 
    setFutsalForm({ 
      name: f.futsal_name || '', 
      location: f.location || '', 
      contact_number: f.contact_number || '', 
      description: f.description || '', 
      manager_id: f.manager_id || '' 
    }); 
    setShowFutsalModal(true); 
  };

  const saveFutsal = async (e) => {
    e.preventDefault(); 
    setLoading(true); 
    try {
      if (editingFutsal) { 
        await api.put(`/super-admin/futsals/${editingFutsal.id}`, futsalForm);
        showSuccess('Futsal updated successfully');
      } else { 
        await api.post('/super-admin/futsals', futsalForm);
        showSuccess('Futsal created successfully');
      }
      setShowFutsalModal(false); 
      loadFutsals();
    } catch(err){ 
      setError(err.response?.data?.message || 'Failed to save futsal'); 
    } finally{ 
      setLoading(false); 
    }
  };

  const toggleFutsalActive = async (f) => { 
    if (!window.confirm(`Are you sure you want to ${f.active ? 'deactivate' : 'activate'} ${f.futsal_name}?`)) return;
    
    try{ 
      await api.patch(`/super-admin/futsals/${f.id}/toggle-active`); 
      showSuccess(`Futsal ${f.active ? 'deactivated' : 'activated'} successfully`);
      loadFutsals(); 
    } catch(e){ 
      setError('Failed to toggle status'); 
    } 
  };

  const deleteFutsal = async (f) => {
    if (!window.confirm(`Are you sure you want to delete ${f.futsal_name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/super-admin/futsals/${f.id}`);
      showSuccess('Futsal deleted successfully');
      loadFutsals();
      loadAdmins(); // Refresh admins to update their assignments
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete futsal');
    }
  };

  return (
    <ProtectedRoute allowedRoles={["super-admin"]}>
      <div className="super-admin-dashboard">
        {/* Success/Error Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        
        <main className="admin-main">
          {/* Header */}
          <section className="admin-head">
            <h1>Super Admin Dashboard</h1>
            <p>Manage futsals and admins</p>
          </section>

          {/* Navigation Tabs - Only Futsals and Admins */}
          <nav className="admin-nav">
            <button 
              className={tab === 'futsals' ? 'active' : ''} 
              onClick={() => setTab('futsals')}
            >
              Futsals
            </button>
            <button 
              className={tab === 'admins' ? 'active' : ''} 
              onClick={() => setTab('admins')}
            >
              Admins
            </button>
          </nav>

          {/* ===== FUTSALS TAB ===== */}
          {tab === 'futsals' && (
            <section className="tab-content">
              <div className="content-header">
                <h3>Manage Futsals</h3>
                <button className="btn-primary" onClick={openAddFutsal}>
                  + Add New Futsal
                </button>
              </div>

              {loading && <div className="loading-text">Loading futsals...</div>}

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Contact</th>
                      <th>Manager</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futsals.map(f => (
                      <tr key={f.id}>
                        <td>{f.id}</td>
                        <td>{f.futsal_name}</td>
                        <td>{f.location}</td>
                        <td>{f.contact_number || '-'}</td>
                        <td>
                          {f.manager_name ? (
                            <div>
                              <div>{f.manager_name}</div>
                              <small>{f.manager_email}</small>
                            </div>
                          ) : (
                            <span className="no-manager">No manager assigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${f.active ? 'active' : 'inactive'}`}>
                            {f.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-edit"
                              onClick={() => openEditFutsal(f)}
                              title="Edit futsal"
                            >
                              Edit
                            </button>
                            <button 
                              className={f.active ? 'btn-deactivate' : 'btn-activate'}
                              onClick={() => toggleFutsalActive(f)}
                              title={f.active ? 'Deactivate futsal' : 'Activate futsal'}
                            >
                              {f.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => deleteFutsal(f)}
                              title="Delete futsal"
                            >
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
          )}

          {/* ===== ADMINS TAB ===== */}
          {tab === 'admins' && (
            <section className="tab-content">
              <div className="content-header">
                <h3>Manage Admins</h3>
              </div>

              {/* Create Admin Form */}
              <div className="create-admin-section">
                <h4>Create New Admin</h4>
                <form onSubmit={handleCreateAdmin} className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={adminForm.name}
                        onChange={e => setAdminForm({...adminForm, name: e.target.value})}
                        className={formErrors.name ? 'error' : ''}
                      />
                      {formErrors.name && <div className="error-message">{formErrors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        placeholder="admin@example.com"
                        value={adminForm.email}
                        onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                        className={formErrors.email ? 'error' : ''}
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
                      onChange={e => setAdminForm({...adminForm, phone: e.target.value})}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={adminForm.password}
                        onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                        className={formErrors.password ? 'error' : ''}
                      />
                      {formErrors.password && <div className="error-message">{formErrors.password}</div>}
                    </div>

                    <div className="form-group">
                      <label>Confirm Password *</label>
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={adminForm.password_confirmation}
                        onChange={e => setAdminForm({...adminForm, password_confirmation: e.target.value})}
                        className={formErrors.password_confirmation ? 'error' : ''}
                      />
                      {formErrors.password_confirmation && 
                        <div className="error-message">{formErrors.password_confirmation}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Assign to Futsal (optional)</label>
                    <select 
                      value={adminForm.futsal_id} 
                      onChange={e => setAdminForm({...adminForm, futsal_id: e.target.value})}
                    >
                      <option value="">-- Select a futsal --</option>
                      {futsals.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.futsal_name} - {f.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Admin'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => {
                        setAdminForm({ 
                          name: "", email: "", phone: "", 
                          password: "", password_confirmation: "", 
                          futsal_id: "" 
                        });
                        setFormErrors({});
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
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Managed Futsal</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(admin => (
                        <tr key={admin.id}>
                          <td>{admin.id}</td>
                          <td>{admin.name}</td>
                          <td>{admin.email}</td>
                          <td>{admin.phone || '-'}</td>
                          <td>
                            {admin.managed_futsals?.length > 0 ? (
                              admin.managed_futsals.map(f => f.name).join(', ')
                            ) : (
                              <span className="no-futsal">No futsal assigned</span>
                            )}
                          </td>
                          <td>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteAdmin(admin.id)}
                              title="Delete admin"
                            >
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
          )}

          {/* ===== FUTSAL MODAL ===== */}
          {showFutsalModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>{editingFutsal ? 'Edit Futsal' : 'Add New Futsal'}</h3>
                  <button className="modal-close" onClick={() => setShowFutsalModal(false)}>×</button>
                </div>

                <form onSubmit={saveFutsal}>
                  <div className="form-group">
                    <label>Futsal Name *</label>
                    <input
                      type="text"
                      value={futsalForm.name}
                      onChange={e => setFutsalForm({...futsalForm, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Location *</label>
                    <input
                      type="text"
                      value={futsalForm.location}
                      onChange={e => setFutsalForm({...futsalForm, location: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Number</label>
                    <input
                      type="text"
                      value={futsalForm.contact_number}
                      onChange={e => setFutsalForm({...futsalForm, contact_number: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={futsalForm.description}
                      onChange={e => setFutsalForm({...futsalForm, description: e.target.value})}
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Assign Manager (optional)</label>
                    <select 
                      value={futsalForm.manager_id} 
                      onChange={e => setFutsalForm({...futsalForm, manager_id: e.target.value})}
                    >
                      <option value="">-- No manager --</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} - {admin.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : (editingFutsal ? 'Update Futsal' : 'Create Futsal')}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowFutsalModal(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;