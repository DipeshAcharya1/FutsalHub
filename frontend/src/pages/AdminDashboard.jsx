import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const { futsal } = useParams();
  const futsalId = futsal || null;
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [tab, setTab] = useState("overview");
  const [counts, setCounts] = useState({ futsals: 0, bookings: 0, users: 0 });
  const [futsals, setFutsals] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Court/Futsal modal states
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [courtForm, setCourtForm] = useState({ name: "", location: "", price: "" });

  // Timeslot modal states
  const [showTimeslotModal, setShowTimeslotModal] = useState(false);
  const [activeCourtTimeslots, setActiveCourtTimeslots] = useState([]);
  const [activeCourt, setActiveCourt] = useState(null);
  const [timeslotForm, setTimeslotForm] = useState({ id: null, start: "", end: "", price: "" });

  // Report states
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDate, setReportDate] = useState("");
  const [reportData, setReportData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!futsalId) {
        setError('Futsal id missing in route');
        setLoading(false);
        return;
      }

      const [cRes, bRes, uRes] = await Promise.allSettled([
        api.get(`/futsals/${futsalId}/courts`),
        api.get(`/futsals/${futsalId}/bookings`),
        api.get(`/futsals/${futsalId}/users`),
      ]);

      const courtsData = cRes.status === "fulfilled" ? cRes.value.data : [];
      const bookingsData = bRes.status === "fulfilled" ? bRes.value.data : [];
      const usersData = uRes.status === "fulfilled" ? uRes.value.data : [];

      setFutsals(Array.isArray(courtsData) ? courtsData : courtsData.data || []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : bookingsData.data || []);
      setUsers(Array.isArray(usersData) ? usersData : usersData.data || []);

      setCounts({
        futsals: Array.isArray(courtsData) ? courtsData.length : (courtsData.total || 0),
        bookings: Array.isArray(bookingsData) ? bookingsData.length : (bookingsData.total || 0),
        users: Array.isArray(usersData) ? usersData.length : (usersData.total || 0),
      });
    } catch (err) {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [futsalId]);

  const refresh = () => {
    loadData();
  };

  const openAddCourt = () => {
    setEditingCourt(null);
    setCourtForm({ name: "", location: "", price: "" });
    setShowCourtModal(true);
  };

  const openEditCourt = (court) => {
    setEditingCourt(court);
    setCourtForm({ name: court.name || "", location: court.location || "", price: court.price || "" });
    setShowCourtModal(true);
  };

  const saveCourt = async () => {
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      if (editingCourt) {
        await api.put(`/futsals/${futsalId}/courts/${editingCourt.id || editingCourt._id}`, courtForm);
      } else {
        await api.post(`/futsals/${futsalId}/courts`, courtForm);
      }
      setShowCourtModal(false);
      loadData();
    } catch (err) {
      setError("Failed to save court");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourtActive = async (court) => {
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      const id = court.id || court._id;
      await api.patch(`/futsals/${futsalId}/courts/${id}/toggle-active`);
      loadData();
    } catch (err) {
      setError("Failed to toggle court status");
    } finally {
      setLoading(false);
    }
  };

  const openTimeslotManager = async (court) => {
    setActiveCourt(court);
    setShowTimeslotModal(true);
    setTimeslotForm({ id: null, start: "", end: "", price: "" });
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      const res = await api.get(`/futsals/${futsalId}/courts/${court.id || court._id}/timeslots`);
      setActiveCourtTimeslots(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      setError("Failed to load timeslots");
    } finally {
      setLoading(false);
    }
  };

  const saveTimeslot = async () => {
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      const cid = activeCourt.id || activeCourt._id;
      if (timeslotForm.id) {
        await api.put(`/futsals/${futsalId}/courts/${cid}/timeslots/${timeslotForm.id}`, timeslotForm);
      } else {
        await api.post(`/futsals/${futsalId}/courts/${cid}/timeslots`, timeslotForm);
      }
      openTimeslotManager(activeCourt);
    } catch (err) {
      setError("Failed to save timeslot");
    } finally {
      setLoading(false);
    }
  };

  const editTimeslot = (t) => {
    setTimeslotForm({ id: t.id || t._id, start: t.start, end: t.end, price: t.price });
  };

  const deleteTimeslot = async (t) => {
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      const cid = activeCourt.id || activeCourt._id;
      await api.delete(`/futsals/${futsalId}/courts/${cid}/timeslots/${t.id || t._id}`);
      openTimeslotManager(activeCourt);
    } catch (err) {
      setError("Failed to delete timeslot");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      if (!futsalId) throw new Error('futsal id missing');
      const res = await api.get(`/futsals/${futsalId}/reports`, { params: { period: reportPeriod, date: reportDate } });
      setReportData(res.data);
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <main className="admin-main">
        <section className="admin-head">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.name}!</p>
        </section>

        <nav className="admin-nav">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={tab === "courts" ? "active" : ""} onClick={() => setTab("courts")}>
            Courts ({counts.futsals})
          </button>
          <button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>
            Bookings ({counts.bookings})
          </button>
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
            Users ({counts.users})
          </button>
          <Link to="/futsals" className="link-button">Go to Public Futsals</Link>
        </nav>

        {loading && <div className="admin-loading">Loading...</div>}
        {error && <div className="admin-error">{error}</div>}

        {tab === "overview" && (
          <section className="admin-cards">
            {user?.role === "admin" && (
              <div className="admin-card">
                <h3>Total Courts</h3>
                <div className="admin-value">{counts.futsals}</div>
                <button onClick={() => setTab("courts")}>Manage Courts</button>
              </div>
            )}

            <div className="admin-card">
              <h3>Total Bookings</h3>
              <div className="admin-value">{counts.bookings}</div>
              <button onClick={() => setTab("bookings")}>Manage Bookings</button>
            </div>

            {user?.role === "admin" && (
              <div className="admin-card">
                <h3>Total Users</h3>
                <div className="admin-value">{counts.users}</div>
                <button onClick={() => setTab("users")}>Manage Users</button>
              </div>
            )}
          </section>
        )}

        {/* Reports */}
        {user?.role === "admin" && (
          <section className="admin-reports">
            <h3>Generate Report</h3>
            <div className="report-controls">
              <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              <button onClick={generateReport}>Generate</button>
            </div>
            {reportData && (
              <pre className="report-output">{JSON.stringify(reportData, null, 2)}</pre>
            )}
          </section>
        )}

        {tab === "courts" && (
          <section className="admin-table-section">
            <h2>Courts</h2>
            {user?.role === "admin" && (
              <div style={{ marginBottom: 12 }}>
                <button onClick={openAddCourt}>Add Court</button>
              </div>
            )}
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {futsals.length === 0 && (
                    <tr>
                      <td colSpan={5}>No courts available</td>
                    </tr>
                  )}
                  {futsals.map((f) => (
                    <tr key={f.id || f._id}>
                      <td>{f.id || f._id}</td>
                      <td>{f.name || f.title || "-"}</td>
                      <td>{f.location || f.address || "-"}</td>
                      <td>{f.price ? `₹${f.price}` : "-"}</td>
                      <td>
                        {user?.role === "admin" && (
                          <>
                            <button onClick={() => openEditCourt(f)}>Edit</button>
                            <button onClick={() => openTimeslotManager(f)}>Timeslots</button>
                            <button onClick={() => toggleCourtActive(f)}>
                              {f.active === false || f.is_active === false ? "Activate" : "Deactivate"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "bookings" && (
          <section className="admin-table-section">
            <h2>Bookings</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Court</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={6}>No bookings found</td>
                    </tr>
                  )}
                  {bookings.map((b) => (
                    <tr key={b.id || b._id}>
                      <td>{b.id || b._id}</td>
                      <td>{b.user?.name || b.user_name || "-"}</td>
                      <td>{b.court?.name || b.court_name || "-"}</td>
                      <td>{b.date || b.booking_date || "-"}</td>
                      <td>{b.time || b.slot || "-"}</td>
                      <td>{b.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="admin-table-section">
            <h2>Users</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4}>No users found</td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id || u._id}>
                      <td>{u.id || u._id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Court Modal */}
      {showCourtModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingCourt ? "Edit Court" : "Add Court"}</h3>
            <label>
              Name
              <input value={courtForm.name} onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })} />
            </label>
            <label>
              Location
              <input value={courtForm.location} onChange={(e) => setCourtForm({ ...courtForm, location: e.target.value })} />
            </label>
            <label>
              Base Price
              <input value={courtForm.price} onChange={(e) => setCourtForm({ ...courtForm, price: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button onClick={saveCourt}>Save</button>
              <button onClick={() => setShowCourtModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeslot Modal */}
      {showTimeslotModal && activeCourt && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Manage Timeslots - {activeCourt.name || activeCourt.title}</h3>
            <div className="timeslot-list">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCourtTimeslots.length === 0 && (
                    <tr>
                      <td colSpan={5}>No timeslots</td>
                    </tr>
                  )}
                  {activeCourtTimeslots.map((t) => (
                    <tr key={t.id || t._id}>
                      <td>{t.id || t._id}</td>
                      <td>{t.start}</td>
                      <td>{t.end}</td>
                      <td>{t.price}</td>
                      <td>
                        <button onClick={() => editTimeslot(t)}>Edit</button>
                        <button onClick={() => deleteTimeslot(t)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="timeslot-form">
              <h4>{timeslotForm.id ? "Edit Timeslot" : "Add Timeslot"}</h4>
              <label>
                Start
                <input value={timeslotForm.start} onChange={(e) => setTimeslotForm({ ...timeslotForm, start: e.target.value })} placeholder="HH:MM" />
              </label>
              <label>
                End
                <input value={timeslotForm.end} onChange={(e) => setTimeslotForm({ ...timeslotForm, end: e.target.value })} placeholder="HH:MM" />
              </label>
              <label>
                Price
                <input value={timeslotForm.price} onChange={(e) => setTimeslotForm({ ...timeslotForm, price: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button onClick={saveTimeslot}>Save Timeslot</button>
                <button onClick={() => setShowTimeslotModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;