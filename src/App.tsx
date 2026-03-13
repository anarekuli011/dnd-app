import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@features/auth/components/LoginPage";
import SignupPage from "@features/auth/components/SignupPage";
import AuthGuard from "@features/auth/components/AuthGuard";
import Dashboard from "@features/dashboard/Dashboard";
import { CharacterSheet } from "@features/character-sheet";
import { SessionView, SessionBar } from "@features/session";

export default function App() {
  return (
    <>
      {/* Persistent session bar — shows only when connected */}
      <SessionBar />

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
        <Route
          path="/character/:id"
          element={
            <AuthGuard>
              <CharacterSheet />
            </AuthGuard>
          }
        />

        {/* Session routes */}
        <Route
          path="/session"
          element={
            <AuthGuard>
              <SessionView />
            </AuthGuard>
          }
        />
        <Route
          path="/session/:code"
          element={
            <AuthGuard>
              <SessionView />
            </AuthGuard>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}