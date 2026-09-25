// @ts-nocheck
import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";
import MeetsPage from "./components/MeetsPage";
import Calendar from "./components/Calendar";
import SearchFriendsPage from "./components/SearchFriendsPage";
import MyFriendsPage from "./components/MyFriendsPage";
import NewConnectionPage from "./components/NewConnectionPage";
import SentRequestsPage from "./components/SentRequestsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useApp } from "./context/AppContext";
import { getToken } from "./utils/auth";

const API = import.meta.env.VITE_API_URL;

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  // All shared state now comes from context — no local duplicates
  const { user, connections, login, logout, refreshConnections } = useApp();
  const navigate = useNavigate();

  const handleLogin = (userData) => {
    login(userData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAccept = async (fromUserId) => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API}/accept-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromUserId }),
      });
      if (!res.ok) throw new Error("Failed to accept request");
      toast.success("Friend request accepted!");
      refreshConnections(); // Refresh via context — single source of truth
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <ToastContainer />
      <Navbar user={user} onLogout={handleLogout} connections={connections} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register onRegister={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Routes — each wrapped in an ErrorBoundary so one
              crashing page can't take down the whole app */}
          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><Dashboard user={user} /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/friends" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><MyFriendsPage connections={connections} /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/new-connection" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><NewConnectionPage connections={connections} onAccept={handleAccept} /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/sent-requests" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><SentRequestsPage connections={connections} /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/search-friends" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><SearchFriendsPage /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><Calendar user={user} /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/meets" element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><MeetsPage user={user} /></ErrorBoundary>
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
