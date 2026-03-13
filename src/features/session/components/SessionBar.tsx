import { useNavigate, useLocation } from "react-router-dom";
import { useSessionContext } from "../context/SessionContext";

/**
 * SessionBar — a compact persistent bar that displays at the top of every
 * page (except /session itself) when the user is connected to a live session.
 * Shows session code, status, player count, and a quick-nav button back to
 * the session view.
 *
 * Renders nothing when no session is active or when already on /session.
 */
export default function SessionBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { phase, session, isGM, activeCharacter, disconnect } = useSessionContext();

  // Only show when connected AND not already on the session page
  if (phase !== "connected" || !session) return null;
  if (location.pathname.startsWith("/session")) return null;

  const statusDot =
    session.status === "active"
      ? "session-bar__dot--active"
      : session.status === "paused"
      ? "session-bar__dot--paused"
      : "session-bar__dot--ended";

  return (
    <div className="session-bar">
      <div className="session-bar__left">
        <span className={`session-bar__dot ${statusDot}`} />
        <span className="session-bar__label">
          {session.status === "active" ? "Live" : session.status === "paused" ? "Paused" : "Ended"}
        </span>
        <span className="session-bar__divider">·</span>
        <span className="session-bar__code">{session.sessionCode}</span>
        <span className="session-bar__divider">·</span>
        <span className="session-bar__players">
          {session.connectedPlayers.length} player{session.connectedPlayers.length !== 1 ? "s" : ""}
        </span>
        {activeCharacter && (
          <>
            <span className="session-bar__divider">·</span>
            <span className="session-bar__character">
              Playing as {activeCharacter.name}
            </span>
          </>
        )}
        {isGM && (
          <span className="session-bar__gm-badge">GM</span>
        )}
      </div>

      <div className="session-bar__right">
        {session.round > 0 && (
          <span className="session-bar__round">
            Round {session.round}
          </span>
        )}
        <button
          className="session-bar__btn session-bar__btn--view"
          onClick={() => navigate("/session")}
        >
          View Session
        </button>
        <button
          className="session-bar__btn session-bar__btn--leave"
          onClick={async () => {
            await disconnect();
            navigate("/dashboard");
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}