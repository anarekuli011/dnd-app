import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  DieType,
  DamageType,
  AbilityName,
  SkillName,
  Character,
} from "@shared/types/dnd";
import { SKILL_ABILITY_MAP } from "@shared/types/dnd";
import {
  abilityModifier,
  skillModifier,
  savingThrowModifier,
} from "@shared/utils/dndMath";

// ── Initialize Cloud Functions ───────────────────────────────────

const functions = getFunctions();

// ── Generic roll ─────────────────────────────────────────────────

export async function callGenericRoll(params: {
  sessionId: string;
  characterId?: string;
  dieType: DieType;
  dieCount: number;
  modifier?: number;
  description?: string;
}) {
  const fn = httpsCallable(functions, "genericRoll");
  const result = await fn(params);
  return result.data as {
    rolls: number[];
    rawTotal: number;
    modifier: number;
    total: number;
    rollLogEntryId: string;
  };
}

// ── Ability check ────────────────────────────────────────────────

export async function callAbilityCheck(params: {
  sessionId: string;
  character: Character;
  ability: AbilityName;
  dc?: number;
  advantage?: "advantage" | "disadvantage" | "normal";
  description: string;
  rollRequestId?: string;
}) {
  const fn = httpsCallable(functions, "abilityCheck");
  const result = await fn({
    sessionId: params.sessionId,
    characterId: params.character.id,
    abilityScore: params.character.abilityScores[params.ability],
    proficiencyBonus: params.character.proficiencyBonus,
    isProficient: false,
    hasExpertise: false,
    advantage: params.advantage ?? "normal",
    dc: params.dc,
    description: params.description,
    rollType: "ability_check",
    rollRequestId: params.rollRequestId,
  });
  return result.data as {
    naturalRoll: number;
    modifier: number;
    total: number;
    dc?: number;
    success?: boolean;
    criticalHit: boolean;
    criticalFail: boolean;
    rollLogEntryId: string;
  };
}

// ── Skill check ──────────────────────────────────────────────────

export async function callSkillCheck(params: {
  sessionId: string;
  character: Character;
  skill: SkillName;
  dc?: number;
  advantage?: "advantage" | "disadvantage" | "normal";
  description: string;
  rollRequestId?: string;
}) {
  const ability = SKILL_ABILITY_MAP[params.skill] as AbilityName;
  const prof = params.character.skills[params.skill];

  const fn = httpsCallable(functions, "abilityCheck");
  const result = await fn({
    sessionId: params.sessionId,
    characterId: params.character.id,
    abilityScore: params.character.abilityScores[ability],
    proficiencyBonus: params.character.proficiencyBonus,
    isProficient: prof?.proficient ?? false,
    hasExpertise: prof?.expertise ?? false,
    advantage: params.advantage ?? "normal",
    dc: params.dc,
    description: params.description,
    rollType: "skill_check",
    skill: params.skill,
    rollRequestId: params.rollRequestId,
  });
  return result.data as {
    naturalRoll: number;
    modifier: number;
    total: number;
    dc?: number;
    success?: boolean;
    criticalHit: boolean;
    criticalFail: boolean;
    rollLogEntryId: string;
  };
}

// ── Saving throw ─────────────────────────────────────────────────

export async function callSavingThrow(params: {
  sessionId: string;
  character: Character;
  ability: AbilityName;
  dc: number;
  advantage?: "advantage" | "disadvantage" | "normal";
  description: string;
  rollRequestId?: string;
}) {
  const fn = httpsCallable(functions, "savingThrow");
  const result = await fn({
    sessionId: params.sessionId,
    characterId: params.character.id,
    abilityScore: params.character.abilityScores[params.ability],
    proficiencyBonus: params.character.proficiencyBonus,
    isProficient: params.character.savingThrows[params.ability] ?? false,
    advantage: params.advantage ?? "normal",
    dc: params.dc,
    description: params.description,
    rollRequestId: params.rollRequestId,
  });
  return result.data as {
    naturalRoll: number;
    modifier: number;
    total: number;
    dc: number;
    success: boolean;
    criticalHit: boolean;
    criticalFail: boolean;
    rollLogEntryId: string;
  };
}

// ── Attack roll ──────────────────────────────────────────────────

export async function callAttackRoll(params: {
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
}) {
  const fn = httpsCallable(functions, "attackRoll");
  const result = await fn(params);
  return result.data as {
    attackRoll: number;
    attackTotal: number;
    hit: boolean;
    criticalHit: boolean;
    criticalFail: boolean;
    damageRolls?: number[];
    damageTotal?: number;
    damageType: string;
    rollLogEntryId: string;
    damageLogId?: string;
  };
}

// ── Initiative roll ──────────────────────────────────────────────

export async function callInitiativeRoll(params: {
  sessionId: string;
  character: Character;
  bonusModifier?: number;
}) {
  const fn = httpsCallable(functions, "initiativeRoll");
  const result = await fn({
    sessionId: params.sessionId,
    characterId: params.character.id,
    dexterityScore: params.character.abilityScores.dexterity,
    bonusModifier: params.bonusModifier,
    description: `${params.character.name} rolls initiative`,
  });
  return result.data as {
    roll: number;
    modifier: number;
    total: number;
    rollLogEntryId: string;
  };
}

// ── Death saving throw ───────────────────────────────────────────

export async function callDeathSave(params: {
  sessionId: string;
  character: Character;
}) {
  const fn = httpsCallable(functions, "deathSave");
  const result = await fn({
    sessionId: params.sessionId,
    characterId: params.character.id,
    currentSuccesses: params.character.deathSaves.successes,
    currentFailures: params.character.deathSaves.failures,
  });
  return result.data as {
    roll: number;
    successes: number;
    failures: number;
    totalSuccesses: number;
    totalFailures: number;
    stabilized: boolean;
    regainedHP: boolean;
    dead: boolean;
    rollLogEntryId: string;
  };
}

// ── Batch initiative (GM) ────────────────────────────────────────

export async function callBatchInitiative(params: {
  sessionId: string;
  combatants: {
    id: string;
    name: string;
    dexterityScore: number;
    bonusModifier?: number;
  }[];
}) {
  const fn = httpsCallable(functions, "batchInitiative");
  const result = await fn(params);
  return result.data as {
    turnOrder: {
      id: string;
      name: string;
      roll: number;
      modifier: number;
      total: number;
    }[];
  };
}
