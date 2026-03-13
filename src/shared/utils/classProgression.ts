// ══════════════════════════════════════════════════════════════════
// Class & Race Progression Engine
// ══════════════════════════════════════════════════════════════════
//
// Ability scores are fully deterministic:
//   total = BASE + raceBonuses + classGrowth(level)
//
// Players cannot manually adjust ability scores.
// ══════════════════════════════════════════════════════════════════

import type { AbilityName, AbilityScores, DieType, SpellSchool } from "@shared/types/dnd";
import { ABILITY_NAMES, DIE_MAX } from "@shared/types/dnd";

// ── Base score for all abilities ─────────────────────────────────

const BASE_SCORE = 10;

// ══════════════════════════════════════════════════════════════════
// Race Definitions
// ══════════════════════════════════════════════════════════════════

export interface RaceDef {
  name: string;
  description: string;
  bonuses: Partial<Record<AbilityName, number>>;
  speed: number;
  languages: string[];
  /** Bonus spell slots: map of spell level → extra slots */
  bonusSlots: Partial<Record<number, number>>;
}

export const RACES: RaceDef[] = [
  {
    name: "Human",
    description:
      "Versatile and ambitious, humans adapt to any role and thrive through sheer determination and resourcefulness.",
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    languages: ["Common", "CHOOSE:language"],
    bonusSlots: { 1: 1 },
  },
  {
    name: "Elf",
    description:
      "Graceful and long-lived, elves possess keen senses, natural affinity for magic, and an unearthly elegance.",
    bonuses: { dexterity: 2, intelligence: 1, wisdom: 1 },
    speed: 35,
    languages: ["Common", "Elvish"],
    bonusSlots: { 1: 1 },
  },
  {
    name: "Dwarf",
    description:
      "Stout and resilient, dwarves are master craftsmen and fierce warriors forged in mountain strongholds.",
    bonuses: { constitution: 2, strength: 1, wisdom: 1 },
    speed: 25,
    languages: ["Common", "Dwarvish"],
    bonusSlots: {},
  },
  {
    name: "Orc",
    description:
      "Powerful and relentless, orcs channel primal fury into raw combat strength and unwavering endurance.",
    bonuses: { strength: 2, constitution: 2 },
    speed: 30,
    languages: ["Common", "Orcish"],
    bonusSlots: {},
  },
  {
    name: "Goblin",
    description:
      "Small but cunning, goblins survive through wit, speed, and a knack for turning chaos to their advantage.",
    bonuses: { dexterity: 2, charisma: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Goblin"],
    bonusSlots: { 1: 1 },
  },
  {
    name: "Demon",
    description:
      "Born of infernal planes, demons wield dark power and resist fire, carrying an aura of dread wherever they go.",
    bonuses: { charisma: 2, strength: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Infernal"],
    bonusSlots: { 2: 1 },
  },
  {
    name: "Angel",
    description:
      "Celestial beings touched by divine light, angels radiate holy energy and inspire courage in their allies.",
    bonuses: { wisdom: 2, charisma: 1, constitution: 1 },
    speed: 35,
    languages: ["Common", "Celestial"],
    bonusSlots: { 2: 1 },
  },
];

export const RACE_MAP = new Map(RACES.map((r) => [r.name, r]));

// ══════════════════════════════════════════════════════════════════
// Class Definitions
// ══════════════════════════════════════════════════════════════════

export interface ClassGrowth {
  /** +1 every 2 levels  → +10 at level 20 */
  primary: AbilityName;
  /** +1 every 3 levels  → +6 at level 20 */
  secondary: AbilityName;
  /** +1 every 5 levels  → +4 at level 20 */
  tertiary: AbilityName;
}

export interface ClassDef {
  name: string;
  description: string;
  growth: ClassGrowth;
  hitDie: DieType;
  armorProfile: "heavy" | "medium" | "light" | "unarmored";
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  spellcastingAbility: AbilityName;
  allowedSchools: SpellSchool[];
  /** full = slots at Lv1 up to Lv9, half = slots at Lv2 up to Lv5, third = slots at Lv3 up to Lv3 */
  casterType: "full" | "half" | "third";
}

export const CLASSES: ClassDef[] = [
  {
    name: "Rogue",
    description:
      "A stealthy trickster who uses cunning and agility to overcome obstacles and outmanoeuvre foes.",
    growth: { primary: "dexterity", secondary: "intelligence", tertiary: "charisma" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Hand Crossbow", "Rapier"],
    toolProficiencies: ["Thieves' Tools"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["shadowcraft", "illusion", "enchantment"],
    casterType: "third",
  },
  {
    name: "Archer",
    description:
      "A sharpshooter who masters ranged combat, raining precise death from a distance.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Longbow", "Shortbow", "Hand Crossbow"],
    toolProficiencies: ["Fletcher's Tools"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "divination", "evocation"],
    casterType: "half",
  },
  {
    name: "Wizard",
    description:
      "A scholarly spellcaster who wields arcane magic drawn from years of intense study.",
    growth: { primary: "intelligence", secondary: "wisdom", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Light Crossbow"],
    toolProficiencies: ["Arcane Focus"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["evocation", "abjuration", "conjuration", "divination", "transmutation"],
    casterType: "full",
  },
  {
    name: "Priest",
    description:
      "A divine healer and protector, channelling holy power to mend wounds and shield allies.",
    growth: { primary: "wisdom", secondary: "charisma", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Mace"],
    toolProficiencies: ["Holy Symbol", "Herbalism Kit"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["divine", "abjuration", "necromancy", "divination"],
    casterType: "half",
  },
  {
    name: "Warrior",
    description:
      "A battle-hardened fighter who relies on raw strength and martial prowess.",
    growth: { primary: "strength", secondary: "constitution", tertiary: "dexterity" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    spellcastingAbility: "strength",
    allowedSchools: ["battlecraft", "evocation"],
    casterType: "third",
  },
  {
    name: "Knight",
    description:
      "An armoured champion bound by a code of honour, excelling in mounted and melee combat.",
    growth: { primary: "strength", secondary: "constitution", tertiary: "charisma" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "Lance"],
    toolProficiencies: ["Mount Handling Kit"],
    spellcastingAbility: "charisma",
    allowedSchools: ["battlecraft", "divine", "abjuration"],
    casterType: "third",
  },
  {
    name: "Paladin",
    description:
      "A holy warrior who combines martial skill with divine magic to smite evil.",
    growth: { primary: "strength", secondary: "charisma", tertiary: "constitution" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: ["Holy Symbol"],
    spellcastingAbility: "charisma",
    allowedSchools: ["divine", "abjuration", "evocation"],
    casterType: "half",
  },
  {
    name: "Assassin",
    description:
      "A deadly shadow operative who eliminates targets with precision and lethal efficiency.",
    growth: { primary: "dexterity", secondary: "intelligence", tertiary: "strength" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Dagger", "Blowgun", "Hand Crossbow"],
    toolProficiencies: ["Poisoner's Kit", "Thieves' Tools"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["shadowcraft", "necromancy", "illusion"],
    casterType: "third",
  },
  {
    name: "Necromancer",
    description:
      "A dark mage who commands the forces of death, raising undead servants to do their bidding.",
    growth: { primary: "intelligence", secondary: "wisdom", tertiary: "charisma" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Sickle"],
    toolProficiencies: ["Arcane Focus", "Alchemist's Supplies"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["necromancy", "conjuration", "divination", "enchantment"],
    casterType: "full",
  },
  {
    name: "Huntress",
    description:
      "A swift wilderness tracker who blends primal instincts with deadly combat skills.",
    growth: { primary: "dexterity", secondary: "wisdom", tertiary: "strength" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Longbow", "Shortsword", "Spear"],
    toolProficiencies: ["Herbalism Kit", "Trapper's Kit"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "divination", "transmutation"],
    casterType: "half",
  },
  {
    name: "Mystic",
    description:
      "A psionically gifted adept who bends reality through sheer force of will.",
    growth: { primary: "wisdom", secondary: "intelligence", tertiary: "charisma" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff"],
    toolProficiencies: ["Psionic Focus"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["divination", "enchantment", "transmutation", "abjuration"],
    casterType: "full",
  },
  {
    name: "Trickster",
    description:
      "A chaotic illusionist who deceives enemies and warps perception to gain the upper hand.",
    growth: { primary: "charisma", secondary: "dexterity", tertiary: "intelligence" },
    hitDie: "d6",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Hand Crossbow", "Rapier"],
    toolProficiencies: ["Disguise Kit", "Forgery Kit"],
    spellcastingAbility: "charisma",
    allowedSchools: ["illusion", "enchantment", "shadowcraft"],
    casterType: "half",
  },
  {
    name: "Sorcerer",
    description:
      "A natural-born spellcaster whose innate magical bloodline fuels devastating power.",
    growth: { primary: "charisma", secondary: "intelligence", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Light Crossbow"],
    toolProficiencies: ["Arcane Focus"],
    spellcastingAbility: "charisma",
    allowedSchools: ["evocation", "enchantment", "transmutation", "conjuration"],
    casterType: "full",
  },
  {
    name: "Ninja",
    description:
      "A disciplined shadow warrior combining martial arts, stealth, and surprise attacks.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Nunchaku", "Shuriken"],
    toolProficiencies: ["Thieves' Tools", "Poisoner's Kit"],
    spellcastingAbility: "dexterity",
    allowedSchools: ["shadowcraft", "illusion"],
    casterType: "third",
  },
  {
    name: "Samurai",
    description:
      "A noble swordmaster who channels unwavering focus and discipline into devastating strikes.",
    growth: { primary: "strength", secondary: "dexterity", tertiary: "wisdom" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "Katana"],
    toolProficiencies: ["Calligrapher's Supplies"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["battlecraft", "divination"],
    casterType: "third",
  },
  {
    name: "Bard",
    description:
      "A charismatic performer who weaves magic through music, inspiring allies and beguiling foes.",
    growth: { primary: "charisma", secondary: "dexterity", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Rapier", "Shortsword", "Hand Crossbow"],
    toolProficiencies: ["Three Musical Instruments"],
    spellcastingAbility: "charisma",
    allowedSchools: ["enchantment", "illusion", "divination"],
    casterType: "half",
  },
  {
    name: "Summoner",
    description:
      "A conjurer who calls forth creatures and elemental forces to fight alongside them.",
    growth: { primary: "intelligence", secondary: "charisma", tertiary: "wisdom" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff"],
    toolProficiencies: ["Arcane Focus", "Summoning Circle Kit"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["conjuration", "transmutation", "divination", "abjuration"],
    casterType: "full",
  },
  {
    name: "Kensei",
    description:
      "A weapon master who achieves supernatural perfection through lifelong devotion to a single blade.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "constitution" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "CHOOSE:weapon"],
    toolProficiencies: ["Calligrapher's Supplies", "Artisan's Tools"],
    spellcastingAbility: "dexterity",
    allowedSchools: ["battlecraft", "transmutation"],
    casterType: "third",
  },
  {
    name: "Druid",
    description:
      "A guardian of nature who shapeshifts and commands the primal forces of the wild.",
    growth: { primary: "wisdom", secondary: "constitution", tertiary: "intelligence" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor (non-metal)", "Shields (non-metal)"],
    weaponProficiencies: ["Club", "Dagger", "Quarterstaff", "Scimitar", "Sickle", "Spear"],
    toolProficiencies: ["Herbalism Kit", "Druidic Focus"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "transmutation", "conjuration", "divination"],
    casterType: "half",
  },
];

export const CLASS_MAP = new Map(CLASSES.map((c) => [c.name, c]));

// ══════════════════════════════════════════════════════════════════
// Ability Score Computation
// ══════════════════════════════════════════════════════════════════

/**
 * Computes the class-based growth bonus for a single ability at
 * the given level.
 *
 *   primary   → +1 every 2 levels  (Lv 2,4,6,…,20  = +10 at 20)
 *   secondary → +1 every 3 levels  (Lv 3,6,9,…,18  = +6 at 20)
 *   tertiary  → +1 every 5 levels  (Lv 5,10,15,20   = +4 at 20)
 */
function classGrowthForAbility(
  growth: ClassGrowth,
  ability: AbilityName,
  level: number
): number {
  if (ability === growth.primary) return Math.floor(level / 2);
  if (ability === growth.secondary) return Math.floor(level / 3);
  if (ability === growth.tertiary) return Math.floor(level / 5);
  return 0;
}

/**
 * Computes the full ability scores for a character given their
 * race, class, and level.
 *
 * Returns the default base scores (all 10) if race or class
 * is not yet selected.
 */
export function computeAbilityScores(
  raceName: string,
  className: string,
  level: number
): AbilityScores {
  const scores = {} as AbilityScores;

  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  for (const ability of ABILITY_NAMES) {
    let total = BASE_SCORE;

    // Add race bonus
    if (race) {
      total += race.bonuses[ability] ?? 0;
    }

    // Add class growth
    if (cls) {
      total += classGrowthForAbility(cls.growth, ability, level);
    }

    scores[ability] = total;
  }

  return scores;
}

// ══════════════════════════════════════════════════════════════════
// Breakdown (for UI tooltips / display)
// ══════════════════════════════════════════════════════════════════

export interface AbilityBreakdown {
  base: number;
  raceBonus: number;
  classGrowth: number;
  total: number;
  growthLabel: "primary" | "secondary" | "tertiary" | null;
}

/**
 * Returns a per-ability breakdown showing where each point comes from.
 */
export function abilityScoreBreakdown(
  raceName: string,
  className: string,
  level: number
): Record<AbilityName, AbilityBreakdown> {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const result = {} as Record<AbilityName, AbilityBreakdown>;

  for (const ability of ABILITY_NAMES) {
    const raceBonus = race ? (race.bonuses[ability] ?? 0) : 0;
    const classGrowth = cls
      ? classGrowthForAbility(cls.growth, ability, level)
      : 0;

    let growthLabel: "primary" | "secondary" | "tertiary" | null = null;
    if (cls) {
      if (ability === cls.growth.primary) growthLabel = "primary";
      else if (ability === cls.growth.secondary) growthLabel = "secondary";
      else if (ability === cls.growth.tertiary) growthLabel = "tertiary";
    }

    result[ability] = {
      base: BASE_SCORE,
      raceBonus,
      classGrowth,
      total: BASE_SCORE + raceBonus + classGrowth,
      growthLabel,
    };
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════
// Combat Stats Computation
// ══════════════════════════════════════════════════════════════════

// ── Armor profile constants ──────────────────────────────────────

const ARMOR_PROFILES = {
  heavy:     { baseAC: 16, maxDex: 0,    label: "Heavy Armor" },
  medium:    { baseAC: 14, maxDex: 2,    label: "Medium Armor" },
  light:     { baseAC: 12, maxDex: null, label: "Light Armor" },
  unarmored: { baseAC: 10, maxDex: null, label: "Unarmored" },
} as const;

export { ARMOR_PROFILES };

// ── Speed ────────────────────────────────────────────────────────

export function computeSpeed(raceName: string): number {
  const race = RACE_MAP.get(raceName);
  return race?.speed ?? 30;
}

// ── Initiative ───────────────────────────────────────────────────

export function computeInitiative(dexScore: number): number {
  return Math.floor((dexScore - 10) / 2);
}

// ── Armor Class ──────────────────────────────────────────────────

export interface ACBreakdown {
  baseAC: number;
  dexBonus: number;
  armorBonus: number;
  shieldBonus: number;
  total: number;
  profileLabel: string;
}

/**
 * Computes AC from class armor profile + DEX + equipped items.
 * Equipped armor with acBonus replaces the class base AC.
 * Equipped shields (armor type items with "shield" in name) stack.
 */
export function computeAC(
  className: string,
  dexScore: number,
  equippedItems: { acBonus?: number; name: string; type: string }[]
): ACBreakdown {
  const cls = CLASS_MAP.get(className);
  const profile = cls
    ? ARMOR_PROFILES[cls.armorProfile]
    : ARMOR_PROFILES.unarmored;

  const dexMod = Math.floor((dexScore - 10) / 2);
  const dexBonus =
    profile.maxDex !== null ? Math.min(dexMod, profile.maxDex) : dexMod;

  // Check for equipped armor / shields
  let armorBonus = 0;
  let shieldBonus = 0;

  for (const item of equippedItems) {
    if (!item.acBonus || item.acBonus <= 0) continue;
    const isShield = item.name.toLowerCase().includes("shield");
    if (isShield) {
      shieldBonus += item.acBonus;
    } else {
      armorBonus = Math.max(armorBonus, item.acBonus);
    }
  }

  return {
    baseAC: profile.baseAC,
    dexBonus,
    armorBonus,
    shieldBonus,
    total: profile.baseAC + dexBonus + armorBonus + shieldBonus,
    profileLabel: profile.label,
  };
}

// ── Hit Points ───────────────────────────────────────────────────

export interface HPBreakdown {
  hitDie: DieType;
  hitDieMax: number;
  avgRoll: number;
  conModPerLevel: number;
  maxHP: number;
  formula: string;
}

/**
 * Computes max HP using standard rules:
 *   Level 1 → hit die max + CON modifier
 *   Each level after → average roll (ceil(dieMax/2)+1) + CON modifier
 *
 * Minimum max HP is always 1.
 */
export function computeMaxHP(
  className: string,
  level: number,
  conScore: number
): HPBreakdown {
  const cls = CLASS_MAP.get(className);
  const hitDie: DieType = cls?.hitDie ?? "d8";
  const hitDieMax = DIE_MAX[hitDie];
  const avgRoll = Math.ceil(hitDieMax / 2) + 1;
  const conMod = Math.floor((conScore - 10) / 2);

  const lvl1HP = hitDieMax + conMod;
  const restHP = (level - 1) * (avgRoll + conMod);
  const maxHP = Math.max(1, lvl1HP + restHP);

  const formula =
    level === 1
      ? `${hitDieMax} (${hitDie} max) + ${conMod} (CON)`
      : `${hitDieMax} + ${level - 1}×${avgRoll} (avg ${hitDie}) + ${level}×${conMod} (CON)`;

  return {
    hitDie,
    hitDieMax,
    avgRoll,
    conModPerLevel: conMod,
    maxHP,
    formula,
  };
}

// ── Hit Dice ─────────────────────────────────────────────────────

export function computeHitDice(
  className: string,
  level: number
): { dieType: DieType; total: number } {
  const cls = CLASS_MAP.get(className);
  return {
    dieType: cls?.hitDie ?? "d8",
    total: level,
  };
}

// ══════════════════════════════════════════════════════════════════
// Proficiency Choices
// ══════════════════════════════════════════════════════════════════

/** Available options for each CHOOSE: category */
export const PROFICIENCY_CHOICES: Record<string, string[]> = {
  language: [
    "Elvish",
    "Dwarvish",
    "Orcish",
    "Goblin",
    "Infernal",
    "Celestial",
    "Draconic",
    "Sylvan",
    "Primordial",
    "Abyssal",
    "Deep Speech",
    "Giant",
    "Gnomish",
    "Halfling",
    "Undercommon",
  ],
  weapon: [
    "Longsword",
    "Greatsword",
    "Scimitar",
    "Rapier",
    "Battleaxe",
    "Warhammer",
    "Halberd",
    "Glaive",
    "Flail",
    "Morningstar",
    "War Pick",
    "Trident",
    "Whip",
    "Longbow",
  ],
};

/**
 * Returns the CHOOSE: category from a marker string.
 * e.g. "CHOOSE:language" → "language"
 */
export function parseChoiceMarker(item: string): string | null {
  if (item.startsWith("CHOOSE:")) return item.slice(7);
  return null;
}

// ══════════════════════════════════════════════════════════════════
// Proficiency Computation
// ══════════════════════════════════════════════════════════════════

export interface ComputedProficiencies {
  languages: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
}

/**
 * Computes all proficiencies by merging race (languages)
 * and class (armor, weapon, tool) contributions.
 *
 * `choices` is a map of "CHOOSE:category" → selected value.
 * Unresolved choices stay as "CHOOSE:xxx" markers.
 */
export function computeProficiencies(
  raceName: string,
  className: string,
  choices: Record<string, string> = {}
): ComputedProficiencies {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const resolve = (items: string[]): string[] =>
    items.map((item) => {
      if (item.startsWith("CHOOSE:")) {
        const selected = choices[item];
        return selected || item; // keep marker if unresolved
      }
      return item;
    });

  const languages = resolve([...(race?.languages ?? ["Common"])]);
  const armor = resolve([...(cls?.armorProficiencies ?? [])]);
  const weapons = resolve([...(cls?.weaponProficiencies ?? [])]);
  const tools = resolve([...(cls?.toolProficiencies ?? [])]);

  // Deduplicate (but keep CHOOSE: markers)
  const dedup = (arr: string[]) => [...new Set(arr)].sort((a, b) => {
    // Sort CHOOSE: items to the end
    const aIsChoice = a.startsWith("CHOOSE:");
    const bIsChoice = b.startsWith("CHOOSE:");
    if (aIsChoice && !bIsChoice) return 1;
    if (!aIsChoice && bIsChoice) return -1;
    return a.localeCompare(b);
  });

  return {
    languages: dedup(languages),
    armorProficiencies: dedup(armor),
    weaponProficiencies: dedup(weapons),
    toolProficiencies: dedup(tools),
  };
}

/**
 * Scans all proficiency arrays from race + class and returns
 * the list of CHOOSE: markers that need resolution.
 */
export function getUnresolvedChoices(
  raceName: string,
  className: string
): string[] {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const all = [
    ...(race?.languages ?? []),
    ...(cls?.armorProficiencies ?? []),
    ...(cls?.weaponProficiencies ?? []),
    ...(cls?.toolProficiencies ?? []),
  ];

  return all.filter((item) => item.startsWith("CHOOSE:"));
}

// ══════════════════════════════════════════════════════════════════
// Spellcasting
// ══════════════════════════════════════════════════════════════════

/**
 * Returns the spellcasting ability for a class, or undefined if
 * the class is not recognised.
 */
export function computeSpellcastingAbility(
  className: string
): AbilityName | undefined {
  const cls = CLASS_MAP.get(className);
  return cls?.spellcastingAbility;
}

// ══════════════════════════════════════════════════════════════════
// Spell Slot Progression
// ══════════════════════════════════════════════════════════════════

/**
 * Spell slot tables by caster type.
 * Key = character level (1–20), value = array of slots [lv1, lv2, ..., lv9].
 */

const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
};

const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [2,0,0,0,0,0,0,0,0],
  3:  [3,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [4,2,0,0,0,0,0,0,0],
  6:  [4,2,0,0,0,0,0,0,0],
  7:  [4,3,0,0,0,0,0,0,0],
  8:  [4,3,0,0,0,0,0,0,0],
  9:  [4,3,2,0,0,0,0,0,0],
  10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0],
  12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0],
  14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,2,0,0,0,0,0],
  16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0],
  18: [4,3,3,3,1,0,0,0,0],
  19: [4,3,3,3,2,0,0,0,0],
  20: [4,3,3,3,2,0,0,0,0],
};

const THIRD_CASTER_SLOTS: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [0,0,0,0,0,0,0,0,0],
  3:  [2,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [3,0,0,0,0,0,0,0,0],
  6:  [3,0,0,0,0,0,0,0,0],
  7:  [4,2,0,0,0,0,0,0,0],
  8:  [4,2,0,0,0,0,0,0,0],
  9:  [4,2,0,0,0,0,0,0,0],
  10: [4,3,0,0,0,0,0,0,0],
  11: [4,3,0,0,0,0,0,0,0],
  12: [4,3,0,0,0,0,0,0,0],
  13: [4,3,2,0,0,0,0,0,0],
  14: [4,3,2,0,0,0,0,0,0],
  15: [4,3,2,0,0,0,0,0,0],
  16: [4,3,3,0,0,0,0,0,0],
  17: [4,3,3,0,0,0,0,0,0],
  18: [4,3,3,0,0,0,0,0,0],
  19: [4,3,3,0,0,0,0,0,0],
  20: [4,3,3,0,0,0,0,0,0],
};

const SLOT_TABLES: Record<string, Record<number, number[]>> = {
  full: FULL_CASTER_SLOTS,
  half: HALF_CASTER_SLOTS,
  third: THIRD_CASTER_SLOTS,
};

export interface SpellSlotProgression {
  /** Max slots per spell level (index 0 = level 1, index 8 = level 9) */
  slots: number[];
  /** Highest spell level this character has access to */
  maxSpellLevel: number;
  /** Caster type label for display */
  casterLabel: string;
  /** Per-level breakdown: base from class + bonus from race */
  breakdown: { base: number; raceBonus: number; total: number }[];
}

/**
 * Computes the spell slot progression for a character.
 * Base slots come from the class's caster type table.
 * Race bonuses stack on top (only if the character has
 * access to that spell level already, or the bonus is for level 1).
 */
export function computeSpellSlots(
  className: string,
  raceName: string,
  level: number
): SpellSlotProgression {
  const cls = CLASS_MAP.get(className);
  const race = RACE_MAP.get(raceName);

  const casterType = cls?.casterType ?? "third";
  const table = SLOT_TABLES[casterType];
  const baseSlots = table[Math.min(Math.max(level, 1), 20)] ?? [0,0,0,0,0,0,0,0,0];

  const raceBonuses = race?.bonusSlots ?? {};

  const breakdown: SpellSlotProgression["breakdown"] = [];
  const finalSlots: number[] = [];
  let maxSpellLevel = 0;

  for (let i = 0; i < 9; i++) {
    const spellLevel = i + 1;
    const base = baseSlots[i];
    const raceBonus = raceBonuses[spellLevel] ?? 0;
    // Only apply race bonus if character has base slots OR it's level 1
    const applicableBonus = (base > 0 || spellLevel === 1) ? raceBonus : 0;
    const total = base + applicableBonus;

    finalSlots.push(total);
    breakdown.push({ base, raceBonus: applicableBonus, total });

    if (total > 0) maxSpellLevel = spellLevel;
  }

  const casterLabels: Record<string, string> = {
    full: "Full Caster",
    half: "Half Caster",
    third: "Third Caster",
  };

  return {
    slots: finalSlots,
    maxSpellLevel,
    casterLabel: casterLabels[casterType] ?? "Third Caster",
    breakdown,
  };
}