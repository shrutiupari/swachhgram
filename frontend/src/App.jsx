import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login             from "./pages/Login";
import Register          from "./pages/Register";
import CitizenDashboard  from "./pages/CitizenDashboard";
import ReportGarbage     from "./pages/ReportGarbage";
import MyReports         from "./pages/MyReports";
import GPDashboard       from "./pages/GPDashboard";
import AdminDashboard    from "./pages/AdminDashboard";
import Navbar            from "./components/Navbar";

function ProtectedRoute({ children, roles }) {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-forest-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, role } = useAuth();

  const defaultRoute = () => {
    if (!user) return "/login";
    if (role === "admin")    return "/admin";
    if (role === "gp_staff") return "/gp";
    return "/dashboard";
  };

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login"    element={user ? <Navigate to={defaultRoute()} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={defaultRoute()} /> : <Register />} />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={["citizen"]}>
            <CitizenDashboard />
          </ProtectedRoute>
        }/>
        <Route path="/report" element={
          <ProtectedRoute roles={["citizen"]}>
            <ReportGarbage />
          </ProtectedRoute>
        }/>
        <Route path="/my-reports" element={
          <ProtectedRoute roles={["citizen"]}>
            <MyReports />
          </ProtectedRoute>
        }/>
        <Route path="/gp" element={
          <ProtectedRoute roles={["gp_staff", "admin"]}>
            <GPDashboard />
          </ProtectedRoute>
        }/>
        <Route path="/admin" element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }/>

        <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
