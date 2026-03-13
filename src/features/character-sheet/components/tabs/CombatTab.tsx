import { useEffect, useRef } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import { abilityModifier } from "@shared/utils/dndMath";
import {
  computeSpeed,
  computeInitiative,
  computeAC,
  computeMaxHP,
  computeHitDice,
  computeCarryCapacity,
  CLASS_MAP,
} from "@shared/utils/classProgression";

// ── Constants ────────────────────────────────────────────────────

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Component ────────────────────────────────────────────────────

export default function CombatTab() {
  const { character, updateField, updateNested } = useCharacterStore();

  // Track deps for auto-sync
  const prevRef = useRef({
    race: "",
    class: "",
    level: 0,
    dex: 0,
    con: 0,
    inventoryHash: "",
    totalWeight: 0,
  });

  // Auto-compute and sync combat stats to Firestore
  useEffect(() => {
    if (!character) return;

    const dexScore = character.abilityScores.dexterity;
    const conScore = character.abilityScores.constitution;
    const strScore = character.abilityScores.strength;

    // Simple hash of equipped items to detect inventory changes
    const equipped = character.inventory.filter((i) => i.equipped);
    const invHash = equipped
      .map((i) => `${i.id}:${i.acBonus ?? 0}:${i.name}`)
      .join("|");

    // Total weight for encumbrance
    const totalWeight = character.inventory.reduce(
      (sum, item) => sum + (item.weight ?? 0) * item.quantity,
      0
    );
    const maxCarry = computeCarryCapacity(strScore, character.race, character.class).total;

    const prev = prevRef.current;
    const changed =
      prev.race !== character.race ||
      prev.class !== character.class ||
      prev.level !== character.level ||
      prev.dex !== dexScore ||
      prev.con !== conScore ||
      prev.inventoryHash !== invHash ||
      prev.totalWeight !== totalWeight;

    if (!changed) return;

    prevRef.current = {
      race: character.race,
      class: character.class,
      level: character.level,
      dex: dexScore,
      con: conScore,
      inventoryHash: invHash,
      totalWeight,
    };

    // Compute new values
    const baseSpeed = computeSpeed(character.race);
    const isOverEncumbered = totalWeight > maxCarry;
    const speed = isOverEncumbered ? 1 : baseSpeed;
    const initiative = computeInitiative(dexScore);
    const acResult = computeAC(
      character.class,
      dexScore,
      equipped.map((i) => ({
        acBonus: i.acBonus,
        name: i.name,
        type: i.type,
      }))
    );
    const hpResult = computeMaxHP(character.class, character.level, conScore);
    const hdResult = computeHitDice(character.class, character.level);

    // Batch updates — only write fields that actually changed
    if (character.speed !== speed) updateField("speed", speed);
    if (character.initiative !== initiative)
      updateField("initiative", initiative);
    if (character.armorClass !== acResult.total)
      updateField("armorClass", acResult.total);

    if (character.hitPoints.max !== hpResult.maxHP) {
      updateNested("hitPoints.max", hpResult.maxHP);
      // When max HP changes, set current HP to new max (fresh character / level up)
      if (character.hitPoints.current === prevRef.current.level || character.hitPoints.current >= character.hitPoints.max) {
        updateNested("hitPoints.current", hpResult.maxHP);
      }
    }

    if (character.hitDice.dieType !== hdResult.dieType)
      updateNested("hitDice.dieType", hdResult.dieType);
    if (character.hitDice.total !== hdResult.total)
      updateNested("hitDice.total", hdResult.total);
  }, [
    character?.race,
    character?.class,
    character?.level,
    character?.abilityScores.dexterity,
    character?.abilityScores.constitution,
    character?.abilityScores.strength,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    character?.inventory
      .map((i) => `${i.id}:${i.acBonus ?? 0}:${i.equipped}:${i.weight ?? 0}:${i.quantity}`)
      .join("|"),
  ]);

  if (!character) return null;

  // ── Compute display values ─────────────────────────────────

  const dexScore = character.abilityScores.dexterity;
  const conScore = character.abilityScores.constitution;
  const conMod = abilityModifier(conScore);

  const equipped = character.inventory.filter((i) => i.equipped);
  const acBreakdown = computeAC(
    character.class,
    dexScore,
    equipped.map((i) => ({ acBonus: i.acBonus, name: i.name, type: i.type }))
  );
  const hpBreakdown = computeMaxHP(
    character.class,
    character.level,
    conScore
  );
  const hdInfo = computeHitDice(character.class, character.level);

  // Encumbrance check
  const strScore = character.abilityScores.strength;
  const totalWeight = character.inventory.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );
  const maxCarry = computeCarryCapacity(strScore, character.race, character.class).total;
  const isOverEncumbered = totalWeight > maxCarry;
  const baseSpeed = computeSpeed(character.race);

  const hp = character.hitPoints;
  const ds = character.deathSaves;
  const hpPercent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;

  // HP bar color based on percentage
  let hpBarClass = "";
  if (hpPercent <= 25) hpBarClass = "cs-hp__bar--critical";
  else if (hpPercent <= 50) hpBarClass = "cs-hp__bar--low";

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--combat">
      {/* ── Combat Stats (read-only) ──────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Combat Stats</h2>
        {(!character.race || !character.class) && (
          <p className="cs-section__hint">
            Select a race and class on the Overview tab to compute combat stats.
          </p>
        )}
        <div className="cs-combat-stats">
          {/* AC */}
          <div
            className="cs-stat-block cs-stat-block--readonly"
            title={`${acBreakdown.profileLabel}: ${acBreakdown.baseAC}\nDEX bonus: +${acBreakdown.dexBonus}${acBreakdown.armorBonus ? `\nArmor: +${acBreakdown.armorBonus}` : ""}${acBreakdown.shieldBonus ? `\nShield: +${acBreakdown.shieldBonus}` : ""}\nTotal: ${acBreakdown.total}`}
          >
            <span className="cs-stat-block__label">Armor Class</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {character.armorClass}
            </span>
            <span className="cs-stat-block__detail">
              {acBreakdown.profileLabel}
            </span>
          </div>

          {/* Initiative */}
          <div
            className="cs-stat-block cs-stat-block--readonly"
            title={`DEX modifier: ${formatMod(abilityModifier(dexScore))}`}
          >
            <span className="cs-stat-block__label">Initiative</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {formatMod(character.initiative)}
            </span>
            <span className="cs-stat-block__detail">DEX mod</span>
          </div>

          {/* Speed */}
          <div
            className={`cs-stat-block cs-stat-block--readonly ${
              isOverEncumbered ? "cs-stat-block--danger" : ""
            }`}
            title={
              isOverEncumbered
                ? `Over-encumbered! ${totalWeight.toFixed(1)} / ${maxCarry} kg — speed reduced to 1`
                : `Base speed from ${character.race || "race"}: ${baseSpeed}`
            }
          >
            <span className="cs-stat-block__label">Speed</span>
            <span
              className={`cs-stat-block__value cs-stat-block__value--readonly ${
                isOverEncumbered ? "cs-stat-block__value--danger" : ""
              }`}
            >
              {character.speed}
            </span>
            <span className="cs-stat-block__detail">
              {isOverEncumbered
                ? "Over-encumbered!"
                : `${character.race || "—"} base`}
            </span>
          </div>

          {/* Proficiency Bonus (for quick reference) */}
          <div className="cs-stat-block cs-stat-block--readonly">
            <span className="cs-stat-block__label">Prof. Bonus</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              +{character.proficiencyBonus}
            </span>
            <span className="cs-stat-block__detail">Level {character.level}</span>
          </div>
        </div>

        {/* AC breakdown detail */}
        <div className="cs-stat-breakdown">
          <span className="cs-stat-breakdown__item">
            Base {acBreakdown.baseAC}
          </span>
          <span className="cs-stat-breakdown__item">
            + DEX {formatMod(acBreakdown.dexBonus)}
          </span>
          {acBreakdown.armorBonus > 0 && (
            <span className="cs-stat-breakdown__item">
              + Armor {formatMod(acBreakdown.armorBonus)}
            </span>
          )}
          {acBreakdown.shieldBonus > 0 && (
            <span className="cs-stat-breakdown__item">
              + Shield {formatMod(acBreakdown.shieldBonus)}
            </span>
          )}
          <span className="cs-stat-breakdown__item cs-stat-breakdown__item--total">
            = {acBreakdown.total} AC
          </span>
        </div>
      </section>

      {/* ── Hit Points (read-only) ────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Hit Points</h2>
        <div className="cs-hp">
          <div className="cs-hp__bar-container">
            <div
              className={`cs-hp__bar ${hpBarClass}`}
              style={{
                width: `${Math.min(100, (hp.current / (hp.max || 1)) * 100)}%`,
              }}
            />
            <span className="cs-hp__bar-text">
              {hp.current} / {hp.max}
              {hp.temporary > 0 && ` (+${hp.temporary} temp)`}
            </span>
          </div>

          <div className="cs-hp-stats">
            <div className="cs-hp-stat">
              <span className="cs-hp-stat__label">Max HP</span>
              <span className="cs-hp-stat__value">{hp.max}</span>
            </div>
            <div className="cs-hp-stat">
              <span className="cs-hp-stat__label">Current HP</span>
              <span className="cs-hp-stat__value cs-hp-stat__value--current">
                {hp.current}
              </span>
            </div>
            <div className="cs-hp-stat">
              <span className="cs-hp-stat__label">Temp HP</span>
              <span className="cs-hp-stat__value">{hp.temporary}</span>
            </div>
          </div>

          {/* HP formula breakdown */}
          <div className="cs-stat-breakdown">
            <span className="cs-stat-breakdown__item">
              {hpBreakdown.hitDie} (max {hpBreakdown.hitDieMax})
            </span>
            {character.level > 1 && (
              <span className="cs-stat-breakdown__item">
                + {character.level - 1} × {hpBreakdown.avgRoll} (avg roll)
              </span>
            )}
            <span className="cs-stat-breakdown__item">
              + {character.level} × {formatMod(conMod)} (CON)
            </span>
            <span className="cs-stat-breakdown__item cs-stat-breakdown__item--total">
              = {hp.max} HP
            </span>
          </div>

          <p className="cs-section__hint">
            HP will be managed by the combat system when integrated. Max HP
            auto-scales with your class, level, and Constitution.
          </p>
        </div>
      </section>

      {/* ── Death Saves (read-only, session managed) ──── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Death Saves</h2>
        <div className="cs-death-saves">
          <div className="cs-death-saves__row">
            <span className="cs-death-saves__label">Successes</span>
            <div className="cs-death-saves__pips">
              {[1, 2, 3].map((i) => (
                <span
                  key={`s-${i}`}
                  className={`cs-death-saves__pip cs-death-saves__pip--success ${
                    ds.successes >= i ? "cs-death-saves__pip--filled" : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="cs-death-saves__row">
            <span className="cs-death-saves__label">Failures</span>
            <div className="cs-death-saves__pips">
              {[1, 2, 3].map((i) => (
                <span
                  key={`f-${i}`}
                  className={`cs-death-saves__pip cs-death-saves__pip--fail ${
                    ds.failures >= i ? "cs-death-saves__pip--filled" : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="cs-section__hint">
            Death saves are rolled and tracked during combat sessions.
          </p>
        </div>
      </section>

      {/* ── Hit Dice (auto-computed) ──────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Hit Dice</h2>
        <div className="cs-hit-dice">
          <div className="cs-hit-dice__info">
            <span className="cs-hit-dice__die">{hdInfo.dieType}</span>
            <span className="cs-hit-dice__count">
              {character.hitDice.total - character.hitDice.used} /{" "}
              {character.hitDice.total} remaining
            </span>
          </div>
          <div className="cs-hit-dice__pips">
            {Array.from({ length: character.hitDice.total }, (_, i) => (
              <span
                key={i}
                className={`cs-hit-dice__pip ${
                  i < character.hitDice.used ? "cs-hit-dice__pip--used" : ""
                }`}
              />
            ))}
          </div>
          <p className="cs-section__hint">
            {hdInfo.dieType} hit die from{" "}
            {character.class || "class"}. {character.hitDice.total} total
            (1 per level). Used dice recover on long rest.
          </p>
        </div>
      </section>

      {/* ── Conditions (read-only, session managed) ───── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Conditions</h2>
        <div className="cs-conditions">
          {character.conditions.length > 0 ? (
            character.conditions.map((c) => (
              <span key={c} className="cs-condition cs-condition--active">
                {c}
              </span>
            ))
          ) : (
            <span className="cs-conditions-empty">
              No active conditions. Conditions are applied during combat sessions.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}