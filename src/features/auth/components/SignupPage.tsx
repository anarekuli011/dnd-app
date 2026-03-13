import React, { useState } from "react";
import { useAuth } from "@features/auth/context/AuthContext";
import { Link } from "react-router-dom";

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    try {
      await signup(email, password, displayName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Begin your adventure</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Display Name
            <input
              className="auth-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              placeholder="Gandalf the Grey"
            />
          </label>

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="adventurer@example.com"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>

          <label className="auth-label">
            Confirm Password
            <input
              className="auth-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>

          <button className="auth-btn auth-btn--primary" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="auth-btn auth-btn--google"
          onClick={handleGoogle}
          disabled={busy}
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
