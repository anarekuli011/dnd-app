import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@features/auth/context/AuthContext";
import { useSession, type UseSessionReturn } from "../hooks/useSession";
import {
  useSessionPresence,
  type PresenceEntry,
} from "../hooks/useSessionPresence";
import type { Character } from "@shared/types/dnd";

// ── Extended context with character selection + presence ─────────

interface SessionContextValue extends UseSessionReturn {
  /** The character the current player has selected for this session */
  activeCharacter: Character | null;
  setActiveCharacter: (char: Character | null) => void;
  /** Real-time presence map for all connected players */
  presenceMap: Map<string, PresenceEntry>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const sessionHook = useSession();
  const [activeCharacter, setActiveCharacter] = React.useState<Character | null>(null);

  // Reset character when disconnected
  React.useEffect(() => {
    if (sessionHook.phase === "idle" || sessionHook.phase === "error") {
      setActiveCharacter(null);
    }
  }, [sessionHook.phase]);

  // ── Global presence tracking ─────────────────────────────────
  // Runs at the provider level so it stays alive when navigating
  // between pages (dashboard, character sheet, etc.)

  const { presenceMap } = useSessionPresence({
    sessionId:
      sessionHook.phase === "connected" && sessionHook.session
        ? sessionHook.session.id
        : null,
    uid: user?.uid ?? null,
    displayName: profile?.displayName ?? user?.displayName ?? "Unknown",
    characterId: activeCharacter?.id,
    characterName: activeCharacter?.name,
    heartbeatMs: 30_000,
    awayThresholdMs: 90_000,
  });

  const value = useMemo<SessionContextValue>(
    () => ({
      ...sessionHook,
      activeCharacter,
      setActiveCharacter,
      presenceMap,
    }),
    [sessionHook, activeCharacter, presenceMap]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used inside <SessionProvider>");
  }
  return ctx;
}