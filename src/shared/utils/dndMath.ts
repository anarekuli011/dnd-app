import type {
  AbilityName,
  AbilityScores,
  Character,
  SkillName,
  SkillProficiency,
} from "../types/dnd";
import { SKILL_ABILITY_MAP } from "../types/dnd";

// ── Ability Modifier ─────────────────────────────────────────────
// The classic D&D formula: (score - 10) / 2, rounded down.

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ── Proficiency Bonus ────────────────────────────────────────────
// Based on character level (5e rules).

export function proficiencyBonus(level: number): number {
  if (level <= 0) return 2;
  return Math.ceil(level / 4) + 1;
}

// ── Saving Throw Modifier ────────────────────────────────────────

export function savingThrowModifier(
  character: Character,
  ability: AbilityName
): number {
  const base = abilityModifier(character.abilityScores[ability]);
  const proficient = character.savingThrows[ability] ?? false;
  return base + (proficient ? character.proficiencyBonus : 0);
}

// ── Skill Check Modifier ─────────────────────────────────────────

export function skillModifier(
  character: Character,
  skill: SkillName
): number {
  const ability = SKILL_ABILITY_MAP[skill] as AbilityName;
  const base = abilityModifier(character.abilityScores[ability]);
  const prof: SkillProficiency = character.skills[skill] ?? {
    proficient: false,
    expertise: false,
  };

  let bonus = 0;
  if (prof.expertise) {
    bonus = character.proficiencyBonus * 2;
  } else if (prof.proficient) {
    bonus = character.proficiencyBonus;
  }

  return base + bonus;
}

// ── Passive Perception ───────────────────────────────────────────

export function passivePerception(character: Character): number {
  return 10 + skillModifier(character, "perception");
}

// ── Initiative Modifier ──────────────────────────────────────────

export function initiativeModifier(character: Character): number {
  return abilityModifier(character.abilityScores.dexterity);
}

// ── Spell Save DC ────────────────────────────────────────────────
// 8 + proficiency bonus + spellcasting ability modifier

export function spellSaveDC(character: Character): number | null {
  if (!character.spellcastingAbility) return null;
  const abilityMod = abilityModifier(
    character.abilityScores[character.spellcastingAbility]
  );
  return 8 + character.proficiencyBonus + abilityMod;
}

// ── Spell Attack Modifier ────────────────────────────────────────
// proficiency bonus + spellcasting ability modifier

export function spellAttackModifier(character: Character): number | null {
  if (!character.spellcastingAbility) return null;
  const abilityMod = abilityModifier(
    character.abilityScores[character.spellcastingAbility]
  );
  return character.proficiencyBonus + abilityMod;
}

// ── Attack Modifier (melee/ranged) ───────────────────────────────
// For weapons: ability modifier + proficiency (if proficient).
// Finesse weapons can use STR or DEX — pass the relevant ability.

export function attackModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean = true
): number {
  return abilityModifier(abilityScore) + (isProficient ? proficiencyBonus : 0);
}

// ── Damage Modifier ──────────────────────────────────────────────
// Ability modifier (STR for melee, DEX for finesse/ranged) + magic bonus

export function damageModifier(
  abilityScore: number,
  magicBonus: number = 0
): number {
  return abilityModifier(abilityScore) + magicBonus;
}

// ── Armor Class Calculation ──────────────────────────────────────
// Basic AC calculation. Specific armor types have different formulas,
// but this handles the common cases.

export interface ACInput {
  baseAC: number; // from armor (or 10 if unarmored)
  dexModifier: number;
  maxDexBonus?: number; // medium armor caps DEX bonus at 2
  shieldBonus?: number;
  otherBonuses?: number;
}

export function calculateAC(input: ACInput): number {
  const dexBonus =
    input.maxDexBonus !== undefined
      ? Math.min(input.dexModifier, input.maxDexBonus)
      : input.dexModifier;

  return (
    input.baseAC +
    dexBonus +
    (input.shieldBonus ?? 0) +
    (input.otherBonuses ?? 0)
  );
}

// ── Carry Capacity ───────────────────────────────────────────────

export function carryCapacity(strengthScore: number): number {
  return strengthScore * 15;
}

// ── Encumbrance Thresholds ───────────────────────────────────────

export function encumbranceThresholds(strengthScore: number) {
  return {
    normal: strengthScore * 5,
    heavy: strengthScore * 10,
    max: strengthScore * 15,
  };
}

// ── XP Thresholds per Level ──────────────────────────────────────

const XP_BY_LEVEL: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

export function xpForLevel(level: number): number {
  return XP_BY_LEVEL[level] ?? 0;
}

export function xpToNextLevel(currentLevel: number, currentXP: number): number {
  const nextLevelXP = XP_BY_LEVEL[currentLevel + 1];
  if (!nextLevelXP) return 0; // already max level
  return Math.max(0, nextLevelXP - currentXP);
}

// ── Ability Score Summary ────────────────────────────────────────
// Returns a convenient object with score + modifier for each ability.

export function abilityScoreSummary(scores: AbilityScores) {
  const entries = Object.entries(scores) as [AbilityName, number][];
  return Object.fromEntries(
    entries.map(([name, score]) => [
      name,
      { score, modifier: abilityModifier(score) },
    ])
  ) as Record<AbilityName, { score: number; modifier: number }>;
}
