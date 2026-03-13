import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@features/auth/context/AuthContext";
import { useSessionContext } from "@features/session";
import type { Character } from "@shared/types/dnd";
import {
  createCharacter,
  deleteCharacter,
  onCharactersByOwner,
} from "@shared/services/characterService";

export default function Dashboard() {
  const { user, profile, logout } = useAuth();
  const { phase, session, isGM, error, clearError } = useSessionContext();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // ── Real-time character list ─────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const unsub = onCharactersByOwner(user.uid, (chars) => {
      setCharacters(chars.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────────

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createCharacter(user.uid);
      navigate(`/character/${id}`);
    } catch (err) {
      console.error("Failed to create character:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCharacter(id);
    } catch (err) {
      console.error("Failed to delete character:", err);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>D&amp;D Character Sheet</h1>
        <div className="dashboard-user">
          <span>
            Signed in as <strong>{profile?.displayName}</strong>
          </span>
          <button className="btn btn--outline" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <h2>Welcome, {profile?.displayName}!</h2>
          <p>Manage your characters below or create a new one to get started.</p>
        </section>

        <div className="dashboard-grid">
          {/* ── Characters ─────────────────────────────────── */}
          <div className="dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <h3>My Characters</h3>
              <button
                className="btn btn--primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Creating…" : "+ New Character"}
              </button>
            </div>

            {loading && <p className="dashboard-card__loading">Loading…</p>}

            {!loading && characters.length === 0 && (
              <p className="dashboard-card__empty">
                No characters yet. Create your first character to get started.
              </p>
            )}

            {!loading && characters.length > 0 && (
              <div className="dashboard-chars">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="dashboard-char"
                    onClick={() => navigate(`/character/${char.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate(`/character/${char.id}`);
                    }}
                  >
                    <div className="dashboard-char__avatar">
                      {char.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="dashboard-char__info">
                      <span className="dashboard-char__name">{char.name}</span>
                      <span className="dashboard-char__meta">
                        {char.race && `${char.race} `}
                        {char.class && `${char.class} `}
                        {char.level > 0 && `Lv ${char.level}`}
                      </span>
                    </div>
                    <button
                      className="dashboard-char__delete"
                      title="Delete character"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(char.id, char.name);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Live Sessions ─────────────────────────────── */}
          <div className="dashboard-card">
            <h3>Live Sessions</h3>

            {/* Active session indicator */}
            {phase === "connected" && session && (
              <div className="dashboard-session-active">
                <span className="dashboard-session-active__dot" />
                <div className="dashboard-session-active__info">
                  <span className="dashboard-session-active__label">
                    You're in a live session
                  </span>
                  <span className="dashboard-session-active__code">
                    Code: {session.sessionCode} ·{" "}
                    {session.connectedPlayers.length} player
                    {session.connectedPlayers.length !== 1 ? "s" : ""}
                    {isGM ? " · GM" : ""}
                  </span>
                </div>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => navigate("/session")}
                >
                  Return to Session
                </button>
              </div>
            )}

            {/* Connecting / joining in progress */}
            {(phase === "creating" || phase === "joining") && (
              <p className="dashboard-card__loading">Connecting to session…</p>
            )}

            {/* Session actions — only when not in any session */}
            {phase === "idle" && (
              <>
                <p>Start a session as GM or join one as a player.</p>
                <div className="dashboard-session-actions">
                  <button
                    className="btn btn--primary"
                    onClick={() => navigate("/session?mode=create")}
                  >
                    🏰 Start as GM
                  </button>
                  <button
                    className="btn btn--outline"
                    onClick={() => navigate("/session?mode=join")}
                  >
                    🗝️ Join Session
                  </button>
                </div>
              </>
            )}

            {/* Error state — session ended or disconnected */}
            {phase === "error" && !session && (
              <>
                <p>
                  {error?.code === "ENDED"
                    ? "The GM has ended the session. Ready for the next one?"
                    : "Something went wrong with the last session."}
                </p>
                <div className="dashboard-session-actions">
                  <button
                    className="btn btn--primary"
                    onClick={() => {
                      clearError();
                      navigate("/session?mode=create");
                    }}
                  >
                    🏰 Start as GM
                  </button>
                  <button
                    className="btn btn--outline"
                    onClick={() => {
                      clearError();
                      navigate("/session?mode=join");
                    }}
                  >
                    🗝️ Join Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}