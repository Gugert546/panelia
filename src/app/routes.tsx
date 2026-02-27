import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/useAuth";

import DashboardPage from "./features/dashboard/DashboardPage";

import type { ReactNode } from "react";

type ProtectedProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedProps) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Laster...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
     
      {/* Protected route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
/>
      /

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}