import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Futsals from "./pages/Futsals";
import Profile from "./pages/UserProfile";
import FutsalDetails from "./pages/futsal/FutsalDetails";
import BookingConfirmation from "./pages/futsal/BookingConfirmation";
import BookingSuccess from "./pages/futsal/BookingSuccess";
import MyBookings from "./pages/bookings/MyBookings";
import BookingDetails from "./pages/bookings/BookingDetails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter> 
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/futsal/:id" element={<FutsalDetails />} />
        <Route path="/futsals" element={<Futsals />} />

        {/* Protected Routes */}
        <Route
          path="/futsal/:id/confirm-booking"
          element={
            <ProtectedRoute>
              <BookingConfirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/success"
          element={
            <ProtectedRoute>
              <BookingSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/:id"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/:futsal"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["super-admin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;