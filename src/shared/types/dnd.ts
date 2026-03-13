// ══════════════════════════════════════════════════════════════════
// D&D Virtual Character Sheet — Complete Type Definitions
// ══════════════════════════════════════════════════════════════════

// ── Dice ──────────────────────────────────────────────────────────

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

export const DIE_MAX: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

// ── Ability Scores ───────────────────────────────────────────────

export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export const ABILITY_NAMES: AbilityName[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export type AbilityScores = Record<AbilityName, number>;

// ── Skills ───────────────────────────────────────────────────────

export const SKILL_ABILITY_MAP = {
  // ── Strength ─────────────────────────
  athletics: "strength",      // climbing, swimming, jumping
  intimidation: "strength",   // physical threats, imposing presence
  bruteForce: "strength",     // breaking objects, forcing doors, grappling
 
  // ── Dexterity ────────────────────────
  acrobatics: "dexterity",    // balance, tumbling, aerial manoeuvres
  stealth: "dexterity",       // moving unseen, hiding, sneaking
  sleightOfHand: "dexterity", // pickpocketing, lockpicking, fine motor tricks
 
  // ── Constitution ─────────────────────
  endurance: "constitution",  // stamina, resisting exhaustion, forced marches
  survival: "constitution",   // wilderness hardship, foraging, weathering elements
  medicine: "constitution",   // tending wounds, stabilising the dying, anatomy
 
  // ── Intelligence ─────────────────────
  arcana: "intelligence",     // magical lore, identifying spells, planar knowledge
  investigation: "intelligence", // deduction, searching for clues, analysing evidence
  history: "intelligence",    // recalling lore, recognising legends, cultural knowledge
 
  // ── Wisdom ───────────────────────────
  perception: "wisdom",       // noticing hidden things, keen senses, awareness
  insight: "wisdom",          // reading intentions, detecting lies, empathy
  nature: "wisdom",           // animal handling, flora & fauna, natural phenomena
 
  // ── Charisma ─────────────────────────
  deception: "charisma",      // lying, disguises, misleading others
  persuasion: "charisma",     // negotiation, diplomacy, convincing others
  performance: "charisma",    // entertaining, oratory, artistic expression
} as const;

export type SkillName = keyof typeof SKILL_ABILITY_MAP;

export const SKILL_NAMES = Object.keys(SKILL_ABILITY_MAP) as SkillName[];

export interface SkillProficiency {
  proficient: boolean;
  expertise: boolean; // double proficiency bonus
}

// ── Conditions (D&D 5e) ─────────────────────────────────────────

export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious"
  | "exhaustion";

// ── Damage Types ─────────────────────────────────────────────────

export type DamageType =
  | "slashing"
  | "piercing"
  | "bludgeoning"
  | "fire"
  | "cold"
  | "lightning"
  | "thunder"
  | "poison"
  | "acid"
  | "necrotic"
  | "radiant"
  | "force"
  | "psychic";

// ── Hit Points ───────────────────────────────────────────────────

export interface HitPoints {
  max: number;
  current: number;
  temporary: number;
}

// ── Death Saves ──────────────────────────────────────────────────

export interface DeathSaves {
  successes: number; // 0–3
  failures: number;  // 0–3
}

// ── Inventory ────────────────────────────────────────────────────

export type ItemType = "weapon" | "armor" | "potion" | "gear" | "treasure" | "other";

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  weight?: number;
  description?: string;
  equipped?: boolean;
  // Weapon-specific
  damageDie?: DieType;
  damageBonus?: number;
  damageType?: DamageType;
  properties?: string[]; // e.g. ["finesse", "light", "thrown"]
  // Armor-specific
  acBonus?: number;
}

// ── Spells ───────────────────────────────────────────────────────

export type SpellSchool =
  | "abjuration"
  | "conjuration"
  | "divination"
  | "enchantment"
  | "evocation"
  | "illusion"
  | "necromancy"
  | "transmutation";

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prepared?: boolean;
  damage?: {
    dieType: DieType;
    dieCount: number;
    damageType: DamageType;
  };
  saveDC?: AbilityName;
}

// ── Spell Slots ──────────────────────────────────────────────────

export interface SpellSlots {
  [level: string]: { max: number; used: number };
}

// ── Features & Traits ────────────────────────────────────────────

export interface Feature {
  id: string;
  name: string;
  source: string;
  description: string;
  usesMax?: number;
  usesCurrent?: number;
  rechargeOn?: "shortRest" | "longRest";
}

// ── Character ────────────────────────────────────────────────────

export interface Character {
  id: string;
  ownerId: string;

  // Core identity
  name: string;
  race: string;
  class: string;
  subclass?: string;
  level: number;
  experiencePoints?: number;
  background: string;
  alignment: string;

  // Combat stats
  abilityScores: AbilityScores;
  hitPoints: HitPoints;
  deathSaves: DeathSaves;
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus: number;
  hitDice: { dieType: DieType; total: number; used: number };

  // Proficiencies
  savingThrows: Partial<Record<AbilityName, boolean>>;
  skills: Partial<Record<SkillName, SkillProficiency>>;
  languages: string[];
  toolProficiencies: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];

  // Gear & magic
  inventory: InventoryItem[];
  spells: Spell[];
  spellSlots: SpellSlots;
  spellcastingAbility?: AbilityName;
  features: Feature[];

  // Roleplay
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;

  // State
  conditions: Condition[];
  notes: string;

  // Links
  campaignId?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Users ────────────────────────────────────────────────────────

export type UserRole = "player" | "gm";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

// ── Campaigns ────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  gmId: string;
  title: string;
  description: string;
  worldNotes: string;
  playerIds: string[];
  createdAt: number;
  lastPlayedAt: number;
}

// ── Encounters ───────────────────────────────────────────────────

export interface EncounterCreature {
  id: string;
  name: string;
  hitPoints: HitPoints;
  armorClass: number;
  abilityScores?: Partial<AbilityScores>;
  attacks: {
    name: string;
    toHitBonus: number;
    damageDie: DieType;
    dieCount: number;
    damageBonus: number;
    damageType: DamageType;
  }[];
  conditions: Condition[];
  notes?: string;
}

export interface Encounter {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  creatures: EncounterCreature[];
  difficultyClass?: number;
  loot: InventoryItem[];
  status: "planned" | "active" | "completed";
  notes?: string;
}

// ── NPCs ─────────────────────────────────────────────────────────

export interface NPC {
  id: string;
  name: string;
  race?: string;
  occupation?: string;
  description: string;
  stats?: Partial<AbilityScores>;
  hitPoints?: HitPoints;
  armorClass?: number;
  disposition?: "friendly" | "neutral" | "hostile";
  dialogueNotes?: string;
  relationships?: string;
  notes: string;
}

// ── Sessions ─────────────────────────────────────────────────────

export type SessionStatus = "active" | "paused" | "ended";

export interface Session {
  id: string;
  campaignId: string;
  gmId: string;
  sessionCode: string;
  status: SessionStatus;
  connectedPlayers: string[];
  turnOrder: string[];
  currentTurnIndex: number;
  round: number;
  createdAt: number;
  endedAt?: number;
}

// ── Active Effects (session sub-collection) ──────────────────────

export interface ActiveEffect {
  id: string;
  sessionId: string;
  targetId: string;
  targetName: string;
  effectName: string;
  description?: string;
  condition?: Condition;
  modifier?: {
    stat: string;
    value: number;
  };
  duration?: {
    rounds?: number;
    roundsRemaining?: number;
    untilEndOfTurn?: boolean;
  };
  appliedBy: string;
  createdAt: number;
}

// ── Roll Requests (GM → Player) ──────────────────────────────────

export type RollType =
  | "ability_check"
  | "saving_throw"
  | "skill_check"
  | "attack"
  | "damage"
  | "initiative"
  | "death_save"
  | "custom";

export interface RollRequest {
  id: string;
  sessionId: string;
  requestedBy: string;
  targetPlayerId: string;
  targetCharacterId: string;
  rollType: RollType;
  ability?: AbilityName;
  skill?: SkillName;
  dc?: number;
  targetAC?: number;
  advantage?: "advantage" | "disadvantage" | "normal";
  description: string;
  status: "pending" | "completed";
  createdAt: number;
}

// ── Roll Log ─────────────────────────────────────────────────────

export interface RollLogEntry {
  id: string;
  sessionId: string;
  playerId: string;
  playerName: string;
  characterId?: string;
  characterName?: string;

  rollType: RollType;
  dieType: DieType;
  dieCount: number;
  rolls: number[];
  rawTotal: number;
  modifier: number;
  total: number;

  advantage?: "advantage" | "disadvantage" | "normal";
  keptRoll?: number;
  discardedRoll?: number;

  dc?: number;
  targetAC?: number;
  success?: boolean;
  criticalHit?: boolean;
  criticalFail?: boolean;

  description: string;
  rollRequestId?: string;
  timestamp: number;
}

// ── GM Notes ─────────────────────────────────────────────────────

export interface GMNote {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ══════════════════════════════════════════════════════════════════
// Cloud Function Request / Response Types
// ══════════════════════════════════════════════════════════════════

export interface DiceRollRequest {
  sessionId: string;
  characterId: string;
  rollType: RollType;
  dieType: DieType;
  dieCount: number;
  modifier: number;
  advantage?: "advantage" | "disadvantage" | "normal";
  dc?: number;
  targetAC?: number;
  description: string;
  rollRequestId?: string;
}

export interface DiceRollResponse {
  rolls: number[];
  rawTotal: number;
  keptRoll?: number;
  discardedRoll?: number;
  modifier: number;
  total: number;
  success?: boolean;
  criticalHit: boolean;
  criticalFail: boolean;
  rollLogEntryId: string;
}

export interface AttackRollRequest {
  sessionId: string;
  attackerCharacterId: string;
  targetId: string;
  targetAC: number;
  toHitModifier: number;
  damageDieType: DieType;
  damageDieCount: number;
  damageModifier: number;
  damageType: DamageType;
  advantage?: "advantage" | "disadvantage" | "normal";
  description: string;
}

export interface AttackRollResponse {
  attackRoll: number;
  attackTotal: number;
  hit: boolean;
  criticalHit: boolean;
  criticalFail: boolean;
  damageRolls?: number[];
  damageTotal?: number;
  damageType: DamageType;
  rollLogEntryId: string;
}
