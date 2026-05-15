import { Routes, Route } from "react-router-dom";
import DashboardPage from "./features/dashboard/DashboardPage";
import SpotifyCallback from "./features/Widgets/builtins/SpotifyWidget/SpotifyCallback";
import PrivacyPolicyPage from "./features/privacy/PrivacyPolicyPage";
import TermsOfServicePage from "./features/terms/TermsOfServicePage";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Tilbakekobling etter Spotify OAuth */}
      <Route path="/callback" element={<SpotifyCallback />} />

      {/* Personvernerklaering */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Bruksvilkar */}
      <Route path="/terms" element={<TermsOfServicePage />} />

      {/* Dashboard-side */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Forside peker til samme dashboard-side. */}
      <Route path="/" element={<DashboardPage />} />

    </Routes>
  );
}
