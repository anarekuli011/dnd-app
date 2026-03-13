import { useState } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type {
  Spell,
  SpellSchool,
  AbilityName,
  DieType,
  DamageType,
} from "@shared/types/dnd";
import { ABILITY_NAMES } from "@shared/types/dnd";
import { spellSaveDC, spellAttackModifier } from "@shared/utils/dndMath";

// ── Helpers ──────────────────────────────────────────────────────

const SPELL_SCHOOLS: SpellSchool[] = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
];

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
  const { character, updateField, updateNested } = useCharacterStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Spell, "id">>(blankSpell());
  const [filterLevel, setFilterLevel] = useState<number | "all">("all");

  if (!character) return null;

  const dc = spellSaveDC(character);
  const attackMod = spellAttackModifier(character);

  // ── Spell slot management ────────────────────────────────────

  function setSlot(level: string, field: "max" | "used", value: number) {
    const current = character!.spellSlots[level] ?? { max: 0, used: 0 };
    updateNested(`spellSlots.${level}`, {
      ...current,
      [field]: Math.max(0, value),
    });
  }

  // ── Spell CRUD ───────────────────────────────────────────────

  function saveSpell() {
    const spells = [...character!.spells];
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
    updateField(
      "spells",
      character!.spells.filter((s) => s.id !== id)
    );
  }

  function togglePrepared(id: string) {
    const spells = character!.spells.map((s) =>
      s.id === id ? { ...s, prepared: !s.prepared } : s
    );
    updateField("spells", spells);
  }

  // ── Filtered & grouped spells ────────────────────────────────

  const filtered =
    filterLevel === "all"
      ? character.spells
      : character.spells.filter((s) => s.level === filterLevel);

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
      {/* ── Spellcasting Stats ────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Spellcasting</h2>
        <div className="cs-combat-stats">
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Ability</span>
            <select
              className="cs-stat-block__value cs-stat-block__value--select"
              value={character.spellcastingAbility ?? ""}
              onChange={(e) =>
                updateField(
                  "spellcastingAbility",
                  (e.target.value as AbilityName) || undefined
                )
              }
            >
              <option value="">None</option>
              {ABILITY_NAMES.map((a) => (
                <option key={a} value={a}>
                  {a.slice(0, 3).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Save DC</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {dc ?? "—"}
            </span>
          </div>
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Attack Mod</span>
            <span className="cs-stat-block__value cs-stat-block__value--readonly">
              {formatMod(attackMod)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Spell Slots ───────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Spell Slots</h2>
        <div className="cs-spell-slots">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
            const slot = character.spellSlots[String(level)] ?? {
              max: 0,
              used: 0,
            };
            return (
              <div key={level} className="cs-spell-slot">
                <span className="cs-spell-slot__level">Lv {level}</span>
                <div className="cs-spell-slot__pips">
                  {Array.from({ length: slot.max }, (_, i) => (
                    <button
                      key={i}
                      className={`cs-spell-slot__pip ${
                        i < slot.used ? "cs-spell-slot__pip--used" : ""
                      }`}
                      onClick={() =>
                        setSlot(
                          String(level),
                          "used",
                          i < slot.used ? i : i + 1
                        )
                      }
                    />
                  ))}
                </div>
                <input
                  className="cs-spell-slot__max"
                  type="number"
                  min={0}
                  max={9}
                  value={slot.max}
                  onChange={(e) =>
                    setSlot(String(level), "max", Number(e.target.value))
                  }
                  title="Max slots"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Spell List ────────────────────────────────────── */}
      <section className="cs-section">
        <div className="cs-section__header">
          <h2 className="cs-section__title">Spells</h2>
          <div className="cs-section__actions">
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
                setForm(blankSpell());
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
            {grouped[level].map((spell) => (
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
                  <span className="cs-spell-card__school">{spell.school}</span>
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
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="cs-empty">No spells yet. Add your first spell above.</p>
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
                  {SPELL_SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
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
