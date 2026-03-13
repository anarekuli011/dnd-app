// ══════════════════════════════════════════════════════════════════
// Class & Race Progression Engine
// ══════════════════════════════════════════════════════════════════
//
// Ability scores are fully deterministic:
//   total = BASE + raceBonuses + classGrowth(level)
//
// Players cannot manually adjust ability scores.
// ══════════════════════════════════════════════════════════════════

import type { AbilityName, AbilityScores, DieType } from "@shared/types/dnd";
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
}

export const RACES: RaceDef[] = [
  {
    name: "Human",
    description:
      "Versatile and ambitious, humans adapt to any role and thrive through sheer determination and resourcefulness.",
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    languages: ["Common", "CHOOSE:language"],
  },
  {
    name: "Elf",
    description:
      "Graceful and long-lived, elves possess keen senses, natural affinity for magic, and an unearthly elegance.",
    bonuses: { dexterity: 2, intelligence: 1, wisdom: 1 },
    speed: 35,
    languages: ["Common", "Elvish"],
  },
  {
    name: "Dwarf",
    description:
      "Stout and resilient, dwarves are master craftsmen and fierce warriors forged in mountain strongholds.",
    bonuses: { constitution: 2, strength: 1, wisdom: 1 },
    speed: 25,
    languages: ["Common", "Dwarvish"],
  },
  {
    name: "Orc",
    description:
      "Powerful and relentless, orcs channel primal fury into raw combat strength and unwavering endurance.",
    bonuses: { strength: 2, constitution: 2 },
    speed: 30,
    languages: ["Common", "Orcish"],
  },
  {
    name: "Goblin",
    description:
      "Small but cunning, goblins survive through wit, speed, and a knack for turning chaos to their advantage.",
    bonuses: { dexterity: 2, charisma: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Goblin"],
  },
  {
    name: "Demon",
    description:
      "Born of infernal planes, demons wield dark power and resist fire, carrying an aura of dread wherever they go.",
    bonuses: { charisma: 2, strength: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Infernal"],
  },
  {
    name: "Angel",
    description:
      "Celestial beings touched by divine light, angels radiate holy energy and inspire courage in their allies.",
    bonuses: { wisdom: 2, charisma: 1, constitution: 1 },
    speed: 35,
    languages: ["Common", "Celestial"],
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