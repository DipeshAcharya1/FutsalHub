import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import AdminSidebar from "./AdminSidebar";
import AdminOverview from "./AdminOverview";
import AdminSlots from "./AdminSlots";
import AdminBookings from "./AdminBookings";
import AdminPayments from "./AdminPayments";
import AdminUsers from "./AdminUsers";
import AdminReports from "./AdminReports";
import EditFutsalModal from "./EditFutsalModal";
import SlotModal from "./SlotModal";
import SettingsModal from "./SettingsModal";
import GenerateModal from "./GenerateModal";
import { generateReportPDF } from "../../utils/pdfGenerator";
import "../../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const { futsal } = useParams();
  const futsalId = futsal || null;
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Data states
  const [futsalInfo, setFutsalInfo] = useState(null);
  const [futsalLoading, setFutsalLoading] = useState(true);
  const [futsalActive, setFutsalActive] = useState(true);
  const [canModify, setCanModify] = useState(true);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [settings, setSettings] = useState(null);
  const [availableStartTimes, setAvailableStartTimes] = useState([]);
  const [availableEndTimes, setAvailableEndTimes] = useState([]);

  // Modal states
  const [editingFutsal, setEditingFutsal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Futsal form states
  const [futsalForm, setFutsalForm] = useState({
    futsal_name: "",
    location: "",
    contact_number: "",
    description: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Slot form states
  const [slotForm, setSlotForm] = useState({
    start_time: "",
    end_time: "",
    price: "",
    slot_date: "",
    is_available: true,
  });
  const [slotErrors, setSlotErrors] = useState({});

  // Report states
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookingFilter, setBookingFilter] = useState("all");

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  useEffect(() => {
    if (!futsalId) {
      setError("Futsal ID is missing from the URL.");
      return;
    }
    loadFutsalInfo();
    loadSettings();
    loadSlots();
    loadBookings();
    loadTimeSlots();
    loadReport();
  }, [futsalId]);

  useEffect(() => {
    if (tab === "payments") loadPayments();
    if (tab === "users") loadUsers();
    if (tab === "reports") loadReport();
  }, [tab]);

  const loadFutsalInfo = async () => {
    setFutsalLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId);
      const isActive = res.data.is_active !== undefined ? res.data.is_active : true;
      setFutsalActive(isActive);
      setCanModify(isActive);
      setFutsalInfo(res.data);
    } catch (err) {
      setError("Failed to load futsal information.");
    } finally {
      setFutsalLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSettings = async (newSettings) => {
    setLoading(true);
    try {
      await api.post("/admin/futsals/" + futsalId + "/settings", newSettings);
      setSettings(newSettings);
      showSuccess("Settings saved successfully");
      setShowSettingsModal(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const generateSlots = async (date, price, isBulk, startDate, endDate, daysOfWeek) => {
    setLoading(true);
    try {
      let response;
      if (isBulk) {
        response = await api.post("/admin/futsals/" + futsalId + "/bulk-generate-slots", {
          start_date: startDate,
          end_date: endDate,
          price: price,
          days_of_week: daysOfWeek
        });
      } else {
        response = await api.post("/admin/futsals/" + futsalId + "/generate-slots", {
          slot_date: date,
          price: price
        });
      }
      
      if (response.data.success) {
        showSuccess(response.data.message);
        await loadSlots();
        setShowGenerateModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate slots");
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      const res = await api.get("/time-slots");
      const slots = Array.isArray(res.data) ? res.data : [];
      setTimeSlots(slots);
      const startTimes = [...new Set(slots.map(slot => slot.start_time))].sort();
      const endTimes = [...new Set(slots.map(slot => slot.end_time))].sort();
      setAvailableStartTimes(startTimes);
      setAvailableEndTimes(endTimes);
    } catch (err) {
      console.error("Failed to load time slots:", err);
    }
  };

  const loadSlots = async () => {
    setSlotLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/courts");
      
      let slotsData = [];
      if (res.data) {
        if (res.data.slots !== undefined) {
          slotsData = res.data.slots;
          if (res.data.futsal_active !== undefined) {
            setFutsalActive(res.data.futsal_active);
            setCanModify(res.data.can_modify);
          }
        } else if (Array.isArray(res.data)) {
          slotsData = res.data;
        }
      }
      setSlots(slotsData);
    } catch (err) {
      console.error("Failed to load slots:", err);
      setError("Failed to load slots.");
    } finally {
      setSlotLoading(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/bookings");
      setBookings(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/payments");
      setPayments(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/reports", {
        params: { period: reportPeriod, date: reportDate },
      });
      setReportData(res.data);
    } catch (err) {
      console.error("Failed to load report:", err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/futsals/" + futsalId + "/reports", {
        params: { period: reportPeriod, date: reportDate },
      });
      setReportData(res.data);
    } catch (err) {
      setError("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (period, date) => {
    if (!reportData || !futsalInfo) return;
    generateReportPDF(reportData, period, date, futsalInfo.futsal_name);
  };

  const updateBookingStatus = async (bookingId, status) => {
    setLoading(true);
    try {
      await api.patch("/admin/futsals/" + futsalId + "/bookings/" + bookingId + "/status", { status });
      await loadBookings();
      showSuccess("Booking " + status + ".");
    } catch (err) {
      setError("Failed to update booking.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = async (slot) => {
    if (!canModify) {
      setError("Cannot modify slots in a deactivated futsal");
      return;
    }
    
    try {
      setSlots(prevSlots => 
        prevSlots.map(s => 
          s.id === slot.id ? { ...s, is_available: !s.is_available } : s
        )
      );
      
      await api.patch(`/admin/futsals/${futsalId}/courts/${slot.id}/toggle-active`);
      showSuccess(`Slot marked as ${slot.is_available ? 'unavailable' : 'available'}`);
    } catch (err) {
      setSlots(prevSlots => 
        prevSlots.map(s => 
          s.id === slot.id ? { ...s, is_available: slot.is_available } : s
        )
      );
      
      if (err.response?.data?.code === 'FUTSAL_DEACTIVATED') {
        setError("Cannot modify slots: Futsal is deactivated");
      } else {
        setError(err.response?.data?.message || "Failed to update slot availability.");
      }
    }
  };

  const deleteSlot = async (slot) => {
    if (!canModify) {
      setError("Cannot delete slots from a deactivated futsal");
      return;
    }
    if (!window.confirm("Delete this slot? This cannot be undone.")) return;
    
    try {
      await api.delete("/admin/futsals/" + futsalId + "/courts/" + slot.id);
      await loadSlots();
      showSuccess("Slot deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete slot.");
    }
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    if (!canModify) {
      setError("Cannot modify slots in a deactivated futsal");
      return;
    }
    
    const errs = validateSlot();
    if (Object.keys(errs).length > 0) {
      setSlotErrors(errs);
      return;
    }
    
    try {
      let timeSlotId;
      const existingTimeSlot = timeSlots.find(
        ts => ts.start_time === slotForm.start_time && ts.end_time === slotForm.end_time
      );
      
      if (existingTimeSlot) {
        timeSlotId = existingTimeSlot.id;
      } else {
        const timeSlotResponse = await api.post("/time-slots", {
          start_time: slotForm.start_time,
          end_time: slotForm.end_time
        });
        timeSlotId = timeSlotResponse.data.id;
        await loadTimeSlots();
      }
      
      const slotData = {
        slot_id: timeSlotId,
        price: slotForm.price,
        slot_date: slotForm.slot_date,
        is_available: slotForm.is_available,
      };
      
      if (editingSlot) {
        await api.put("/admin/futsals/" + futsalId + "/courts/" + editingSlot.id, slotData);
        showSuccess("Slot updated.");
      } else {
        await api.post("/admin/futsals/" + futsalId + "/courts", slotData);
        showSuccess("Slot created.");
      }
      setShowSlotModal(false);
      await loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save slot.");
    }
  };

  const validateSlot = () => {
    const errs = {};
    if (!slotForm.start_time) errs.start_time = "Start time is required.";
    if (!slotForm.end_time) errs.end_time = "End time is required.";
    if (!slotForm.price) errs.price = "Price is required.";
    if (!slotForm.slot_date) errs.slot_date = "Date is required.";
    
    if (slotForm.start_time && slotForm.end_time && slotForm.end_time <= slotForm.start_time) {
      errs.end_time = "End time must be after start time.";
    }
    
    const duplicate = slots.find(s => 
      s.id !== (editingSlot?.id || -1) &&
      s.slot_date === slotForm.slot_date &&
      s.start_time === slotForm.start_time &&
      s.end_time === slotForm.end_time
    );
    
    if (duplicate) {
      errs.general = `A slot with this time already exists for this date.`;
    }
    
    return errs;
  };

  const openEditFutsal = () => {
    if (!canModify) {
      setError("Cannot edit a deactivated futsal");
      return;
    }
    setFutsalForm({
      futsal_name: futsalInfo.futsal_name || "",
      location: futsalInfo.location || "",
      contact_number: futsalInfo.contact_number || "",
      description: futsalInfo.description || "",
    });
    setImagePreview(futsalInfo.image || null);
    setEditingFutsal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    try {
      const res = await api.post(`/admin/futsals/${futsalId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadingImage(false);
      return res.data.image_url;
    } catch (err) {
      setUploadingImage(false);
      setError(err.response?.data?.message || "Failed to upload image");
      return null;
    }
  };

  const deleteImage = async () => {
    if (!canModify) {
      setError("Cannot delete image from a deactivated futsal");
      return;
    }
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api.delete(`/admin/futsals/${futsalId}/image`);
      setImagePreview(null);
      setImageFile(null);
      await loadFutsalInfo();
      showSuccess("Image deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete image");
    } finally {
      setLoading(false);
    }
  };

  const updateFutsalInfo = async (e) => {
    e.preventDefault();
    if (!canModify) {
      setError("Cannot update a deactivated futsal");
      return;
    }
    setLoading(true);
    try {
      if (imageFile) await uploadImage();
      const response = await api.post(`/admin/futsals/${futsalId}/update`, futsalForm);
      setEditingFutsal(false);
      setFutsalInfo(response.data);
      showSuccess("Futsal information updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update futsal info");
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter(b => b.booking_date === todayDate).length;
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const today = new Date().toISOString().split('T')[0];
  const availableSlots = slots.filter(s => s.is_available && s.slot_date >= today).length;
  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter(b => b.status === bookingFilter);

  return (
    <div className="admin-dashboard">
      <AdminSidebar 
        user={user}
        futsalInfo={futsalInfo}
        futsalActive={futsalActive}
        tab={tab}
        setTab={setTab}
      />

      <main className="admin-main">
        {error && <div className="msg msg-error">{error}</div>}
        {successMsg && <div className="msg msg-success">{successMsg}</div>}
        {loading && <div className="loading-bar"></div>}

        {!futsalActive && futsalInfo && (
          <div className="deactivation-banner">
            <span>⚠️</span>
            <div>
              <h3>Futsal Deactivated</h3>
              <p>You can view data but cannot make changes.</p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <AdminOverview
            futsalInfo={futsalInfo}
            futsalLoading={futsalLoading}
            futsalActive={futsalActive}
            canModify={canModify}
            bookings={bookings}
            pendingCount={pendingCount}
            confirmedCount={confirmedCount}
            todayBookings={todayBookings}
            availableSlots={availableSlots}
            settings={settings}
            onEditFutsal={openEditFutsal}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenGenerate={() => setShowGenerateModal(true)}
            setTab={setTab}
          />
        )}

        {tab === "slots" && (
          <AdminSlots
            slots={slots}
            bookings={bookings}
            canModify={canModify}
            settings={settings}
            loading={slotLoading}
            onAddSlot={() => {
              setEditingSlot(null);
              setSlotForm({ start_time: "", end_time: "", price: "", slot_date: "", is_available: true });
              setSlotErrors({});
              setShowSlotModal(true);
            }}
            onEditSlot={(slot) => {
              setEditingSlot(slot);
              setSlotForm({
                start_time: slot.start_time || "",
                end_time: slot.end_time || "",
                price: slot.price || "",
                slot_date: slot.slot_date || "",
                is_available: slot.is_available !== false,
              });
              setSlotErrors({});
              setShowSlotModal(true);
            }}
            onToggleSlot={toggleSlot}
            onDeleteSlot={deleteSlot}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenGenerate={() => setShowGenerateModal(true)}
          />
        )}

        {tab === "bookings" && (
          <AdminBookings
            bookings={bookings}
            filteredBookings={filteredBookings}
            bookingFilter={bookingFilter}
            setBookingFilter={setBookingFilter}
            updateBookingStatus={updateBookingStatus}
          />
        )}

        {tab === "payments" && (
          <AdminPayments payments={payments} totalRevenue={totalRevenue} />
        )}

        {tab === "users" && <AdminUsers users={users} />}

        {tab === "reports" && (
          <AdminReports
            reportData={reportData}
            reportPeriod={reportPeriod}
            setReportPeriod={setReportPeriod}
            reportDate={reportDate}
            setReportDate={setReportDate}
            onGenerateReport={generateReport}
            onDownloadPDF={handleDownloadPDF}
            loading={loading}
          />
        )}
      </main>

      {editingFutsal && (
        <EditFutsalModal
          futsalForm={futsalForm}
          setFutsalForm={setFutsalForm}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          onDeleteImage={deleteImage}
          onSubmit={updateFutsalInfo}
          onClose={() => setEditingFutsal(false)}
          loading={loading}
          uploadingImage={uploadingImage}
        />
      )}

      {showSlotModal && (
        <SlotModal
          slotForm={slotForm}
          setSlotForm={setSlotForm}
          slotErrors={slotErrors}
          availableStartTimes={availableStartTimes}
          availableEndTimes={availableEndTimes}
          editingSlot={editingSlot}
          onSubmit={saveSlot}
          onClose={() => setShowSlotModal(false)}
          loading={loading}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettingsModal(false)}
          loading={loading}
        />
      )}

      {showGenerateModal && (
        <GenerateModal
          settings={settings}
          onGenerate={generateSlots}
          onClose={() => setShowGenerateModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AdminDashboard;