import * as crypto from "crypto";

// ── Types (duplicated from shared to avoid cross-project imports) ─

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

export type AdvantageMode = "advantage" | "disadvantage" | "normal";

// ── Secure random number ─────────────────────────────────────────
// Uses crypto.randomInt for tamper-proof server-side randomness.

function secureRandom(min: number, max: number): number {
  return crypto.randomInt(min, max + 1); // randomInt upper bound is exclusive
}

// ── Roll a single die ────────────────────────────────────────────

export function rollDie(dieType: DieType): number {
  return secureRandom(1, DIE_MAX[dieType]);
}

// ── Roll multiple dice ───────────────────────────────────────────

export function rollDice(dieType: DieType, count: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(dieType));
  }
  return results;
}

// ── Sum of dice ──────────────────────────────────────────────────

export function sumDice(rolls: number[]): number {
  return rolls.reduce((sum, r) => sum + r, 0);
}

// ── Roll with advantage / disadvantage ───────────────────────────
// Rolls 2d20 and keeps the higher (advantage) or lower (disadvantage).

export interface AdvantageRollResult {
  roll1: number;
  roll2: number;
  kept: number;
  discarded: number;
}

export function rollWithAdvantage(
  mode: AdvantageMode
): AdvantageRollResult {
  const roll1 = rollDie("d20");
  const roll2 = rollDie("d20");

  if (mode === "advantage") {
    const kept = Math.max(roll1, roll2);
    const discarded = Math.min(roll1, roll2);
    return { roll1, roll2, kept, discarded };
  } else if (mode === "disadvantage") {
    const kept = Math.min(roll1, roll2);
    const discarded = Math.max(roll1, roll2);
    return { roll1, roll2, kept, discarded };
  }

  // Normal — just use the first roll
  return { roll1, roll2: roll1, kept: roll1, discarded: roll1 };
}

// ── Critical detection ───────────────────────────────────────────

export function isCriticalHit(naturalRoll: number): boolean {
  return naturalRoll === 20;
}

export function isCriticalFail(naturalRoll: number): boolean {
  return naturalRoll === 1;
}

// ── Ability modifier ─────────────────────────────────────────────

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ── Proficiency bonus by level ───────────────────────────────────

export function proficiencyBonus(level: number): number {
  if (level <= 0) return 2;
  return Math.ceil(level / 4) + 1;
}

// ── Full roll pipeline ───────────────────────────────────────────
// Rolls a d20 (with optional advantage/disadvantage), applies modifier,
// compares against DC/AC, and returns a complete result.

export interface FullRollInput {
  modifier: number;
  advantage: AdvantageMode;
  dc?: number;
  targetAC?: number;
}

export interface FullRollResult {
  naturalRoll: number;
  roll1: number;
  roll2: number;
  keptRoll: number;
  discardedRoll: number;
  modifier: number;
  total: number;
  criticalHit: boolean;
  criticalFail: boolean;
  success?: boolean;
}

export function fullD20Roll(input: FullRollInput): FullRollResult {
  const advResult = rollWithAdvantage(input.advantage);
  const naturalRoll = advResult.kept;
  const total = naturalRoll + input.modifier;

  const criticalHit = isCriticalHit(naturalRoll);
  const criticalFail = isCriticalFail(naturalRoll);

  // Determine success against DC or AC
  let success: boolean | undefined;

  if (input.dc !== undefined) {
    // Skill checks / saving throws: meet or beat DC
    // Natural 20 on a death save is special but general checks
    // don't auto-succeed on nat 20 in 5e (though many tables house-rule it)
    success = total >= input.dc;
  } else if (input.targetAC !== undefined) {
    // Attack rolls: natural 20 always hits, natural 1 always misses
    if (criticalHit) {
      success = true;
    } else if (criticalFail) {
      success = false;
    } else {
      success = total >= input.targetAC;
    }
  }

  return {
    naturalRoll,
    roll1: advResult.roll1,
    roll2: advResult.roll2,
    keptRoll: advResult.kept,
    discardedRoll: advResult.discarded,
    modifier: input.modifier,
    total,
    criticalHit,
    criticalFail,
    success,
  };
}

// ── Damage roll ──────────────────────────────────────────────────
// Rolls damage dice + modifier. On a critical hit, double the dice.

export interface DamageRollInput {
  dieType: DieType;
  dieCount: number;
  modifier: number;
  criticalHit: boolean;
}

export interface DamageRollResult {
  rolls: number[];
  rawTotal: number;
  modifier: number;
  total: number;
}

export function rollDamage(input: DamageRollInput): DamageRollResult {
  // Critical hits double the number of dice rolled
  const actualDieCount = input.criticalHit
    ? input.dieCount * 2
    : input.dieCount;

  const rolls = rollDice(input.dieType, actualDieCount);
  const rawTotal = sumDice(rolls);
  const total = Math.max(0, rawTotal + input.modifier); // damage can't be negative

  return { rolls, rawTotal, modifier: input.modifier, total };
}

// ── Initiative roll ──────────────────────────────────────────────

export function rollInitiative(dexModifier: number): {
  roll: number;
  total: number;
} {
  const roll = rollDie("d20");
  return { roll, total: roll + dexModifier };
}

// ── Death saving throw ───────────────────────────────────────────
// Natural 1 = 2 failures, Natural 20 = regain 1 HP, otherwise 10+ = success

export interface DeathSaveResult {
  roll: number;
  successes: number; // 0 or 1 (or 0 for nat 1)
  failures: number; // 0, 1, or 2 (nat 1 = 2 failures)
  stabilized: boolean; // 3 total successes
  regainedHP: boolean; // natural 20
}

export function rollDeathSave(
  currentSuccesses: number,
  currentFailures: number
): DeathSaveResult {
  const roll = rollDie("d20");

  if (roll === 1) {
    // Natural 1: two death save failures
    const newFailures = currentFailures + 2;
    return {
      roll,
      successes: 0,
      failures: 2,
      stabilized: false,
      regainedHP: false,
    };
  }

  if (roll === 20) {
    // Natural 20: regain 1 hit point
    return {
      roll,
      successes: 1,
      failures: 0,
      stabilized: true,
      regainedHP: true,
    };
  }

  if (roll >= 10) {
    // Success
    const newSuccesses = currentSuccesses + 1;
    return {
      roll,
      successes: 1,
      failures: 0,
      stabilized: newSuccesses >= 3,
      regainedHP: false,
    };
  }

  // Failure
  return {
    roll,
    successes: 0,
    failures: 1,
    stabilized: false,
    regainedHP: false,
  };
}
