import { useCharacterStore } from "../../store/useCharacterStore";
import { ABILITY_NAMES, type AbilityName } from "@shared/types/dnd";
import { abilityModifier, proficiencyBonus } from "@shared/utils/dndMath";

// ── Helpers ──────────────────────────────────────────────────────

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const ALIGNMENTS = [
  "",
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// ── Component ────────────────────────────────────────────────────

export default function OverviewTab() {
  const { character, updateField, updateNested } = useCharacterStore();
  if (!character) return null;

  const profBonus = proficiencyBonus(character.level);

  return (
    <div className="cs-tab cs-tab--overview">
      {/* ── Identity ──────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Identity</h2>
        <div className="cs-grid cs-grid--3">
          <label className="cs-field">
            <span className="cs-field__label">Character Name</span>
            <input
              className="cs-field__input"
              value={character.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Race</span>
            <input
              className="cs-field__input"
              value={character.race}
              onChange={(e) => updateField("race", e.target.value)}
              placeholder="e.g. Half-Elf"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Class</span>
            <input
              className="cs-field__input"
              value={character.class}
              onChange={(e) => updateField("class", e.target.value)}
              placeholder="e.g. Wizard"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Subclass</span>
            <input
              className="cs-field__input"
              value={character.subclass ?? ""}
              onChange={(e) => updateField("subclass", e.target.value)}
              placeholder="e.g. School of Evocation"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Level</span>
            <input
              className="cs-field__input cs-field__input--narrow"
              type="number"
              min={1}
              max={20}
              value={character.level}
              onChange={(e) => {
                const lvl = Math.max(1, Math.min(20, Number(e.target.value)));
                updateField("level", lvl);
                updateField("proficiencyBonus", proficiencyBonus(lvl));
              }}
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">XP</span>
            <input
              className="cs-field__input cs-field__input--narrow"
              type="number"
              min={0}
              value={character.experiencePoints ?? 0}
              onChange={(e) =>
                updateField("experiencePoints", Math.max(0, Number(e.target.value)))
              }
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Background</span>
            <input
              className="cs-field__input"
              value={character.background}
              onChange={(e) => updateField("background", e.target.value)}
              placeholder="e.g. Sage"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Alignment</span>
            <select
              className="cs-field__input"
              value={character.alignment}
              onChange={(e) => updateField("alignment", e.target.value)}
            >
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a || "— Choose —"}
                </option>
              ))}
            </select>
          </label>
          <div className="cs-field">
            <span className="cs-field__label">Proficiency Bonus</span>
            <div className="cs-field__static cs-field__static--accent">
              {formatModifier(profBonus)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ability Scores ────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Ability Scores</h2>
        <div className="cs-abilities">
          {ABILITY_NAMES.map((ability) => {
            const score = character.abilityScores[ability];
            const mod = abilityModifier(score);
            return (
              <div key={ability} className="cs-ability">
                <span className="cs-ability__label">
                  {ABILITY_LABELS[ability]}
                </span>
                <input
                  className="cs-ability__score"
                  type="number"
                  min={1}
                  max={30}
                  value={score}
                  onChange={(e) =>
                    updateNested(
                      `abilityScores.${ability}`,
                      Math.max(1, Math.min(30, Number(e.target.value)))
                    )
                  }
                />
                <span className="cs-ability__mod">{formatModifier(mod)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Saving Throws ─────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Saving Throws</h2>
        <div className="cs-saves">
          {ABILITY_NAMES.map((ability) => {
            const proficient = character.savingThrows[ability] ?? false;
            const mod = abilityModifier(character.abilityScores[ability]);
            const total = mod + (proficient ? profBonus : 0);
            return (
              <label key={ability} className="cs-save">
                <input
                  type="checkbox"
                  className="cs-save__check"
                  checked={proficient}
                  onChange={(e) =>
                    updateNested(
                      `savingThrows.${ability}`,
                      e.target.checked
                    )
                  }
                />
                <span className="cs-save__mod">{formatModifier(total)}</span>
                <span className="cs-save__name">
                  {ability.charAt(0).toUpperCase() + ability.slice(1)}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ── Proficiencies ─────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Proficiencies</h2>
        <div className="cs-grid cs-grid--2">
          <label className="cs-field">
            <span className="cs-field__label">Languages</span>
            <input
              className="cs-field__input"
              value={character.languages.join(", ")}
              onChange={(e) =>
                updateField(
                  "languages",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Common, Elvish, …"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Tool Proficiencies</span>
            <input
              className="cs-field__input"
              value={character.toolProficiencies.join(", ")}
              onChange={(e) =>
                updateField(
                  "toolProficiencies",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Thieves' Tools, …"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Armor Proficiencies</span>
            <input
              className="cs-field__input"
              value={character.armorProficiencies.join(", ")}
              onChange={(e) =>
                updateField(
                  "armorProficiencies",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Light, Medium, …"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Weapon Proficiencies</span>
            <input
              className="cs-field__input"
              value={character.weaponProficiencies.join(", ")}
              onChange={(e) =>
                updateField(
                  "weaponProficiencies",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Simple, Martial, …"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
