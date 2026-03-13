import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@config/firebase";
import type {
  Session,
  RollLogEntry,
  ActiveEffect,
  RollRequest,
  GMNote,
} from "@shared/types/dnd";

const COLLECTION = "sessions";

// ── Generate a short join code ───────────────────────────────────

function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ══════════════════════════════════════════════════════════════════
// Session CRUD
// ══════════════════════════════════════════════════════════════════

export async function createSession(
  campaignId: string,
  gmId: string
): Promise<{ id: string; sessionCode: string }> {
  const sessionCode = generateSessionCode();
  const session: Omit<Session, "id"> = {
    campaignId,
    gmId,
    sessionCode,
    status: "active",
    connectedPlayers: [],
    turnOrder: [],
    currentTurnIndex: 0,
    round: 0,
    createdAt: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION), session);
  return { id: ref.id, sessionCode };
}

export async function getSession(id: string): Promise<Session | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Session;
}

export async function findSessionByCode(
  code: string
): Promise<Session | null> {
  const q = query(
    collection(db, COLLECTION),
    where("sessionCode", "==", code.toUpperCase()),
    where("status", "in", ["active", "paused"]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Session;
}

// ── Join / Leave ─────────────────────────────────────────────────

export async function joinSession(
  sessionId: string,
  playerId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    connectedPlayers: arrayUnion(playerId),
  });
}

export async function leaveSession(
  sessionId: string,
  playerId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    connectedPlayers: arrayRemove(playerId),
  });
}

// ── Session controls (GM) ────────────────────────────────────────

export async function pauseSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), { status: "paused" });
}

export async function resumeSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), { status: "active" });
}

export async function endSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    status: "ended",
    endedAt: Date.now(),
  });
}

// ── Turn order ───────────────────────────────────────────────────

export async function setTurnOrder(
  sessionId: string,
  turnOrder: string[]
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, sessionId), {
    turnOrder,
    currentTurnIndex: 0,
    round: 1,
  });
}

export async function advanceTurn(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  let nextIndex = session.currentTurnIndex + 1;
  let nextRound = session.round;

  if (nextIndex >= session.turnOrder.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  await updateDoc(doc(db, COLLECTION, sessionId), {
    currentTurnIndex: nextIndex,
    round: nextRound,
  });
}

// ── Real-time listener ───────────────────────────────────────────

export function onSessionChanged(
  sessionId: string,
  callback: (session: Session | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, sessionId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as Session);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// Roll Log (sub-collection)
// ══════════════════════════════════════════════════════════════════

function rollLogRef(sessionId: string) {
  return collection(db, COLLECTION, sessionId, "rollLog");
}

export function onRollLog(
  sessionId: string,
  callback: (entries: RollLogEntry[]) => void,
  maxEntries: number = 50
): Unsubscribe {
  const q = query(
    rollLogRef(sessionId),
    orderBy("timestamp", "desc"),
    limit(maxEntries)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RollLogEntry)
    );
  });
}

export async function getRollLog(
  sessionId: string
): Promise<RollLogEntry[]> {
  const q = query(rollLogRef(sessionId), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RollLogEntry);
}

// ══════════════════════════════════════════════════════════════════
// Active Effects (sub-collection)
// ══════════════════════════════════════════════════════════════════

function effectsRef(sessionId: string) {
  return collection(db, COLLECTION, sessionId, "activeEffects");
}

export async function addActiveEffect(
  sessionId: string,
  effect: Omit<ActiveEffect, "id">
): Promise<string> {
  const ref = await addDoc(effectsRef(sessionId), effect);
  return ref.id;
}

export async function removeActiveEffect(
  sessionId: string,
  effectId: string
): Promise<void> {
  await deleteDoc(
    doc(db, COLLECTION, sessionId, "activeEffects", effectId)
  );
}

export async function updateActiveEffect(
  sessionId: string,
  effectId: string,
  updates: Partial<ActiveEffect>
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, sessionId, "activeEffects", effectId),
    updates
  );
}

export function onActiveEffects(
  sessionId: string,
  callback: (effects: ActiveEffect[]) => void
): Unsubscribe {
  return onSnapshot(effectsRef(sessionId), (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActiveEffect)
    );
  });
}

// ══════════════════════════════════════════════════════════════════
// Roll Requests (sub-collection)
// ══════════════════════════════════════════════════════════════════

function rollRequestsRef(sessionId: string) {
  return collection(db, COLLECTION, sessionId, "rollRequests");
}

export async function createRollRequest(
  sessionId: string,
  request: Omit<RollRequest, "id" | "sessionId" | "status" | "createdAt">
): Promise<string> {
  const ref = await addDoc(rollRequestsRef(sessionId), {
    ...request,
    sessionId,
    status: "pending",
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function completeRollRequest(
  sessionId: string,
  requestId: string
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, sessionId, "rollRequests", requestId),
    { status: "completed" }
  );
}

export function onRollRequests(
  sessionId: string,
  callback: (requests: RollRequest[]) => void
): Unsubscribe {
  const q = query(
    rollRequestsRef(sessionId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RollRequest)
    );
  });
}

// ══════════════════════════════════════════════════════════════════
// GM Notes (sub-collection)
// ══════════════════════════════════════════════════════════════════

function gmNotesRef(sessionId: string) {
  return collection(db, COLLECTION, sessionId, "gmNotes");
}

export async function createGMNote(
  sessionId: string,
  data: { title: string; content: string }
): Promise<string> {
  const ref = await addDoc(gmNotesRef(sessionId), {
    ...data,
    sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateGMNote(
  sessionId: string,
  noteId: string,
  updates: { title?: string; content?: string }
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, sessionId, "gmNotes", noteId),
    { ...updates, updatedAt: Date.now() }
  );
}

export async function deleteGMNote(
  sessionId: string,
  noteId: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, sessionId, "gmNotes", noteId));
}

export function onGMNotes(
  sessionId: string,
  callback: (notes: GMNote[]) => void
): Unsubscribe {
  return onSnapshot(gmNotesRef(sessionId), (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GMNote)
    );
  });
}
