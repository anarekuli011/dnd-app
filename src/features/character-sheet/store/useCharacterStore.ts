import { create } from "zustand";
import type { Character } from "@shared/types/dnd";
import {
  getCharacter,
  updateCharacter,
  onCharacterChanged,
} from "@shared/services/characterService";

// ── Debounce helper ──────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY = 800; // ms

// ── Store types ──────────────────────────────────────────────────

interface CharacterStore {
  character: Character | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;

  /** Load a character by ID and subscribe to real-time updates */
  loadCharacter: (id: string) => Promise<void>;

  /** Unsubscribe from real-time updates */
  unsubscribe: () => void;

  /** Update local state + queue a debounced Firestore write */
  updateField: <K extends keyof Character>(
    field: K,
    value: Character[K]
  ) => void;

  /** Update a nested path (e.g. abilityScores.strength) */
  updateNested: (path: string, value: unknown) => void;

  /** Force an immediate save */
  saveNow: () => Promise<void>;

  /** Clear the store */
  reset: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function setNested(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  let current = obj;
  for (const key of keys) {
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[last] = value;
}

// ── Store ────────────────────────────────────────────────────────

let unsubFn: (() => void) | null = null;
// Track whether we're applying a remote snapshot to avoid save loops
let applyingRemote = false;

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  character: null,
  loading: false,
  saving: false,
  error: null,
  dirty: false,

  loadCharacter: async (id: string) => {
    // Clean up previous listener
    get().unsubscribe();

    set({ loading: true, error: null });

    try {
      const char = await getCharacter(id);
      if (!char) {
        set({ loading: false, error: "Character not found" });
        return;
      }

      set({ character: char, loading: false });

      // Subscribe to real-time updates (for multiplayer sync later)
      unsubFn = onCharacterChanged(id, (updated) => {
        if (!updated) return;
        const state = get();
        // Only apply remote changes if we're not in the middle of a local edit
        if (!state.dirty) {
          applyingRemote = true;
          set({ character: updated });
          applyingRemote = false;
        }
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load character",
      });
    }
  },

  unsubscribe: () => {
    if (unsubFn) {
      unsubFn();
      unsubFn = null;
    }
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  },

  updateField: (field, value) => {
    if (applyingRemote) return;

    const char = get().character;
    if (!char) return;

    const updated = { ...char, [field]: value };
    set({ character: updated, dirty: true });

    // Debounced save
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().saveNow();
    }, SAVE_DELAY);
  },

  updateNested: (path, value) => {
    if (applyingRemote) return;

    const char = get().character;
    if (!char) return;

    const clone = JSON.parse(JSON.stringify(char)) as Record<string, unknown>;
    setNested(clone, path, value);
    set({ character: clone as unknown as Character, dirty: true });

    // Debounced save
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().saveNow();
    }, SAVE_DELAY);
  },

  saveNow: async () => {
    const char = get().character;
    if (!char) return;

    set({ saving: true });
    try {
      const { id, ownerId, createdAt, ...updates } = char;
      await updateCharacter(id, updates);
      set({ saving: false, dirty: false });
    } catch (err) {
      set({
        saving: false,
        error: err instanceof Error ? err.message : "Failed to save",
      });
    }
  },

  reset: () => {
    get().unsubscribe();
    set({
      character: null,
      loading: false,
      saving: false,
      error: null,
      dirty: false,
    });
  },
}));
