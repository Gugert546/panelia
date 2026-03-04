import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./features/dashboard/DashboardPage";
import SpotifyCallback from "./features/Widgets/builtins/SpotifyWidget/SpotifyCallback";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Spotify OAuth callback */}
      <Route path="/callback" element={<SpotifyCallback />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" />} />

    </Routes>
  );
}