import { useState, useEffect, useRef } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type {
  Spell,
  SpellSchool,
} from "@shared/types/dnd";
import { spellSaveDC, spellAttackModifier } from "@shared/utils/dndMath";
import { computeSpellcastingAbility, CLASS_MAP, computeSpellSlots } from "@shared/utils/classProgression";

// ── Spell school data ────────────────────────────────────────────

interface SchoolInfo {
  key: SpellSchool;
  label: string;
  category: "arcane" | "martial";
}

const SPELL_SCHOOLS: SchoolInfo[] = [
  // Arcane
  { key: "abjuration",    label: "Abjuration",    category: "arcane" },
  { key: "conjuration",   label: "Conjuration",   category: "arcane" },
  { key: "divination",    label: "Divination",    category: "arcane" },
  { key: "enchantment",   label: "Enchantment",   category: "arcane" },
  { key: "evocation",     label: "Evocation",     category: "arcane" },
  { key: "illusion",      label: "Illusion",      category: "arcane" },
  { key: "necromancy",    label: "Necromancy",    category: "arcane" },
  { key: "transmutation", label: "Transmutation", category: "arcane" },
  // Martial
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

// ── Helpers ──────────────────────────────────────────────────────

function blankSpell(): Omit<Spell, "id"> {
  return {
    name: "",
    level: 0,
    school: "evocation",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "Instantaneous",
    description: "",
    prepared: true,
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatMod(n: number | null): string {
  if (n === null) return "—";
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Component ────────────────────────────────────────────────────

export default function SpellsTab() {
  const { character, updateField } = useCharacterStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Spell, "id">>(blankSpell());
  const [filterLevel, setFilterLevel] = useState<number | "all">("all");
  const [filterSchoolCategory, setFilterSchoolCategory] = useState<
    "all" | "arcane" | "martial"
  >("all");

  // ── Auto-set spellcasting ability + spell slots from class ───

  const prevRef = useRef({ class: "", race: "", level: 0 });

  useEffect(() => {
    if (!character) return;

    const prev = prevRef.current;
    const changed =
      prev.class !== character.class ||
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
      // Keep used count, but clamp to new max
      newSlots[lvl] = {
        max: maxSlots,
        used: Math.min(currentUsed, maxSlots),
      };
    }

    // Only write if different
    const differs = Object.entries(newSlots).some(([lvl, val]) => {
      const current = character.spellSlots[lvl];
      return !current || current.max !== val.max;
    });

    if (differs) {
      updateField("spellSlots", newSlots);
    }
  }, [character?.class, character?.race, character?.level]);

  if (!character) return null;

  const dc = spellSaveDC(character);
  const attackMod = spellAttackModifier(character);
  const spellAbility = character.spellcastingAbility;
  const cls = CLASS_MAP.get(character.class);

  // ── Allowed schools for this class ───────────────────────────

  const allowedSchools = cls?.allowedSchools ?? [];
  const allowedSet = new Set(allowedSchools);

  const availableSchools = SPELL_SCHOOLS.filter((s) =>
    allowedSet.has(s.key)
  );
  const hasArcane = availableSchools.some((s) => s.category === "arcane");
  const hasMartial = availableSchools.some((s) => s.category === "martial");

  // ── Spell slot progression for display ───────────────────────

  const slotProgression = computeSpellSlots(
    character.class,
    character.race,
    character.level
  );

  // ── Spell CRUD ───────────────────────────────────────────────

  function saveSpell() {
    if (!character) return;
    const spells = [...character.spells];
    if (editingId) {
      const idx = spells.findIndex((s) => s.id === editingId);
      if (idx !== -1) spells[idx] = { ...form, id: editingId };
    } else {
      spells.push({ ...form, id: generateId() });
    }
    updateField("spells", spells);
    setShowForm(false);
    setEditingId(null);
    setForm(blankSpell());
  }

  function editSpell(spell: Spell) {
    const { id, ...rest } = spell;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  }

  function removeSpell(id: string) {
    if (!character) return;
    updateField(
      "spells",
      character.spells.filter((s) => s.id !== id)
    );
  }

  function togglePrepared(id: string) {
    if (!character) return;
    const spells = character.spells.map((s) =>
      s.id === id ? { ...s, prepared: !s.prepared } : s
    );
    updateField("spells", spells);
  }

  // ── Filtered & grouped spells ────────────────────────────────

  let filtered = character.spells;

  if (filterLevel !== "all") {
    filtered = filtered.filter((s) => s.level === filterLevel);
  }

  if (filterSchoolCategory !== "all") {
    filtered = filtered.filter((s) => {
      const info = SCHOOL_MAP.get(s.school);
      return info?.category === filterSchoolCategory;
    });
  }

  const grouped = filtered.reduce<Record<number, Spell[]>>((acc, spell) => {
    (acc[spell.level] ??= []).push(spell);
    return acc;
  }, {});

  const sortedLevels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--spells">
      {/* ── Spellcasting Stats (auto-set from class) ──────── */}
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
              {spellAbility
                ? `${ABILITY_LABELS[spellAbility]}`
                : "None"}
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

        {/* Source label */}
        {character.class && spellAbility && (
          <div className="cs-stat-breakdown">
            <span className="cs-stat-breakdown__item">
              {character.class} uses{" "}
              <strong>{ABILITY_LABELS[spellAbility]}</strong> for spellcasting
            </span>
          </div>
        )}

        {/* Available schools */}
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

      {/* ── Spell Slots (auto-computed, read-only) ─────── */}
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
            No spell slots yet at this level. {cls?.casterType === "third"
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
          tracked automatically by the combat system when integrated.
        </p>
      </section>

      {/* ── Spell List ────────────────────────────────────── */}
      <section className="cs-section">
        <div className="cs-section__header">
          <h2 className="cs-section__title">Spells</h2>
          <div className="cs-section__actions">
            <select
              className="cs-field__input"
              value={filterSchoolCategory}
              onChange={(e) =>
                setFilterSchoolCategory(
                  e.target.value as "all" | "arcane" | "martial"
                )
              }
            >
              <option value="all">All Schools</option>
              {hasArcane && <option value="arcane">Arcane</option>}
              {hasMartial && <option value="martial">Martial</option>}
            </select>
            <select
              className="cs-field__input"
              value={filterLevel === "all" ? "all" : String(filterLevel)}
              onChange={(e) =>
                setFilterLevel(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
            >
              <option value="all">All Levels</option>
              <option value="0">Cantrips</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                <option key={l} value={String(l)}>
                  Level {l}
                </option>
              ))}
            </select>
            <button
              className="btn btn--primary"
              onClick={() => {
                setForm({
                  ...blankSpell(),
                  school: availableSchools[0]?.key ?? "evocation",
                });
                setEditingId(null);
                setShowForm(true);
              }}
            >
              + Add Spell
            </button>
          </div>
        </div>

        {sortedLevels.map((level) => (
          <div key={level} className="cs-spell-group">
            <h3 className="cs-spell-group__title">
              {level === 0 ? "Cantrips" : `Level ${level}`}
            </h3>
            {grouped[level].map((spell) => {
              const schoolInfo = SCHOOL_MAP.get(spell.school);
              return (
                <div key={spell.id} className="cs-spell-card">
                  <div className="cs-spell-card__header">
                    {spell.level > 0 && (
                      <button
                        className={`cs-spell-card__prep ${
                          spell.prepared ? "cs-spell-card__prep--yes" : ""
                        }`}
                        onClick={() => togglePrepared(spell.id)}
                        title={spell.prepared ? "Prepared" : "Not prepared"}
                      >
                        {spell.prepared ? "◆" : "◇"}
                      </button>
                    )}
                    <span className="cs-spell-card__name">{spell.name}</span>
                    <span
                      className={`cs-spell-card__school-badge cs-spell-card__school-badge--${
                        schoolInfo?.category ?? "arcane"
                      }`}
                    >
                      {schoolInfo?.label ?? spell.school}
                    </span>
                    <div className="cs-spell-card__actions">
                      <button
                        className="cs-spell-card__btn"
                        onClick={() => editSpell(spell)}
                      >
                        Edit
                      </button>
                      <button
                        className="cs-spell-card__btn cs-spell-card__btn--danger"
                        onClick={() => removeSpell(spell.id)}
                      >
                        ×
                      </button>
                    </div>
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

        {filtered.length === 0 && (
          <p className="cs-empty">
            No spells yet. Add your first spell above.
          </p>
        )}
      </section>

      {/* ── Add / Edit Spell Form ─────────────────────────── */}
      {showForm && (
        <div className="cs-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cs-modal__title">
              {editingId ? "Edit Spell" : "Add Spell"}
            </h3>
            <div className="cs-grid cs-grid--2">
              <label className="cs-field">
                <span className="cs-field__label">Name</span>
                <input
                  className="cs-field__input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Level</span>
                <select
                  className="cs-field__input"
                  value={form.level}
                  onChange={(e) =>
                    setForm({ ...form, level: Number(e.target.value) })
                  }
                >
                  <option value={0}>Cantrip</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cs-field">
                <span className="cs-field__label">School</span>
                <select
                  className="cs-field__input"
                  value={form.school}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      school: e.target.value as SpellSchool,
                    })
                  }
                >
                  {availableSchools.filter((s) => s.category === "arcane")
                    .length > 0 && (
                    <optgroup label="Arcane Schools">
                      {availableSchools
                        .filter((s) => s.category === "arcane")
                        .map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {availableSchools.filter((s) => s.category === "martial")
                    .length > 0 && (
                    <optgroup label="Martial Schools">
                      {availableSchools
                        .filter((s) => s.category === "martial")
                        .map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {availableSchools.length === 0 && (
                    <option value="">Select a class first</option>
                  )}
                </select>
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Casting Time</span>
                <input
                  className="cs-field__input"
                  value={form.castingTime}
                  onChange={(e) =>
                    setForm({ ...form, castingTime: e.target.value })
                  }
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Range</span>
                <input
                  className="cs-field__input"
                  value={form.range}
                  onChange={(e) =>
                    setForm({ ...form, range: e.target.value })
                  }
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Components</span>
                <input
                  className="cs-field__input"
                  value={form.components}
                  onChange={(e) =>
                    setForm({ ...form, components: e.target.value })
                  }
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Duration</span>
                <input
                  className="cs-field__input"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="cs-field" style={{ marginTop: "0.75rem" }}>
              <span className="cs-field__label">Description</span>
              <textarea
                className="cs-field__input cs-field__textarea"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="cs-modal__footer">
              <button
                className="btn btn--outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={saveSpell}
                disabled={!form.name.trim()}
              >
                {editingId ? "Save Changes" : "Add Spell"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}