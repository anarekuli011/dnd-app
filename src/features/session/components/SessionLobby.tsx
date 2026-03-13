import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { PresenceEntry } from "../hooks/useSessionPresence";
import type {
  Session,
  Character,
  RollLogEntry,
  ActiveEffect,
  RollRequest,
} from "@shared/types/dnd";

// ── Types ────────────────────────────────────────────────────────

interface SessionLobbyProps {
  session: Session;
  isGM: boolean;
  rollLog: RollLogEntry[];
  activeEffects: ActiveEffect[];
  rollRequests: RollRequest[];
  activeCharacter: Character | null;
  presenceMap: Map<string, PresenceEntry>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onEnd: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function rollTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ability_check: "Ability Check",
    saving_throw: "Saving Throw",
    skill_check: "Skill Check",
    attack: "Attack",
    damage: "Damage",
    initiative: "Initiative",
    death_save: "Death Save",
    custom: "Roll",
  };
  return labels[type] || "Roll";
}

// ── Component ────────────────────────────────────────────────────

export default function SessionLobby({
  session,
  isGM,
  rollLog,
  activeEffects,
  rollRequests,
  activeCharacter,
  presenceMap,
  onPause,
  onResume,
  onEnd,
  onDisconnect,
}: SessionLobbyProps) {
  const navigate = useNavigate();
  const [codeCopied, setCodeCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"players" | "log" | "effects">("players");

  // ── Copy join code ───────────────────────────────────────────

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(session.sessionCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = session.sessionCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [session.sessionCode]);

  // ── End session with confirmation ────────────────────────────

  const handleEnd = () => {
    if (showEndConfirm) {
      onEnd();
      setShowEndConfirm(false);
    } else {
      setShowEndConfirm(true);
      setTimeout(() => setShowEndConfirm(false), 5000);
    }
  };

  // ── Render helpers ───────────────────────────────────────────

  const statusClass = `session-lobby__status--${session.status}`;
  const statusLabel =
    session.status === "active"
      ? "🟢 Live"
      : session.status === "paused"
      ? "🟡 Paused"
      : "🔴 Ended";

  // Build a merged player list from connectedPlayers + presence data
  const playerList = session.connectedPlayers.map((uid) => {
    const presence = presenceMap.get(uid);
    return {
      uid,
      displayName: presence?.displayName ?? uid.slice(0, 8),
      characterName: presence?.characterName,
      status: presence?.status ?? "online",
      isGM: uid === session.gmId,
      isTurn:
        session.turnOrder.length > 0 &&
        session.turnOrder[session.currentTurnIndex] === uid,
    };
  });

  return (
    <div className="session-lobby">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="session-lobby__header">
        <div className="session-lobby__header-left">
          <h1 className="session-lobby__title">
            {isGM ? "GM Session" : "Player Session"}
          </h1>
          <span className={`session-lobby__status ${statusClass}`}>
            {statusLabel}
          </span>
          {session.round > 0 && (
            <span className="session-lobby__round">Round {session.round}</span>
          )}
        </div>

        <div className="session-lobby__header-actions">
          <button
            className="btn btn--outline session-lobby__dashboard-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
          <button
            className="btn btn--outline session-lobby__leave-btn"
            onClick={onDisconnect}
          >
            Leave Session
          </button>
        </div>
      </header>

      {/* ── Active Character Banner (player only) ─────────── */}
      {!isGM && activeCharacter && (
        <div className="session-lobby__char-banner">
          <span className="session-lobby__char-avatar">
            {activeCharacter.name.charAt(0).toUpperCase()}
          </span>
          <div className="session-lobby__char-info">
            <span className="session-lobby__char-name">
              {activeCharacter.name}
            </span>
            <span className="session-lobby__char-meta">
              {activeCharacter.race} {activeCharacter.class} · Lv {activeCharacter.level}
            </span>
          </div>
          <div className="session-lobby__char-stats">
            <span className="session-lobby__char-hp">
              ❤️ {activeCharacter.hitPoints.current}/{activeCharacter.hitPoints.max}
            </span>
            <span className="session-lobby__char-ac">
              🛡️ AC {activeCharacter.armorClass}
            </span>
          </div>
        </div>
      )}

      {/* ── Join Code Banner ──────────────────────────────── */}
      <div className="session-lobby__code-banner">
        <span className="session-lobby__code-label">Session Code</span>
        <div className="session-lobby__code-display">
          {session.sessionCode.split("").map((char, i) => (
            <span key={i} className="session-lobby__code-char">
              {char}
            </span>
          ))}
        </div>
        <button
          className="btn btn--sm session-lobby__copy-btn"
          onClick={copyCode}
        >
          {codeCopied ? "✓ Copied!" : "Copy Code"}
        </button>
      </div>

      {/* ── GM Controls ───────────────────────────────────── */}
      {isGM && (
        <div className="session-lobby__gm-controls">
          <span className="session-lobby__gm-label">GM Controls</span>
          <div className="session-lobby__gm-buttons">
            {session.status === "active" ? (
              <button className="btn btn--outline btn--sm" onClick={onPause}>
                ⏸ Pause
              </button>
            ) : session.status === "paused" ? (
              <button className="btn btn--primary btn--sm" onClick={onResume}>
                ▶ Resume
              </button>
            ) : null}
            <button
              className={`btn btn--sm ${
                showEndConfirm ? "btn--danger" : "btn--outline btn--danger-outline"
              }`}
              onClick={handleEnd}
            >
              {showEndConfirm ? "Confirm End Session" : "End Session"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Navigation ────────────────────────────────── */}
      <nav className="session-lobby__tabs">
        <button
          className={`session-lobby__tab ${activeTab === "players" ? "session-lobby__tab--active" : ""}`}
          onClick={() => setActiveTab("players")}
        >
          Players ({session.connectedPlayers.length})
        </button>
        <button
          className={`session-lobby__tab ${activeTab === "log" ? "session-lobby__tab--active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          Roll Log ({rollLog.length})
        </button>
        <button
          className={`session-lobby__tab ${activeTab === "effects" ? "session-lobby__tab--active" : ""}`}
          onClick={() => setActiveTab("effects")}
        >
          Effects ({activeEffects.length})
        </button>
      </nav>

      {/* ── Tab Content ───────────────────────────────────── */}
      <div className="session-lobby__content">
        {/* Players Tab */}
        {activeTab === "players" && (
          <div className="session-lobby__players">
            {playerList.length === 0 ? (
              <div className="session-lobby__empty">
                <p>No players connected yet.</p>
                <p>Share the session code above so players can join.</p>
              </div>
            ) : (
              <ul className="session-lobby__player-list">
                {playerList.map((player) => (
                  <li
                    key={player.uid}
                    className={`session-lobby__player ${
                      player.isTurn ? "session-lobby__player--active-turn" : ""
                    }`}
                  >
                    <span className="session-lobby__player-avatar">
                      {player.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="session-lobby__player-info">
                      <span className="session-lobby__player-name">
                        {player.displayName}
                        {player.isGM && (
                          <span className="session-lobby__player-gm-tag">GM</span>
                        )}
                      </span>
                      <span className="session-lobby__player-role">
                        {player.characterName
                          ? `Playing ${player.characterName}`
                          : player.isGM
                          ? "Game Master"
                          : "No character selected"}
                        {player.isTurn && " · Their turn"}
                      </span>
                    </div>
                    <span
                      className={`session-lobby__player-presence ${
                        player.status === "away"
                          ? "session-lobby__player-presence--away"
                          : ""
                      }`}
                      title={player.status === "away" ? "Away" : "Online"}
                    >
                      {player.status === "away" ? "🟡" : "🟢"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Pending roll requests (player view) */}
            {!isGM && rollRequests.length > 0 && (
              <div className="session-lobby__requests">
                <h3 className="session-lobby__requests-title">
                  🎲 Roll Requests
                </h3>
                {rollRequests.map((req) => (
                  <div key={req.id} className="session-lobby__request-card">
                    <span className="session-lobby__request-type">
                      {rollTypeLabel(req.rollType)}
                    </span>
                    <p className="session-lobby__request-desc">
                      {req.description}
                    </p>
                    {req.dc && (
                      <span className="session-lobby__request-dc">DC {req.dc}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roll Log Tab */}
        {activeTab === "log" && (
          <div className="session-lobby__roll-log">
            {rollLog.length === 0 ? (
              <div className="session-lobby__empty">
                <p>No rolls yet this session.</p>
                <p>Rolls will appear here in real time.</p>
              </div>
            ) : (
              <ul className="session-lobby__log-list">
                {rollLog.map((entry) => (
                  <li key={entry.id} className="session-lobby__log-entry">
                    <div className="session-lobby__log-header">
                      <span className="session-lobby__log-player">
                        {entry.characterName || entry.playerName}
                      </span>
                      <span className="session-lobby__log-type">
                        {rollTypeLabel(entry.rollType)}
                      </span>
                      <span className="session-lobby__log-time">
                        {timeAgo(entry.timestamp ?? Date.now())}
                      </span>
                    </div>
                    <div className="session-lobby__log-result">
                      <span
                        className={`session-lobby__log-total ${
                          entry.criticalHit
                            ? "session-lobby__log-total--crit"
                            : entry.criticalFail
                            ? "session-lobby__log-total--fail"
                            : ""
                        }`}
                      >
                        {entry.total}
                      </span>
                      <span className="session-lobby__log-detail">
                        {entry.dieCount}{entry.dieType}
                        {entry.modifier !== 0 &&
                          ` ${entry.modifier >= 0 ? "+" : ""}${entry.modifier}`}
                        {" → "}[{entry.rolls.join(", ")}]
                      </span>
                      {entry.success !== undefined && (
                        <span
                          className={`session-lobby__log-outcome ${
                            entry.success
                              ? "session-lobby__log-outcome--pass"
                              : "session-lobby__log-outcome--fail"
                          }`}
                        >
                          {entry.success ? "Pass" : "Fail"}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="session-lobby__log-desc">{entry.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === "effects" && (
          <div className="session-lobby__effects">
            {activeEffects.length === 0 ? (
              <div className="session-lobby__empty">
                <p>No active effects.</p>
                <p>Effects applied during combat will appear here.</p>
              </div>
            ) : (
              <ul className="session-lobby__effect-list">
                {activeEffects.map((effect) => (
                  <li key={effect.id} className="session-lobby__effect-card">
                    <div className="session-lobby__effect-header">
                      <span className="session-lobby__effect-name">
                        {effect.effectName}
                      </span>
                      {effect.condition && (
                        <span className="session-lobby__effect-condition">
                          {effect.condition}
                        </span>
                      )}
                    </div>
                    <span className="session-lobby__effect-target">
                      On: {effect.targetName}
                    </span>
                    {effect.description && (
                      <p className="session-lobby__effect-desc">
                        {effect.description}
                      </p>
                    )}
                    {effect.duration?.roundsRemaining !== undefined && (
                      <span className="session-lobby__effect-duration">
                        {effect.duration.roundsRemaining} rounds remaining
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}