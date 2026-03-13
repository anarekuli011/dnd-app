import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@features/auth/context/AuthContext";
import {
  createSession,
  findSessionByCode,
  joinSession,
  leaveSession,
  pauseSession,
  resumeSession,
  endSession,
  onSessionChanged,
  onRollLog,
  onActiveEffects,
  onRollRequests,
} from "@shared/services/sessionService";
import type {
  Session,
  RollLogEntry,
  ActiveEffect,
  RollRequest,
} from "@shared/types/dnd";
import type { Unsubscribe } from "firebase/firestore";

// ── Types ────────────────────────────────────────────────────────

export type SessionPhase = "idle" | "creating" | "joining" | "connected" | "error";

export interface SessionError {
  code: "NOT_FOUND" | "ENDED" | "CREATE_FAILED" | "JOIN_FAILED" | "DISCONNECTED";
  message: string;
}

export interface UseSessionReturn {
  // State
  phase: SessionPhase;
  session: Session | null;
  error: SessionError | null;
  rollLog: RollLogEntry[];
  activeEffects: ActiveEffect[];
  rollRequests: RollRequest[];
  isGM: boolean;

  // Actions
  create: (campaignId: string) => Promise<void>;
  join: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: () => Promise<void>;
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useSession(): UseSessionReturn {
  const { user } = useAuth();

  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<SessionError | null>(null);
  const [rollLog, setRollLog] = useState<RollLogEntry[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [rollRequests, setRollRequests] = useState<RollRequest[]>([]);

  // Track active subscriptions for cleanup
  const unsubscribesRef = useRef<Unsubscribe[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Keep userId ref in sync
  useEffect(() => {
    userIdRef.current = user?.uid ?? null;
  }, [user?.uid]);

  // Derived state
  const isGM = !!(session && user && session.gmId === user.uid);

  // ── Subscription management ──────────────────────────────────

  const teardownSubscriptions = useCallback(() => {
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];
  }, []);

  const setupSubscriptions = useCallback(
    (sessionId: string) => {
      teardownSubscriptions();

      // 1. Session document — real-time updates
      const unsubSession = onSessionChanged(sessionId, (updated) => {
        if (!updated) {
          // Session was deleted
          setSession(null);
          setPhase("error");
          setError({ code: "DISCONNECTED", message: "Session no longer exists." });
          teardownSubscriptions();
          return;
        }

        setSession(updated);

        // If the session ended, transition to error phase so UI can show it
        if (updated.status === "ended") {
          setPhase("error");
          setError({ code: "ENDED", message: "The GM has ended this session." });
          setSession(null);
          sessionIdRef.current = null;
          teardownSubscriptions();
        }
      });

      // 2. Roll log — latest 50 entries
      const unsubRolls = onRollLog(sessionId, setRollLog, 50);

      // 3. Active effects
      const unsubEffects = onActiveEffects(sessionId, setActiveEffects);

      // 4. Roll requests (pending only)
      const unsubRequests = onRollRequests(sessionId, setRollRequests);

      unsubscribesRef.current = [unsubSession, unsubRolls, unsubEffects, unsubRequests];
    },
    [teardownSubscriptions]
  );

  // ── Create a session (GM flow) ───────────────────────────────

  const create = useCallback(
    async (campaignId: string) => {
      if (!user) return;

      setPhase("creating");
      setError(null);

      try {
        const { id, sessionCode } = await createSession(campaignId, user.uid);

        // GM auto-joins as a connected player
        await joinSession(id, user.uid);

        sessionIdRef.current = id;
        setPhase("connected");
        setupSubscriptions(id);
      } catch (err) {
        console.error("Failed to create session:", err);
        setPhase("error");
        setError({
          code: "CREATE_FAILED",
          message: "Failed to create session. Please try again.",
        });
      }
    },
    [user, setupSubscriptions]
  );

  // ── Join a session via code (Player flow) ────────────────────

  const join = useCallback(
    async (code: string) => {
      if (!user) return;

      setPhase("joining");
      setError(null);

      try {
        const found = await findSessionByCode(code);

        if (!found) {
          setPhase("error");
          setError({
            code: "NOT_FOUND",
            message: "No active session found with that code. Check with your GM.",
          });
          return;
        }

        if (found.status === "ended") {
          setPhase("error");
          setError({ code: "ENDED", message: "That session has already ended." });
          return;
        }

        // Add this player to connectedPlayers
        await joinSession(found.id, user.uid);

        sessionIdRef.current = found.id;
        setPhase("connected");
        setupSubscriptions(found.id);
      } catch (err) {
        console.error("Failed to join session:", err);
        setPhase("error");
        setError({
          code: "JOIN_FAILED",
          message: "Failed to join session. Please try again.",
        });
      }
    },
    [user, setupSubscriptions]
  );

  // ── Disconnect (leave session) ───────────────────────────────

  const disconnect = useCallback(async () => {
    const sid = sessionIdRef.current;
    const uid = userIdRef.current;

    teardownSubscriptions();

    if (sid && uid) {
      try {
        await leaveSession(sid, uid);
      } catch (err) {
        console.error("Error leaving session:", err);
      }
    }

    sessionIdRef.current = null;
    setSession(null);
    setPhase("idle");
    setError(null);
    setRollLog([]);
    setActiveEffects([]);
    setRollRequests([]);
  }, [teardownSubscriptions]);

  // ── GM controls ──────────────────────────────────────────────

  const pause = useCallback(async () => {
    if (sessionIdRef.current && isGM) {
      await pauseSession(sessionIdRef.current);
    }
  }, [isGM]);

  const resume = useCallback(async () => {
    if (sessionIdRef.current && isGM) {
      await resumeSession(sessionIdRef.current);
    }
  }, [isGM]);

  const end = useCallback(async () => {
    if (sessionIdRef.current && isGM) {
      await endSession(sessionIdRef.current);
      teardownSubscriptions();
      sessionIdRef.current = null;
      setSession(null);
      setPhase("idle");
    }
  }, [isGM, teardownSubscriptions]);

  const clearError = useCallback(() => {
    setError(null);
    if (phase === "error") setPhase("idle");
  }, [phase]);

  // ── Cleanup on unmount / window close ────────────────────────

  useEffect(() => {
    // Handle browser/Electron window close — try to leave gracefully
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current;
      const uid = userIdRef.current;
      if (sid && uid) {
        // Use sendBeacon-style fire-and-forget since we can't await here.
        // Firestore's onDisconnect isn't available, so we do our best.
        leaveSession(sid, uid).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Component unmount cleanup
      teardownSubscriptions();
      const sid = sessionIdRef.current;
      const uid = userIdRef.current;
      if (sid && uid) {
        leaveSession(sid, uid).catch(() => {});
      }
    };
  }, [teardownSubscriptions]);

  // ── Return ───────────────────────────────────────────────────

  return {
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
  };
}