import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSessionContext } from "../context/SessionContext";
import CreateSession from "./CreateSession";
import JoinSession from "./JoinSession";
import CharacterSelect from "./CharacterSelect";
import SessionLobby from "./SessionLobby";
import "../session.css";
import "../session-extra.css";

type SessionMode = "choose" | "create" | "join";

export default function SessionView() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");

  const {
    phase,
    session,
    error,
    rollLog,
    activeEffects,
    rollRequests,
    isGM,
    create,
    join,
    disconnect,
    pause,
    resume,
    end,
    clearError,
    activeCharacter,
    setActiveCharacter,
    presenceMap,
  } = useSessionContext();

  const [mode, setMode] = useState<SessionMode>(
    initialMode === "create" ? "create" : initialMode === "join" ? "join" : "choose"
  );

  // Whether the player still needs to pick a character
  const needsCharacterSelect = phase === "connected" && !isGM && !activeCharacter;

  // If a join code was passed in the URL, auto-join
  useEffect(() => {
    if (routeCode && phase === "idle") {
      join(routeCode);
    }
  }, [routeCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Choose screen (idle) ─────────────────────────────────────

  if (phase === "idle" && mode === "choose") {
    return (
      <div className="session-view">
        <div className="session-choose">
          <h1 className="session-choose__title">Live Session</h1>
          <p className="session-choose__subtitle">
            Play together in real-time with your group
          </p>

          <div className="session-choose__options">
            <button
              className="session-choose__option session-choose__option--gm"
              onClick={() => setMode("create")}
            >
              <span className="session-choose__option-icon">🏰</span>
              <span className="session-choose__option-label">Start as GM</span>
              <span className="session-choose__option-desc">
                Create a session and invite players
              </span>
            </button>

            <button
              className="session-choose__option session-choose__option--player"
              onClick={() => setMode("join")}
            >
              <span className="session-choose__option-icon">🗝️</span>
              <span className="session-choose__option-label">Join as Player</span>
              <span className="session-choose__option-desc">
                Enter a code from your GM
              </span>
            </button>
          </div>

          <button
            className="btn btn--outline session-choose__back"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Create screen ────────────────────────────────────────────

  if ((phase === "idle" || phase === "creating") && mode === "create") {
    return (
      <div className="session-view">
        <CreateSession
          onCreate={create}
          onCancel={() => {
            clearError();
            setMode("choose");
          }}
          loading={phase === "creating"}
        />
      </div>
    );
  }

  // ── Join screen ──────────────────────────────────────────────

  if ((phase === "idle" || phase === "joining" || phase === "error") && mode === "join") {
    return (
      <div className="session-view">
        <JoinSession
          onJoin={async (code) => {
            await join(code);
          }}
          onCancel={() => {
            clearError();
            setMode("choose");
          }}
          loading={phase === "joining"}
          error={error?.message ?? null}
        />
      </div>
    );
  }

  // ── Character selection (player only, after join) ────────────

  if (needsCharacterSelect) {
    return (
      <div className="session-view">
        <CharacterSelect
          onSelect={(char) => setActiveCharacter(char)}
          onSkip={() => setActiveCharacter(null as any)} // Allow skipping by setting a sentinel
        />
      </div>
    );
  }

  // ── Connected — show lobby ───────────────────────────────────

  if (phase === "connected" && session) {
    return (
      <div className="session-view">
        <SessionLobby
          session={session}
          isGM={isGM}
          rollLog={rollLog}
          activeEffects={activeEffects}
          rollRequests={rollRequests}
          activeCharacter={activeCharacter}
          presenceMap={presenceMap}
          onPause={pause}
          onResume={resume}
          onEnd={end}
          onDisconnect={async () => {
            await disconnect();
            setMode("choose");
          }}
        />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="session-view">
        <div className="session-error">
          <div className="session-error__icon">
            {error?.code === "ENDED" ? "🏁" : "⚠️"}
          </div>
          <h2 className="session-error__title">
            {error?.code === "ENDED"
              ? "Session Ended"
              : error?.code === "DISCONNECTED"
              ? "Disconnected"
              : "Session Error"}
          </h2>
          <p className="session-error__message">
            {error?.message || "Something went wrong."}
          </p>
          <div className="session-error__actions">
            <button
              className="btn btn--primary"
              onClick={() => {
                clearError();
                setMode("choose");
              }}
            >
              Back to Session Menu
            </button>
            <button
              className="btn btn--outline"
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / transitional state ─────────────────────────────

  return (
    <div className="session-view">
      <div className="session-loading">
        <span className="session-loading__spinner" />
        <p>Connecting to session…</p>
      </div>
    </div>
  );
}