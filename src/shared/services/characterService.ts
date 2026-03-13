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
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@config/firebase";
import type { Character } from "@shared/types/dnd";

const COLLECTION = "characters";

// ── Default character template ───────────────────────────────────

export function defaultCharacter(ownerId: string): Omit<Character, "id"> {
  return {
    ownerId,
    name: "New Character",
    race: "",
    class: "",
    subclass: "",
    level: 1,
    experiencePoints: 0,
    background: "",
    alignment: "",

    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    hitPoints: { max: 10, current: 10, temporary: 0 },
    deathSaves: { successes: 0, failures: 0 },
    armorClass: 10,
    initiative: 0,
    speed: 30,
    proficiencyBonus: 2,
    hitDice: { dieType: "d8", total: 1, used: 0 },

    savingThrows: {},
    skills: {},
    languages: ["Common"],
    toolProficiencies: [],
    armorProficiencies: [],
    weaponProficiencies: [],

    inventory: [],
    spells: [],
    spellSlots: {},
    features: [],

    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    conditions: [],
    notes: "",

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Create ───────────────────────────────────────────────────────

export async function createCharacter(
  ownerId: string,
  overrides: Partial<Omit<Character, "id" | "ownerId">> = {}
): Promise<string> {
  const data = { ...defaultCharacter(ownerId), ...overrides };
  const ref = await addDoc(collection(db, COLLECTION), data);
  return ref.id;
}

// ── Read ─────────────────────────────────────────────────────────

export async function getCharacter(id: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Character;
}

// ── List by owner ────────────────────────────────────────────────

export async function getCharactersByOwner(
  ownerId: string
): Promise<Character[]> {
  const q = query(
    collection(db, COLLECTION),
    where("ownerId", "==", ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Character);
}

// ── List by campaign ─────────────────────────────────────────────

export async function getCharactersByCampaign(
  campaignId: string
): Promise<Character[]> {
  const q = query(
    collection(db, COLLECTION),
    where("campaignId", "==", campaignId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Character);
}

// ── Update ───────────────────────────────────────────────────────

export async function updateCharacter(
  id: string,
  updates: Partial<Omit<Character, "id" | "ownerId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: Date.now(),
  });
}

// ── Delete ───────────────────────────────────────────────────────

export async function deleteCharacter(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ── Real-time listener ───────────────────────────────────────────

export function onCharacterChanged(
  id: string,
  callback: (character: Character | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, id), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as Character);
    }
  });
}

export function onCharactersByOwner(
  ownerId: string,
  callback: (characters: Character[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where("ownerId", "==", ownerId)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Character)
    );
  });
}
