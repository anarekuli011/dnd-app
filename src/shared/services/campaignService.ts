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
  arrayUnion,
  arrayRemove,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@config/firebase";
import type { Campaign, Encounter, NPC } from "@shared/types/dnd";

const COLLECTION = "campaigns";

// ── Create ───────────────────────────────────────────────────────

export async function createCampaign(
  gmId: string,
  data: { title: string; description?: string }
): Promise<string> {
  const campaign: Omit<Campaign, "id"> = {
    gmId,
    title: data.title,
    description: data.description ?? "",
    worldNotes: "",
    playerIds: [],
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION), campaign);
  return ref.id;
}

// ── Read ─────────────────────────────────────────────────────────

export async function getCampaign(id: string): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Campaign;
}

// ── List by GM ───────────────────────────────────────────────────

export async function getCampaignsByGM(gmId: string): Promise<Campaign[]> {
  const q = query(collection(db, COLLECTION), where("gmId", "==", gmId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign);
}

// ── List campaigns a player belongs to ───────────────────────────

export async function getCampaignsByPlayer(
  playerId: string
): Promise<Campaign[]> {
  const q = query(
    collection(db, COLLECTION),
    where("playerIds", "array-contains", playerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign);
}

// ── Update ───────────────────────────────────────────────────────

export async function updateCampaign(
  id: string,
  updates: Partial<Omit<Campaign, "id" | "gmId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), updates);
}

// ── Player management ────────────────────────────────────────────

export async function addPlayerToCampaign(
  campaignId: string,
  playerId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, campaignId), {
    playerIds: arrayUnion(playerId),
  });
}

export async function removePlayerFromCampaign(
  campaignId: string,
  playerId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, campaignId), {
    playerIds: arrayRemove(playerId),
  });
}

// ── Delete ───────────────────────────────────────────────────────

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ── Real-time listener ───────────────────────────────────────────

export function onCampaignChanged(
  id: string,
  callback: (campaign: Campaign | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, id), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as Campaign);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// Encounters (sub-collection of campaigns)
// ══════════════════════════════════════════════════════════════════

function encountersRef(campaignId: string) {
  return collection(db, COLLECTION, campaignId, "encounters");
}

export async function createEncounter(
  campaignId: string,
  data: Omit<Encounter, "id" | "campaignId">
): Promise<string> {
  const ref = await addDoc(encountersRef(campaignId), {
    ...data,
    campaignId,
  });
  return ref.id;
}

export async function getEncounters(campaignId: string): Promise<Encounter[]> {
  const snap = await getDocs(encountersRef(campaignId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Encounter);
}

export async function updateEncounter(
  campaignId: string,
  encounterId: string,
  updates: Partial<Encounter>
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, campaignId, "encounters", encounterId),
    updates
  );
}

export async function deleteEncounter(
  campaignId: string,
  encounterId: string
): Promise<void> {
  await deleteDoc(
    doc(db, COLLECTION, campaignId, "encounters", encounterId)
  );
}

// ══════════════════════════════════════════════════════════════════
// NPCs (sub-collection of campaigns)
// ══════════════════════════════════════════════════════════════════

function npcsRef(campaignId: string) {
  return collection(db, COLLECTION, campaignId, "npcs");
}

export async function createNPC(
  campaignId: string,
  data: Omit<NPC, "id">
): Promise<string> {
  const ref = await addDoc(npcsRef(campaignId), data);
  return ref.id;
}

export async function getNPCs(campaignId: string): Promise<NPC[]> {
  const snap = await getDocs(npcsRef(campaignId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NPC);
}

export async function updateNPC(
  campaignId: string,
  npcId: string,
  updates: Partial<NPC>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, campaignId, "npcs", npcId), updates);
}

export async function deleteNPC(
  campaignId: string,
  npcId: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, campaignId, "npcs", npcId));
}

export function onNPCsChanged(
  campaignId: string,
  callback: (npcs: NPC[]) => void
): Unsubscribe {
  return onSnapshot(npcsRef(campaignId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NPC));
  });
}
