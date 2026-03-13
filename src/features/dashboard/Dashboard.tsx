import { useAuth } from "@features/auth/context/AuthContext";

export default function Dashboard() {
  const { profile, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>D&amp;D Character Sheet</h1>
        <div className="dashboard-user">
          <span>Signed in as <strong>{profile?.displayName}</strong></span>
          <button className="btn btn--outline" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <h2>Welcome, {profile?.displayName}!</h2>
          <p>
            Your characters and campaigns will appear here. This is the Phase 1
            skeleton — character sheets, sessions, and dice rolling are coming
            next.
          </p>
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>My Characters</h3>
            <p>No characters yet. Create your first character to get started.</p>
            <button className="btn btn--primary" disabled>
              + New Character (coming soon)
            </button>
          </div>

          <div className="dashboard-card">
            <h3>Campaigns</h3>
            <p>Join or create a campaign to play with your group.</p>
            <button className="btn btn--primary" disabled>
              + New Campaign (coming soon)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
