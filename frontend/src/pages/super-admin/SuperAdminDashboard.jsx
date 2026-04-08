import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";
import api from "../../api/axios";
import SuperAdminHeader from "./SuperAdminHeader";
import FutsalsTab from "./FutsalsTab";
import AdminsTab from "./AdminsTab";
import BookingsTab from "./BookingsTab";
import UsersTab from "./UsersTab";
import StatsTab from "./StatsTab";
import FutsalDetailsModal from "./FutsalDetailsModal";
import FutsalModal from "./FutsalModal";
import SuperAdminReports from "./SuperAdminReports";
import "../../styles/SuperAdminDashboard.css";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL or default to "stats"
  const getTabFromUrl = () => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['stats', 'futsals', 'admins', 'bookings', 'users'];
    return tabParam && validTabs.includes(tabParam) ? tabParam : 'stats';
  };

  const [futsals, setFutsals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [tab, setTab] = useState(getTabFromUrl);
  const [showFutsalModal, setShowFutsalModal] = useState(false);
  const [showFutsalDetailsModal, setShowFutsalDetailsModal] = useState(false);
  const [editingFutsal, setEditingFutsal] = useState(null);
  const [selectedFutsal, setSelectedFutsal] = useState(null);
  const [selectedFutsalId, setSelectedFutsalId] = useState(null);
  
  // Admin form state
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
  
  // Futsal form state
  const [futsalForm, setFutsalForm] = useState({
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    contact_number: "",
    description: "",
    manager_id: "",
    image: null
  });

  // Update URL when tab changes
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Load all data
  const loadFutsals = async () => {
    try {
      const res = await api.get("/super-admin/futsals");
      setFutsals(res.data || []);
    } catch (e) {
      setError("Failed to load futsals");
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await api.get("/super-admin/admins");
      setAdmins(res.data || []);
    } catch (e) {
      setError("Failed to load admins");
    }
  };

  const loadBookings = async (futsalId = null) => {
    try {
      const url = futsalId 
        ? `/super-admin/bookings?futsal_id=${futsalId}`
        : "/super-admin/bookings";
      const res = await api.get(url);
      setBookings(res.data || []);
    } catch (e) {
      setError("Failed to load bookings");
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/super-admin/users");
      setUsers(res.data || []);
    } catch (e) {
      setError("Failed to load users");
    }
  };

  const loadStats = async (futsalId = null) => {
    try {
      const url = futsalId 
        ? `/super-admin/stats?futsal_id=${futsalId}`
        : "/super-admin/stats";
      const res = await api.get(url);
      setStats(res.data);
    } catch (e) {
      setError("Failed to load stats");
    }
  };

  const loadFutsalDetails = async (futsalId) => {
    setLoading(true);
    try {
      const res = await api.get(`/super-admin/futsals/${futsalId}`);
      setSelectedFutsal(res.data);
      setShowFutsalDetailsModal(true);
    } catch (e) {
      setError("Failed to load futsal details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadFutsals();
    loadAdmins();
    loadBookings();
    loadUsers();
  }, []);

  // Handle futsal filter change
  const handleFutsalFilter = (futsalId) => {
    setSelectedFutsalId(futsalId);
    loadStats(futsalId);
    loadBookings(futsalId);
  };

  // Admin functions
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const errs = {};
    if (!adminForm.name.trim()) errs.name = "Name is required";
    if (!adminForm.email.trim()) errs.email = "Email is required";
    if (!adminForm.password) errs.password = "Password is required";
    if (adminForm.password !== adminForm.password_confirmation)
      errs.password_confirmation = "Passwords do not match";

    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/super-admin/admins", adminForm);
      setAdminForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
        futsal_id: ""
      });
      showSuccess("Admin created successfully");
      loadAdmins();
      loadFutsals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create admin");
      if (err.response?.data?.errors) setFormErrors(err.response.data.errors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    try {
      await api.delete(`/super-admin/admins/${adminId}`);
      showSuccess("Admin deleted successfully");
      loadAdmins();
      loadFutsals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete admin");
    }
  };

  // Futsal functions
  const openAddFutsal = () => {
    setEditingFutsal(null);
    setFutsalForm({
      name: "",
      location: "",
      latitude: "",
      longitude: "",
      contact_number: "",
      description: "",
      manager_id: "",
      image: null
    });
    setShowFutsalModal(true);
  };

  const openEditFutsal = (f) => {
    setEditingFutsal(f);
    setFutsalForm({
      name: f.futsal_name || "",
      location: f.location || "",
      latitude: f.latitude || "",
      longitude: f.longitude ||"",
      contact_number: f.contact_number || "",
      description: f.description || "",
      manager_id: f.manager_id || "",
      image: null
    });
    setShowFutsalModal(true);
  };

  const saveFutsal = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append('name', futsalForm.name);
    formData.append('location', futsalForm.location);
    if (futsalForm.latitude) formData.append('latitude', futsalForm.latitude);
    if (futsalForm.longitude) formData.append('longitude', futsalForm.longitude);
    if (futsalForm.contact_number) formData.append('contact_number', futsalForm.contact_number);
    if (futsalForm.description) formData.append('description', futsalForm.description);
    if (futsalForm.manager_id) formData.append('manager_id', futsalForm.manager_id);
    if (futsalForm.image) formData.append('image', futsalForm.image);
    
    try {
      if (editingFutsal) {
        await api.post(`/super-admin/futsals/${editingFutsal.id}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess("Futsal updated successfully");
      } else {
        await api.post("/super-admin/futsals", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess("Futsal created successfully");
      }
      setShowFutsalModal(false);
      loadFutsals();
      loadAdmins();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save futsal");
    } finally {
      setLoading(false);
    }
  };

  const toggleFutsalActive = async (f) => {
    if (!window.confirm(`Are you sure you want to ${f.active ? "deactivate" : "activate"} ${f.futsal_name}?`))
      return;
    try {
      await api.patch(`/super-admin/futsals/${f.id}/toggle-active`);
      showSuccess(`Futsal ${f.active ? "deactivated" : "activated"} successfully`);
      loadFutsals();
      loadStats(selectedFutsalId);
    } catch (e) {
      setError("Failed to toggle status");
    }
  };

  const deleteFutsal = async (f) => {
    if (!window.confirm(`Are you sure you want to delete ${f.futsal_name}? This will also delete all slots.`)) return;
    try {
      await api.delete(`/super-admin/futsals/${f.id}`);
      showSuccess("Futsal deleted successfully");
      loadFutsals();
      loadAdmins();
      if (selectedFutsalId === f.id) {
        handleFutsalFilter(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete futsal");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["super-admin"]}>
      <div className="super-admin-dashboard">
        <SuperAdminHeader onLogout={handleLogout} />

        <main className="admin-main">
          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {/* Futsal Filter */}
          <div className="filter-bar">
            <label>Filter by Futsal:</label>
            <select 
              value={selectedFutsalId || ""} 
              onChange={(e) => handleFutsalFilter(e.target.value || null)}
              className="futsal-filter-select"
            >
              <option value="">All Futsals</option>
              {futsals.map(f => (
                <option key={f.id} value={f.id}>
                  {f.futsal_name} ({f.location})
                </option>
              ))}
            </select>
            {selectedFutsalId && (
              <button 
                className="clear-filter-btn"
                onClick={() => handleFutsalFilter(null)}
              >
                Clear Filter
              </button>
            )}
          </div>

          <nav className="admin-nav">
            <button className={tab === "stats" ? "active" : ""} onClick={() => handleTabChange("stats")}>
              Dashboard
            </button>
            <button className={tab === "futsals" ? "active" : ""} onClick={() => handleTabChange("futsals")}>
              Futsals
            </button>
            <button className={tab === "admins" ? "active" : ""} onClick={() => handleTabChange("admins")}>
              Admins
            </button>
            <button className={tab === "bookings" ? "active" : ""} onClick={() => handleTabChange("bookings")}>
              Bookings
            </button>
            <button className={tab === "users" ? "active" : ""} onClick={() => handleTabChange("users")}>
              Users
            </button>
            <button className={tab === "reports" ? "active" : ""} onClick={() => handleTabChange("reports")}>
              Reports
            </button>
          </nav>

          {tab === "stats" && (
            <StatsTab 
              stats={stats} 
              selectedFutsalId={selectedFutsalId}
              futsals={futsals}
            />
          )}

          {tab === "futsals" && (
            <FutsalsTab
              futsals={futsals}
              loading={loading}
              onAdd={openAddFutsal}
              onEdit={openEditFutsal}
              onView={loadFutsalDetails}
              onToggle={toggleFutsalActive}
              onDelete={deleteFutsal}
            />
          )}

          {tab === "admins" && (
            <AdminsTab
              admins={admins}
              loading={loading}
              futsals={futsals}
              adminForm={adminForm}
              setAdminForm={setAdminForm}
              formErrors={formErrors}
              submitting={submitting}
              onCreateAdmin={handleCreateAdmin}
              onDeleteAdmin={handleDeleteAdmin}
            />
          )}

          {tab === "bookings" && (
            <BookingsTab 
              bookings={bookings} 
              loading={loading}
              futsals={futsals}
              selectedFutsalId={selectedFutsalId}
              onFilterChange={handleFutsalFilter}
            />
          )}

          {tab === "users" && (
            <UsersTab users={users} loading={loading} />
          )}

          {tab === "reports" && <SuperAdminReports />}
        </main>

        {showFutsalModal && (
          <FutsalModal
            editingFutsal={editingFutsal}
            futsalForm={futsalForm}
            setFutsalForm={setFutsalForm}
            admins={admins}
            onSave={saveFutsal}
            onClose={() => setShowFutsalModal(false)}
            loading={loading}
          />
        )}

        {showFutsalDetailsModal && selectedFutsal && (
          <FutsalDetailsModal
            futsal={selectedFutsal}
            onClose={() => setShowFutsalDetailsModal(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;