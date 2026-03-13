import { useEffect, useRef } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type {
  Spell,
  SpellSchool,
} from "@shared/types/dnd";
import { spellSaveDC, spellAttackModifier } from "@shared/utils/dndMath";
import {
  computeSpellcastingAbility,
  computeSpellSlots,
  getStarterSpells,
  CLASS_MAP,
} from "@shared/utils/classProgression";

// ── Spell school data ────────────────────────────────────────────

interface SchoolInfo {
  key: SpellSchool;
  label: string;
  category: "arcane" | "martial";
}

const SPELL_SCHOOLS: SchoolInfo[] = [
  { key: "abjuration",    label: "Abjuration",    category: "arcane" },
  { key: "conjuration",   label: "Conjuration",   category: "arcane" },
  { key: "divination",    label: "Divination",    category: "arcane" },
  { key: "enchantment",   label: "Enchantment",   category: "arcane" },
  { key: "evocation",     label: "Evocation",     category: "arcane" },
  { key: "illusion",      label: "Illusion",      category: "arcane" },
  { key: "necromancy",    label: "Necromancy",    category: "arcane" },
  { key: "transmutation", label: "Transmutation", category: "arcane" },
  { key: "battlecraft",   label: "Battlecraft",   category: "martial" },
  { key: "shadowcraft",   label: "Shadowcraft",   category: "martial" },
  { key: "primal",        label: "Primal",        category: "martial" },
  { key: "divine",        label: "Divine",        category: "martial" },
];

const SCHOOL_MAP = new Map(SPELL_SCHOOLS.map((s) => [s.key, s]));

const ABILITY_LABELS: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const ABILITY_SHORT: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function formatMod(n: number | null): string {
  if (n === null) return "—";
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Component ────────────────────────────────────────────────────

export default function SpellsTab() {
  const { character, updateField } = useCharacterStore();

  // ── Auto-set spellcasting ability + spell slots + starter spells

  const prevRef = useRef({ class: "", race: "", level: 0 });

  useEffect(() => {
    if (!character) return;

    const prev = prevRef.current;
    const classChanged = prev.class !== character.class;
    const changed =
      classChanged ||
      prev.race !== character.race ||
      prev.level !== character.level;

    if (!changed) return;

    prevRef.current = {
      class: character.class,
      race: character.race,
      level: character.level,
    };

    // Auto-set spellcasting ability
    const ability = computeSpellcastingAbility(character.class);
    if (ability && ability !== character.spellcastingAbility) {
      updateField("spellcastingAbility", ability);
    }

    // Auto-compute spell slots
    const progression = computeSpellSlots(
      character.class,
      character.race,
      character.level
    );

    const newSlots: Record<string, { max: number; used: number }> = {};
    for (let i = 0; i < 9; i++) {
      const lvl = String(i + 1);
      const maxSlots = progression.slots[i];
      const currentUsed = character.spellSlots[lvl]?.used ?? 0;
      newSlots[lvl] = {
        max: maxSlots,
        used: Math.min(currentUsed, maxSlots),
      };
    }

    const slotsDiffer = Object.entries(newSlots).some(([lvl, val]) => {
      const current = character.spellSlots[lvl];
      return !current || current.max !== val.max;
    });

    if (slotsDiffer) {
      updateField("spellSlots", newSlots);
    }

    // Auto-populate starter spells when class changes
    if (classChanged && character.class) {
      const starters = getStarterSpells(character.class);
      // Only set if the character has no spells or only has starter spells
      const hasOnlyStarters = character.spells.every((s) =>
        s.id.startsWith("starter-")
      );
      if (character.spells.length === 0 || hasOnlyStarters) {
        updateField("spells", starters);
      }
    }
  }, [character?.class, character?.race, character?.level]);

  if (!character) return null;

  const dc = spellSaveDC(character);
  const attackMod = spellAttackModifier(character);
  const spellAbility = character.spellcastingAbility;
  const cls = CLASS_MAP.get(character.class);

  // ── Allowed schools ──────────────────────────────────────────

  const allowedSchools = cls?.allowedSchools ?? [];
  const allowedSet = new Set(allowedSchools);
  const availableSchools = SPELL_SCHOOLS.filter((s) => allowedSet.has(s.key));

  // ── Spell slot progression ───────────────────────────────────

  const slotProgression = computeSpellSlots(
    character.class,
    character.race,
    character.level
  );

  // ── Group spells by level ────────────────────────────────────

  const grouped = character.spells.reduce<Record<number, Spell[]>>(
    (acc, spell) => {
      (acc[spell.level] ??= []).push(spell);
      return acc;
    },
    {}
  );

  const sortedLevels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--spells">
      {/* ── Spellcasting Stats ─────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Spellcasting</h2>
        {!character.class && (
          <p className="cs-section__hint">
            Select a class on the Overview tab to set your spellcasting ability.
          </p>
        )}
        <div className="cs-combat-stats">
          <div
            className="cs-stat-block cs-stat-block--readonly"
            title={
              spellAbility
                ? `${ABILITY_LABELS[spellAbility]} — set by ${character.class}`
                : "No class selected"
            }
          >
            <span className="cs-stat-block__label">Ability</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {spellAbility ? ABILITY_SHORT[spellAbility] : "—"}
            </span>
            <span className="cs-stat-block__detail">
              {spellAbility ? ABILITY_LABELS[spellAbility] : "None"}
            </span>
          </div>
          <div className="cs-stat-block cs-stat-block--readonly">
            <span className="cs-stat-block__label">Save DC</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {dc ?? "—"}
            </span>
            <span className="cs-stat-block__detail">
              {dc !== null ? "8 + prof + mod" : ""}
            </span>
          </div>
          <div className="cs-stat-block cs-stat-block--readonly">
            <span className="cs-stat-block__label">Attack Mod</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {formatMod(attackMod)}
            </span>
            <span className="cs-stat-block__detail">
              {attackMod !== null ? "prof + mod" : ""}
            </span>
          </div>
        </div>

        {character.class && spellAbility && (
          <div className="cs-stat-breakdown">
            <span className="cs-stat-breakdown__item">
              {character.class} uses{" "}
              <strong>{ABILITY_LABELS[spellAbility]}</strong> for spellcasting
            </span>
          </div>
        )}

        {character.class && availableSchools.length > 0 && (
          <div className="cs-school-list">
            <span className="cs-school-list__label">Available schools:</span>
            <div className="cs-school-list__tags">
              {availableSchools.map((s) => (
                <span
                  key={s.key}
                  className={`cs-spell-card__school-badge cs-spell-card__school-badge--${s.category}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Spell Slots (auto-computed) ───────────────────── */}
      <section className="cs-section">
        <div className="cs-section__header">
          <h2 className="cs-section__title">Spell Slots</h2>
          {cls && (
            <span className="cs-spell-slots__caster-label">
              {slotProgression.casterLabel}
              {slotProgression.maxSpellLevel > 0 &&
                ` · Up to Level ${slotProgression.maxSpellLevel}`}
            </span>
          )}
        </div>

        {slotProgression.maxSpellLevel === 0 && character.class && (
          <p className="cs-section__hint">
            No spell slots yet at this level.{" "}
            {cls?.casterType === "third"
              ? "Third casters gain slots at level 3."
              : cls?.casterType === "half"
              ? "Half casters gain slots at level 2."
              : "Gain slots as you level up."}
          </p>
        )}

        <div className="cs-spell-slots">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((spellLvl) => {
            const bd = slotProgression.breakdown[spellLvl - 1];
            if (bd.total === 0) return null;

            const slot = character.spellSlots[String(spellLvl)] ?? {
              max: bd.total,
              used: 0,
            };

            return (
              <div
                key={spellLvl}
                className="cs-spell-slot"
                title={
                  bd.raceBonus > 0
                    ? `Base: ${bd.base} + Race bonus: ${bd.raceBonus}`
                    : `Base: ${bd.base}`
                }
              >
                <span className="cs-spell-slot__level">Lv {spellLvl}</span>
                <div className="cs-spell-slot__pips">
                  {Array.from({ length: slot.max }, (_, i) => (
                    <span
                      key={i}
                      className={`cs-spell-slot__pip ${
                        i < slot.used ? "cs-spell-slot__pip--used" : ""
                      }`}
                    />
                  ))}
                </div>
                <span className="cs-spell-slot__count">
                  {slot.max - slot.used}/{slot.max}
                </span>
                {bd.raceBonus > 0 && (
                  <span className="cs-spell-slot__race-bonus">
                    +{bd.raceBonus} race
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="cs-section__hint">
          Spell slots are set by your class, race, and level. Usage is
          tracked by the combat system during sessions.
        </p>
      </section>

      {/* ── Known Spells (read-only) ──────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">
          Known Spells ({character.spells.length})
        </h2>

        {sortedLevels.map((level) => (
          <div key={level} className="cs-spell-group">
            <h3 className="cs-spell-group__title">
              {level === 0 ? "Cantrips" : `Level ${level}`}
            </h3>
            {grouped[level].map((spell) => {
              const schoolInfo = SCHOOL_MAP.get(spell.school);
              const isStarter = spell.id.startsWith("starter-");
              return (
                <div key={spell.id} className="cs-spell-card">
                  <div className="cs-spell-card__header">
                    <span className="cs-spell-card__name">{spell.name}</span>
                    <span
                      className={`cs-spell-card__school-badge cs-spell-card__school-badge--${
                        schoolInfo?.category ?? "arcane"
                      }`}
                    >
                      {schoolInfo?.label ?? spell.school}
                    </span>
                    {isStarter && (
                      <span className="cs-spell-card__starter-badge">
                        Starter
                      </span>
                    )}
                  </div>
                  <div className="cs-spell-card__meta">
                    {spell.castingTime} · {spell.range} · {spell.components} ·{" "}
                    {spell.duration}
                  </div>
                  {spell.description && (
                    <p className="cs-spell-card__desc">{spell.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {character.spells.length === 0 && !character.class && (
          <p className="cs-empty">
            Select a class on the Overview tab to receive your starter spells.
          </p>
        )}

        {character.spells.length === 0 && character.class && (
          <p className="cs-empty">
            No starter spells for this class. You'll learn spells during
            sessions.
          </p>
        )}

        {character.spells.length > 0 && (
          <p className="cs-section__hint">
            Additional spells are learned during sessions — through levelling
            up, finding scrolls, or training with mentors.
          </p>
        )}
      </section>
    </div>
  );
}