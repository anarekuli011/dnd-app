import { useEffect, useRef, useCallback, useState } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@config/firebase";

// ── Types ────────────────────────────────────────────────────────

export interface PresenceEntry {
  uid: string;
  displayName: string;
  characterId?: string;
  characterName?: string;
  lastSeen: number;
  status: "online" | "away";
}

interface UseSessionPresenceOptions {
  sessionId: string | null;
  uid: string | null;
  displayName: string;
  characterId?: string;
  characterName?: string;
  /** Heartbeat interval in ms (default 30s) */
  heartbeatMs?: number;
  /** Time after which a player is considered "away" (default 60s) */
  awayThresholdMs?: number;
}

interface UseSessionPresenceReturn {
  /** All players currently tracked in the presence subcollection */
  presenceMap: Map<string, PresenceEntry>;
  /** Whether this player's heartbeat is active */
  isTracking: boolean;
}

// ── Subcollection path ───────────────────────────────────────────

function presenceRef(sessionId: string) {
  return collection(db, "sessions", sessionId, "presence");
}

function presenceDocRef(sessionId: string, uid: string) {
  return doc(db, "sessions", sessionId, "presence", uid);
}

// ── Hook ─────────────────────────────────────────────────────────

export function useSessionPresence({
  sessionId,
  uid,
  displayName,
  characterId,
  characterName,
  heartbeatMs = 30_000,
  awayThresholdMs = 60_000,
}: UseSessionPresenceOptions): UseSessionPresenceReturn {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEntry>>(new Map());
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  // ── Write heartbeat ──────────────────────────────────────────

  const writeHeartbeat = useCallback(async () => {
    if (!sessionId || !uid) return;

    try {
      await setDoc(presenceDocRef(sessionId, uid), {
        uid,
        displayName,
        characterId: characterId ?? null,
        characterName: characterName ?? null,
        lastSeen: Date.now(),
        status: "online",
        serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Heartbeat write failed:", err);
    }
  }, [sessionId, uid, displayName, characterId, characterName]);

  // ── Remove presence on disconnect ────────────────────────────

  const removePresence = useCallback(async () => {
    if (!sessionId || !uid) return;

    try {
      await deleteDoc(presenceDocRef(sessionId, uid));
    } catch (err) {
      console.warn("Failed to remove presence:", err);
    }
  }, [sessionId, uid]);

  // ── Start / stop heartbeat ───────────────────────────────────

  useEffect(() => {
    if (!sessionId || !uid) {
      setIsTracking(false);
      return;
    }

    // Initial heartbeat
    writeHeartbeat();
    setIsTracking(true);

    // Start the periodic heartbeat
    intervalRef.current = setInterval(writeHeartbeat, heartbeatMs);

    // Visibility change — STOP heartbeats when tab is hidden so the
    // player actually goes stale. RESTART when tab becomes visible.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Tab is back — write immediately and restart interval
        writeHeartbeat();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(writeHeartbeat, heartbeatMs);
        }
      } else {
        // Tab hidden — stop the interval so lastSeen goes stale
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cleanup on unmount or session change
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      removePresence();
      setIsTracking(false);
    };
  }, [sessionId, uid, heartbeatMs, writeHeartbeat, removePresence]);

  // ── Listen to all presence docs ──────────────────────────────
  // We store the raw Firestore data in a ref so a local interval
  // can periodically re-evaluate staleness even when no new
  // snapshots arrive (i.e. when the away player stops writing).

  const rawPresenceRef = useRef<Map<string, { uid: string; displayName: string; characterId?: string; characterName?: string; lastSeen: number }>>(new Map());
  const stalenessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recalcPresence = useCallback(() => {
    const now = Date.now();
    const map = new Map<string, PresenceEntry>();

    rawPresenceRef.current.forEach((data, id) => {
      map.set(id, {
        uid: data.uid,
        displayName: data.displayName,
        characterId: data.characterId,
        characterName: data.characterName,
        lastSeen: data.lastSeen,
        status: now - data.lastSeen > awayThresholdMs ? "away" : "online",
      });
    });

    setPresenceMap(map);
  }, [awayThresholdMs]);

  useEffect(() => {
    if (!sessionId) {
      setPresenceMap(new Map());
      rawPresenceRef.current.clear();
      return;
    }

    // Subscribe to snapshot — updates rawPresenceRef then recalculates
    unsubRef.current = onSnapshot(presenceRef(sessionId), (snap) => {
      const raw = new Map<string, { uid: string; displayName: string; characterId?: string; characterName?: string; lastSeen: number }>();

      snap.docs.forEach((d) => {
        const data = d.data();
        raw.set(d.id, {
          uid: data.uid,
          displayName: data.displayName ?? d.id.slice(0, 8),
          characterId: data.characterId ?? undefined,
          characterName: data.characterName ?? undefined,
          lastSeen: data.lastSeen ?? 0,
        });
      });

      rawPresenceRef.current = raw;
      recalcPresence();
    });

    // Local interval to re-evaluate staleness every 15s even if
    // no snapshots arrive (handles the "player went away" case)
    stalenessIntervalRef.current = setInterval(recalcPresence, 15_000);

    return () => {
      unsubRef.current?.();
      if (stalenessIntervalRef.current) clearInterval(stalenessIntervalRef.current);
    };
  }, [sessionId, recalcPresence]);

  // ── Window close — best-effort cleanup ───────────────────────

  useEffect(() => {
    if (!sessionId || !uid) return;

    const handleBeforeUnload = () => {
      // Can't reliably await in beforeunload, but Firestore SDK
      // will attempt to send the delete.
      deleteDoc(presenceDocRef(sessionId, uid)).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, uid]);

  return { presenceMap, isTracking };
}