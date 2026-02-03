import React, { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import api from "../api/axios";
import "../styles/AdminDashboard.css";

const SuperAdminDashboard = () => {
  const [futsals, setFutsals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", phone: "", password: "", password_confirmation: "", futsal_id: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('futsals');
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [showFutsalModal, setShowFutsalModal] = useState(false);
  const [editingFutsal, setEditingFutsal] = useState(null);
  const [futsalForm, setFutsalForm] = useState({ name:'', location:'', manager_id: '' });

  const loadFutsals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/futsals');
      setFutsals(res.data || []);
    } catch (e) {
      setError('Failed to load futsals');
    } finally { setLoading(false); }
  };

  const loadBookings = async () => {
    setLoading(true);
    try { const res = await api.get('/super-admin/bookings'); setBookings(res.data || []); } catch(e){ setError('Failed to load bookings'); } finally{ setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const res = await api.get('/super-admin/users'); setUsers(res.data || []); } catch(e){ setError('Failed to load users'); } finally{ setLoading(false); }
  };

  useEffect(() => { loadFutsals(); }, []);

  useEffect(() => {
    if (tab === 'bookings') loadBookings();
    if (tab === 'users') loadUsers();
  }, [tab]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});
    // simple client-side validation
    const errs = {};
    if (!adminForm.name.trim()) errs.name = 'Name is required';
    if (!adminForm.email.trim()) errs.email = 'Email is required';
    if (!adminForm.password) errs.password = 'Password is required';
    if (adminForm.password !== adminForm.password_confirmation) errs.password_confirmation = 'Passwords do not match';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    try {
      setSubmitting(true);
      const payload = { ...adminForm };
      await api.post('/super-admin/admins', payload);
      setAdminForm({ name: "", email: "", phone: "", password: "", password_confirmation: "", futsal_id: "" });
      loadFutsals();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin');
      if (err.response?.data?.errors) setFormErrors(err.response.data.errors);
    } finally { setSubmitting(false); }
  };

  const openAddFutsal = () => { setEditingFutsal(null); setFutsalForm({ name:'', location:'', manager_id:''}); setShowFutsalModal(true); };

  const openEditFutsal = (f) => { setEditingFutsal(f); setFutsalForm({ name: f.name||'', location: f.location||'', manager_id: f.manager_id||'' }); setShowFutsalModal(true); };

  const saveFutsal = async (e) => {
    e.preventDefault(); setLoading(true); try {
      if (editingFutsal) { await api.put(`/super-admin/futsals/${editingFutsal.id}`, futsalForm); }
      else { await api.post('/super-admin/futsals', futsalForm); }
      setShowFutsalModal(false); loadFutsals();
    } catch(err){ setError('Failed to save futsal'); } finally{ setLoading(false); }
  };

  const toggleFutsalActive = async (f) => { try{ await api.patch(`/super-admin/futsals/${f.id}/toggle-active`); loadFutsals(); }catch(e){ setError('Failed'); } };

  return (
    <ProtectedRoute allowedRoles={["super-admin"]}>
      <div className="admin-dashboard">
        <main className="admin-main">
          <section className="admin-head">
            <h1>Super Admin Dashboard</h1>
            <p>Manage system-wide data and create futsal managers</p>
          </section>

          <nav className="admin-nav" style={{marginTop:12}}>
            <button className={tab==='futsals'?'active':''} onClick={()=>setTab('futsals')}>Futsals</button>
            <button className={tab==='bookings'?'active':''} onClick={()=>setTab('bookings')}>Bookings</button>
            <button className={tab==='users'?'active':''} onClick={()=>setTab('users')}>Users</button>
            <button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Create Admin</button>
          </nav>

          {tab==='futsals' && (
            <section style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3>All Futsals</h3>
                <div><button className="primary-btn" onClick={openAddFutsal}>Add Futsal</button></div>
              </div>
              {loading && <div>Loading...</div>}
              {error && <div className="admin-error">{error}</div>}
              <div style={{marginTop:8}}>
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Manager</th><th>Actions</th></tr></thead>
                  <tbody>
                    {futsals.map(f => (
                      <tr key={f.id}>
                        <td>{f.id}</td>
                        <td>{f.name}</td>
                        <td>{f.location}</td>
                        <td>{f.manager_id || '-'}</td>
                        <td>
                          <button onClick={()=>openEditFutsal(f)}>Edit</button>
                          <button onClick={()=>toggleFutsalActive(f)} style={{marginLeft:8}}>{f.active? 'Deactivate':'Activate'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab==='bookings' && (
            <section style={{marginTop:12}}>
              <h3>All Bookings</h3>
              <div style={{marginTop:8}}>
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>User</th><th>Futsal</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {bookings.map(b=> (
                      <tr key={b.id}><td>{b.id}</td><td>{b.user_name||b.user_id}</td><td>{b.futsal_name||b.futsal_id}</td><td>{b.date||b.created_at}</td><td>{b.time||b.slot}</td><td>{b.status||'-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab==='users' && (
            <section style={{marginTop:12}}>
              <h3>All Users</h3>
              <div style={{marginTop:8}}>
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.role||'user'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab==='create' && (
            <section style={{marginTop:12}}>
              <h3>Create Admin (Futsal Manager)</h3>
              <form onSubmit={handleCreateAdmin} className="admin-form">
                {/* form rendered below (already present) */}
              </form>
            </section>
          )}

          {showFutsalModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>{editingFutsal ? 'Edit Futsal' : 'Add Futsal'}</h3>
                <label>
                  Name
                  <input value={futsalForm.name} onChange={e=>setFutsalForm({...futsalForm, name: e.target.value})} />
                </label>
                <label>
                  Location
                  <input value={futsalForm.location} onChange={e=>setFutsalForm({...futsalForm, location: e.target.value})} />
                </label>
                <label>
                  Manager ID
                  <input value={futsalForm.manager_id} onChange={e=>setFutsalForm({...futsalForm, manager_id: e.target.value})} />
                </label>
                <div className="modal-actions">
                  <button onClick={saveFutsal}>{editingFutsal ? 'Update' : 'Create'}</button>
                  <button onClick={()=>setShowFutsalModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <section style={{marginTop:20}}>
            <h3>Create Admin (Futsal Manager)</h3>
            <form onSubmit={handleCreateAdmin} className="admin-form">
              <div className="field">
                <label>Name</label>
                <input placeholder="Full name" value={adminForm.name} onChange={e=>setAdminForm({...adminForm, name:e.target.value})} />
                {formErrors.name && <div className="field-error">{formErrors.name}</div>}
              </div>

              <div className="field">
                <label>Email</label>
                <input placeholder="user@example.com" value={adminForm.email} onChange={e=>setAdminForm({...adminForm, email:e.target.value})} />
                {formErrors.email && <div className="field-error">{formErrors.email}</div>}
              </div>

              <div className="field">
                <label>Phone</label>
                <input placeholder="Optional phone" value={adminForm.phone} onChange={e=>setAdminForm({...adminForm, phone:e.target.value})} />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="Password" value={adminForm.password} onChange={e=>setAdminForm({...adminForm, password:e.target.value})} />
                  {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                </div>

                <div className="field">
                  <label>Confirm</label>
                  <input type="password" placeholder="Confirm" value={adminForm.password_confirmation} onChange={e=>setAdminForm({...adminForm, password_confirmation:e.target.value})} />
                  {formErrors.password_confirmation && <div className="field-error">{formErrors.password_confirmation}</div>}
                </div>
              </div>

              <div className="field">
                <label>Assign Futsal (optional)</label>
                <select value={adminForm.futsal_id} onChange={e=>setAdminForm({...adminForm, futsal_id: e.target.value})}>
                  <option value="">-- none --</option>
                  {futsals.map(f=> <option key={f.id} value={f.id}>{f.id} - {f.name}</option>)}
                </select>
              </div>

              <div className="btn-row">
                <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Admin'}</button>
              </div>
              {error && <div className="admin-error" style={{marginTop:8}}>{error}</div>}
            </form>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;
