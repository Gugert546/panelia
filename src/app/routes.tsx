import { Routes, Route } from "react-router-dom";
import DashboardPage from "./features/dashboard/DashboardPage";
import SpotifyCallback from "./features/Widgets/builtins/SpotifyWidget/SpotifyCallback";
import PrivacyPolicyPage from "./features/privacy/PrivacyPolicyPage";
import TermsOfServicePage from "./features/terms/TermsOfServicePage";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Spotify OAuth callback */}
      <Route path="/callback" element={<SpotifyCallback />} />

      {/* Privacy policy */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Terms of service */}
      <Route path="/terms" element={<TermsOfServicePage />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Homepage */}
      <Route path="/" element={<DashboardPage />} />

    </Routes>
  );
}
