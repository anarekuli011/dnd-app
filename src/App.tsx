import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@features/auth/components/LoginPage";
import SignupPage from "@features/auth/components/SignupPage";
import AuthGuard from "@features/auth/components/AuthGuard";
import Dashboard from "@features/dashboard/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />

      {/* Placeholder routes for future phases */}
      {/* <Route path="/character/:id" element={<AuthGuard><CharacterSheet /></AuthGuard>} /> */}
      {/* <Route path="/session/:code"  element={<AuthGuard><SessionView /></AuthGuard>} /> */}

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
