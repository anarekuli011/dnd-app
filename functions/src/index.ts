import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  fullD20Roll,
  rollDamage,
  rollDice,
  rollInitiative,
  rollDeathSave,
  sumDice,
  abilityModifier,
  type AdvantageMode,
  type DieType,
  DIE_MAX,
} from "./diceEngine";

admin.initializeApp();
const db = admin.firestore();

// ── Helpers ──────────────────────────────────────────────────────

async function writeRollLog(
  sessionId: string,
  entry: Record<string, unknown>
): Promise<string> {
  const ref = await db
    .collection("sessions")
    .doc(sessionId)
    .collection("rollLog")
    .add({
      ...entry,
      timestamp: Date.now(),
    });
  return ref.id;
}

function requireAuth(request: { auth?: { uid: string } }): string {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to roll dice."
    );
  }
  return request.auth.uid;
}

function validateDieType(dieType: string): DieType {
  if (!(dieType in DIE_MAX)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid die type: ${dieType}. Must be one of: d4, d6, d8, d10, d12, d20, d100.`
    );
  }
  return dieType as DieType;
}

// ══════════════════════════════════════════════════════════════════
// 1. Generic Dice Roll
// ══════════════════════════════════════════════════════════════════

interface GenericRollData {
  sessionId: string;
  characterId?: string;
  dieType: string;
  dieCount: number;
  modifier?: number;
  description?: string;
}

export const genericRoll = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as GenericRollData;
  const dieType = validateDieType(data.dieType);
  const dieCount = Math.min(Math.max(data.dieCount || 1, 1), 100);
  const modifier = data.modifier ?? 0;

  const rolls = rollDice(dieType, dieCount);
  const rawTotal = sumDice(rolls);
  const total = rawTotal + modifier;

  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    rollType: "custom",
    dieType,
    dieCount,
    rolls,
    rawTotal,
    modifier,
    total,
    description: data.description ?? `Rolled ${dieCount}${dieType}`,
  });

  return { rolls, rawTotal, modifier, total, rollLogEntryId };
});

// ══════════════════════════════════════════════════════════════════
// 2. Ability Check / Skill Check
// ══════════════════════════════════════════════════════════════════

interface AbilityCheckData {
  sessionId: string;
  characterId: string;
  abilityScore: number;
  proficiencyBonus?: number;
  isProficient?: boolean;
  hasExpertise?: boolean;
  advantage?: AdvantageMode;
  dc?: number;
  description: string;
  rollType?: "ability_check" | "skill_check";
  skill?: string;
  rollRequestId?: string;
}

export const abilityCheck = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as AbilityCheckData;

  const abilityMod = abilityModifier(data.abilityScore);
  let profBonus = 0;
  if (data.isProficient && data.proficiencyBonus) {
    profBonus = data.hasExpertise
      ? data.proficiencyBonus * 2
      : data.proficiencyBonus;
  }
  const totalModifier = abilityMod + profBonus;

  const result = fullD20Roll({
    modifier: totalModifier,
    advantage: data.advantage ?? "normal",
    dc: data.dc,
  });

  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    characterId: data.characterId,
    rollType: data.rollType ?? "ability_check",
    dieType: "d20",
    dieCount: 1,
    rolls: [result.roll1, result.roll2],
    rawTotal: result.naturalRoll,
    modifier: totalModifier,
    total: result.total,
    advantage: data.advantage ?? "normal",
    keptRoll: result.keptRoll,
    discardedRoll: result.discardedRoll,
    dc: data.dc,
    success: result.success,
    criticalHit: result.criticalHit,
    criticalFail: result.criticalFail,
    description: data.description,
    rollRequestId: data.rollRequestId,
  });

  if (data.rollRequestId) {
    await db
      .collection("sessions")
      .doc(data.sessionId)
      .collection("rollRequests")
      .doc(data.rollRequestId)
      .update({ status: "completed" });
  }

  return {
    naturalRoll: result.naturalRoll,
    modifier: totalModifier,
    total: result.total,
    advantage: data.advantage ?? "normal",
    keptRoll: result.keptRoll,
    discardedRoll: result.discardedRoll,
    dc: data.dc,
    success: result.success,
    criticalHit: result.criticalHit,
    criticalFail: result.criticalFail,
    rollLogEntryId,
  };
});

// ══════════════════════════════════════════════════════════════════
// 3. Saving Throw
// ══════════════════════════════════════════════════════════════════

interface SavingThrowData {
  sessionId: string;
  characterId: string;
  abilityScore: number;
  proficiencyBonus?: number;
  isProficient?: boolean;
  advantage?: AdvantageMode;
  dc: number;
  description: string;
  rollRequestId?: string;
}

export const savingThrow = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as SavingThrowData;

  const abilityMod = abilityModifier(data.abilityScore);
  const profBonus =
    data.isProficient && data.proficiencyBonus ? data.proficiencyBonus : 0;
  const totalModifier = abilityMod + profBonus;

  const result = fullD20Roll({
    modifier: totalModifier,
    advantage: data.advantage ?? "normal",
    dc: data.dc,
  });

  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    characterId: data.characterId,
    rollType: "saving_throw",
    dieType: "d20",
    dieCount: 1,
    rolls: [result.roll1, result.roll2],
    rawTotal: result.naturalRoll,
    modifier: totalModifier,
    total: result.total,
    advantage: data.advantage ?? "normal",
    keptRoll: result.keptRoll,
    discardedRoll: result.discardedRoll,
    dc: data.dc,
    success: result.success,
    criticalHit: result.criticalHit,
    criticalFail: result.criticalFail,
    description: data.description,
    rollRequestId: data.rollRequestId,
  });

  if (data.rollRequestId) {
    await db
      .collection("sessions")
      .doc(data.sessionId)
      .collection("rollRequests")
      .doc(data.rollRequestId)
      .update({ status: "completed" });
  }

  return {
    naturalRoll: result.naturalRoll,
    modifier: totalModifier,
    total: result.total,
    dc: data.dc,
    success: result.success,
    criticalHit: result.criticalHit,
    criticalFail: result.criticalFail,
    rollLogEntryId,
  };
});

// ══════════════════════════════════════════════════════════════════
// 4. Attack Roll (with automatic damage on hit)
// ══════════════════════════════════════════════════════════════════

interface AttackRollData {
  sessionId: string;
  attackerCharacterId: string;
  targetId: string;
  targetAC: number;
  toHitModifier: number;
  damageDieType: string;
  damageDieCount: number;
  damageModifier: number;
  damageType: string;
  advantage?: AdvantageMode;
  description: string;
}

export const attackRoll = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as AttackRollData;
  const damageDieType = validateDieType(data.damageDieType);

  // 1. Roll to hit
  const hitResult = fullD20Roll({
    modifier: data.toHitModifier,
    advantage: data.advantage ?? "normal",
    targetAC: data.targetAC,
  });

  // 2. Roll damage if hit
  let damageResult: {
    rolls: number[];
    rawTotal: number;
    modifier: number;
    total: number;
  } | null = null;

  if (hitResult.success) {
    damageResult = rollDamage({
      dieType: damageDieType,
      dieCount: data.damageDieCount,
      modifier: data.damageModifier,
      criticalHit: hitResult.criticalHit,
    });
  }

  // 3. Log the attack
  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    characterId: data.attackerCharacterId,
    rollType: "attack",
    dieType: "d20",
    dieCount: 1,
    rolls: [hitResult.roll1, hitResult.roll2],
    rawTotal: hitResult.naturalRoll,
    modifier: data.toHitModifier,
    total: hitResult.total,
    advantage: data.advantage ?? "normal",
    keptRoll: hitResult.keptRoll,
    discardedRoll: hitResult.discardedRoll,
    targetAC: data.targetAC,
    success: hitResult.success,
    criticalHit: hitResult.criticalHit,
    criticalFail: hitResult.criticalFail,
    description: data.description,
  });

  // 4. Log damage separately if hit
  let damageLogId: string | undefined;
  if (damageResult) {
    damageLogId = await writeRollLog(data.sessionId, {
      playerId: uid,
      characterId: data.attackerCharacterId,
      rollType: "damage",
      dieType: damageDieType,
      dieCount: hitResult.criticalHit
        ? data.damageDieCount * 2
        : data.damageDieCount,
      rolls: damageResult.rolls,
      rawTotal: damageResult.rawTotal,
      modifier: damageResult.modifier,
      total: damageResult.total,
      description: `${data.description} — ${damageResult.total} ${data.damageType} damage${hitResult.criticalHit ? " (CRITICAL!)" : ""}`,
    });
  }

  return {
    attackRoll: hitResult.naturalRoll,
    attackTotal: hitResult.total,
    hit: hitResult.success ?? false,
    criticalHit: hitResult.criticalHit,
    criticalFail: hitResult.criticalFail,
    damageRolls: damageResult?.rolls,
    damageTotal: damageResult?.total,
    damageType: data.damageType,
    rollLogEntryId,
    damageLogId,
  };
});

// ══════════════════════════════════════════════════════════════════
// 5. Initiative Roll
// ══════════════════════════════════════════════════════════════════

interface InitiativeRollData {
  sessionId: string;
  characterId: string;
  dexterityScore: number;
  bonusModifier?: number;
  description?: string;
}

export const initiativeRoll = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as InitiativeRollData;

  const dexMod = abilityModifier(data.dexterityScore);
  const totalMod = dexMod + (data.bonusModifier ?? 0);
  const result = rollInitiative(totalMod);

  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    characterId: data.characterId,
    rollType: "initiative",
    dieType: "d20",
    dieCount: 1,
    rolls: [result.roll],
    rawTotal: result.roll,
    modifier: totalMod,
    total: result.total,
    description: data.description ?? "Initiative",
  });

  return {
    roll: result.roll,
    modifier: totalMod,
    total: result.total,
    rollLogEntryId,
  };
});

// ══════════════════════════════════════════════════════════════════
// 6. Death Saving Throw
// ══════════════════════════════════════════════════════════════════

interface DeathSaveData {
  sessionId: string;
  characterId: string;
  currentSuccesses: number;
  currentFailures: number;
}

export const deathSave = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as DeathSaveData;

  const result = rollDeathSave(data.currentSuccesses, data.currentFailures);

  const totalSuccesses = data.currentSuccesses + result.successes;
  const totalFailures = data.currentFailures + result.failures;

  let description = `Death Save: rolled ${result.roll}`;
  if (result.regainedHP) {
    description += " — Natural 20! Regains 1 HP!";
  } else if (result.roll === 1) {
    description += " — Natural 1! Two failures!";
  } else if (result.successes > 0) {
    description += ` — Success (${totalSuccesses}/3)`;
  } else {
    description += ` — Failure (${totalFailures}/3)`;
  }

  if (totalFailures >= 3) {
    description += " — CHARACTER DIES";
  } else if (result.stabilized) {
    description += " — Stabilized!";
  }

  const rollLogEntryId = await writeRollLog(data.sessionId, {
    playerId: uid,
    characterId: data.characterId,
    rollType: "death_save",
    dieType: "d20",
    dieCount: 1,
    rolls: [result.roll],
    rawTotal: result.roll,
    modifier: 0,
    total: result.roll,
    description,
  });

  await db.collection("characters").doc(data.characterId).update({
    "deathSaves.successes": totalSuccesses,
    "deathSaves.failures": totalFailures,
    ...(result.regainedHP
      ? {
          "hitPoints.current": 1,
          "deathSaves.successes": 0,
          "deathSaves.failures": 0,
        }
      : {}),
  });

  return {
    roll: result.roll,
    successes: result.successes,
    failures: result.failures,
    totalSuccesses,
    totalFailures,
    stabilized: result.stabilized,
    regainedHP: result.regainedHP,
    dead: totalFailures >= 3,
    rollLogEntryId,
  };
});

// ══════════════════════════════════════════════════════════════════
// 7. Batch Initiative (GM rolls for all combatants)
// ══════════════════════════════════════════════════════════════════

interface BatchInitiativeData {
  sessionId: string;
  combatants: {
    id: string;
    name: string;
    dexterityScore: number;
    bonusModifier?: number;
  }[];
}

export const batchInitiative = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data as BatchInitiativeData;

  const results = data.combatants.map((c) => {
    const dexMod = abilityModifier(c.dexterityScore);
    const totalMod = dexMod + (c.bonusModifier ?? 0);
    const result = rollInitiative(totalMod);
    return {
      id: c.id,
      name: c.name,
      roll: result.roll,
      modifier: totalMod,
      total: result.total,
    };
  });

  results.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.modifier - a.modifier;
  });

  const turnOrder = results.map((r) => r.id);

  await db.collection("sessions").doc(data.sessionId).update({
    turnOrder,
    currentTurnIndex: 0,
    round: 1,
  });

  for (const r of results) {
    await writeRollLog(data.sessionId, {
      playerId: uid,
      characterId: r.id,
      rollType: "initiative",
      dieType: "d20",
      dieCount: 1,
      rolls: [r.roll],
      rawTotal: r.roll,
      modifier: r.modifier,
      total: r.total,
      description: `${r.name} rolls initiative: ${r.total}`,
    });
  }

  return { turnOrder: results };
});