import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@features/auth/context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wrap any route that requires authentication.
 * Shows a loading spinner while auth state is resolving,
 * then redirects to /login if no user is signed in.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
