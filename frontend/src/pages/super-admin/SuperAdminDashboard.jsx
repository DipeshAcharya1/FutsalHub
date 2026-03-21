import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";
import api from "../../api/axios";
import SuperAdminHeader from "./SuperAdminHeader";
import FutsalsTab from "./FutsalsTab";
import AdminsTab from "./AdminsTab";
import FutsalModal from "./FutsalModal";
import "../../styles/SuperAdminDashboard.css";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [futsals, setFutsals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [tab, setTab] = useState("futsals");
  const [showFutsalModal, setShowFutsalModal] = useState(false);
  const [editingFutsal, setEditingFutsal] = useState(null);
  
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
    contact_number: "",
    description: "",
    manager_id: ""
  });

  // Show success message
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Load data
  const loadFutsals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/super-admin/futsals");
      setFutsals(res.data || []);
    } catch (e) {
      setError("Failed to load futsals");
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get("/super-admin/admins");
      setAdmins(res.data || []);
    } catch (e) {
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFutsals();
    loadAdmins();
  }, []);

  useEffect(() => {
    if (tab === "admins") loadAdmins();
  }, [tab]);

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
      contact_number: "",
      description: "",
      manager_id: ""
    });
    setShowFutsalModal(true);
  };

  const openEditFutsal = (f) => {
    setEditingFutsal(f);
    setFutsalForm({
      name: f.futsal_name || "",
      location: f.location || "",
      contact_number: f.contact_number || "",
      description: f.description || "",
      manager_id: f.manager_id || ""
    });
    setShowFutsalModal(true);
  };

  const saveFutsal = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingFutsal) {
        await api.put(`/super-admin/futsals/${editingFutsal.id}`, futsalForm);
        showSuccess("Futsal updated successfully");
      } else {
        await api.post("/super-admin/futsals", futsalForm);
        showSuccess("Futsal created successfully");
      }
      setShowFutsalModal(false);
      loadFutsals();
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
    } catch (e) {
      setError("Failed to toggle status");
    }
  };

  const deleteFutsal = async (f) => {
    if (!window.confirm(`Are you sure you want to delete ${f.futsal_name}?`)) return;
    try {
      await api.delete(`/super-admin/futsals/${f.id}`);
      showSuccess("Futsal deleted successfully");
      loadFutsals();
      loadAdmins();
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

          <div className="stats-summary">
            <div className="stat-card">
              <span className="stat-value">{futsals.length}</span>
              <span className="stat-label">Total Futsals</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{admins.length}</span>
              <span className="stat-label">Total Admins</span>
            </div>
          </div>

          <nav className="admin-nav">
            <button className={tab === "futsals" ? "active" : ""} onClick={() => setTab("futsals")}>
              Futsals
            </button>
            <button className={tab === "admins" ? "active" : ""} onClick={() => setTab("admins")}>
              Admins
            </button>
          </nav>

          {tab === "futsals" && (
            <FutsalsTab
              futsals={futsals}
              loading={loading}
              onAdd={openAddFutsal}
              onEdit={openEditFutsal}
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
      </div>
    </ProtectedRoute>
  );
};

export default SuperAdminDashboard;