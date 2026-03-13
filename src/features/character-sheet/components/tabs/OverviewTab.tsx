import { useEffect, useRef } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import { ABILITY_NAMES, type AbilityName } from "@shared/types/dnd";
import { abilityModifier, proficiencyBonus } from "@shared/utils/dndMath";
import {
  RACES,
  RACE_MAP,
  CLASSES,
  CLASS_MAP,
  computeAbilityScores,
  abilityScoreBreakdown,
  computeProficiencies,
  getUnresolvedChoices,
  parseChoiceMarker,
  PROFICIENCY_CHOICES,
} from "@shared/utils/classProgression";

// ── Helpers ──────────────────────────────────────────────────────

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const GROWTH_LABELS: Record<string, string> = {
  primary: "★ Primary",
  secondary: "◆ Secondary",
  tertiary: "● Tertiary",
};

const GROWTH_COLORS: Record<string, string> = {
  primary: "cs-ability--primary",
  secondary: "cs-ability--secondary",
  tertiary: "cs-ability--tertiary",
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

  // Track previous race/class/level to detect changes
  const prevRef = useRef({ race: "", class: "", level: 0 });

  // Auto-compute ability scores when race, class, or level changes
  useEffect(() => {
    if (!character) return;

    const prev = prevRef.current;
    const changed =
      prev.race !== character.race ||
      prev.class !== character.class ||
      prev.level !== character.level;

    if (changed) {
      prevRef.current = {
        race: character.race,
        class: character.class,
        level: character.level,
      };

      const newScores = computeAbilityScores(
        character.race,
        character.class,
        character.level
      );

      // Only write if scores actually differ (avoids infinite loops)
      const current = character.abilityScores;
      const differs = ABILITY_NAMES.some(
        (a) => current[a] !== newScores[a]
      );

      if (differs) {
        updateField("abilityScores", newScores);
      }

      // Compute proficiencies from race + class, resolving any player choices
      const choices =
        (character as unknown as Record<string, unknown>).proficiencyChoices as
          | Record<string, string>
          | undefined ?? {};
      const profs = computeProficiencies(
        character.race,
        character.class,
        choices
      );

      // Only sync resolved values (no CHOOSE: markers) to Firestore
      const resolved = (arr: string[]) =>
        arr.filter((s) => !s.startsWith("CHOOSE:"));

      const langsDiffer =
        JSON.stringify(character.languages) !==
        JSON.stringify(resolved(profs.languages));
      const armorDiffer =
        JSON.stringify(character.armorProficiencies) !==
        JSON.stringify(resolved(profs.armorProficiencies));
      const weaponDiffer =
        JSON.stringify(character.weaponProficiencies) !==
        JSON.stringify(resolved(profs.weaponProficiencies));
      const toolDiffer =
        JSON.stringify(character.toolProficiencies) !==
        JSON.stringify(resolved(profs.toolProficiencies));

      if (langsDiffer) updateField("languages", resolved(profs.languages));
      if (armorDiffer)
        updateField("armorProficiencies", resolved(profs.armorProficiencies));
      if (weaponDiffer)
        updateField("weaponProficiencies", resolved(profs.weaponProficiencies));
      if (toolDiffer)
        updateField("toolProficiencies", resolved(profs.toolProficiencies));
    }
  }, [character?.race, character?.class, character?.level]);

  if (!character) return null;

  const profBonus = proficiencyBonus(character.level);
  const breakdown = abilityScoreBreakdown(
    character.race,
    character.class,
    character.level
  );

  // ── Proficiency choices ──────────────────────────────────────

  const choices =
    ((character as unknown as Record<string, unknown>).proficiencyChoices as
      | Record<string, string>
      | undefined) ?? {};

  const unresolvedChoices = getUnresolvedChoices(
    character.race,
    character.class
  );

  function handleChoice(marker: string, value: string) {
    if (!character) return;
    const updated = { ...choices, [marker]: value };
    updateNested("proficiencyChoices", updated);

    // Immediately recompute and sync proficiencies
    const profs = computeProficiencies(
      character.race,
      character.class,
      updated
    );
    const resolved = (arr: string[]) =>
      arr.filter((s) => !s.startsWith("CHOOSE:"));

    updateField("languages", resolved(profs.languages));
    updateField("armorProficiencies", resolved(profs.armorProficiencies));
    updateField("weaponProficiencies", resolved(profs.weaponProficiencies));
    updateField("toolProficiencies", resolved(profs.toolProficiencies));
  }

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
            <select
              className="cs-field__input"
              value={character.race}
              onChange={(e) => updateField("race", e.target.value)}
            >
              <option value="">— Choose Race —</option>
              {RACES.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Class</span>
            <select
              className="cs-field__input"
              value={character.class}
              onChange={(e) => updateField("class", e.target.value)}
            >
              <option value="">— Choose Class —</option>
              {CLASSES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
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
                updateField(
                  "experiencePoints",
                  Math.max(0, Number(e.target.value))
                )
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

        {/* ── Selected race description ───────────────────── */}
        {character.race && RACE_MAP.has(character.race) && (
          <div className="cs-class-desc cs-class-desc--race">
            <span className="cs-class-desc__name">{character.race}</span>
            <span className="cs-class-desc__text">
              {RACE_MAP.get(character.race)!.description}
            </span>
          </div>
        )}

        {/* ── Selected class description ──────────────────── */}
        {character.class && CLASS_MAP.has(character.class) && (
          <div className="cs-class-desc">
            <span className="cs-class-desc__name">{character.class}</span>
            <span className="cs-class-desc__text">
              {CLASS_MAP.get(character.class)!.description}
            </span>
          </div>
        )}
      </section>

      {/* ── Ability Scores (auto-computed, read-only) ──────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Ability Scores</h2>
        {(!character.race || !character.class) && (
          <p className="cs-section__hint">
            Select a race and class above to compute your ability scores.
          </p>
        )}
        <div className="cs-abilities">
          {ABILITY_NAMES.map((ability) => {
            const bd = breakdown[ability];
            const score = character.abilityScores[ability];
            const mod = abilityModifier(score);
            const growthClass = bd.growthLabel
              ? GROWTH_COLORS[bd.growthLabel]
              : "";

            return (
              <div
                key={ability}
                className={`cs-ability cs-ability--readonly ${growthClass}`}
                title={buildTooltip(ability, bd)}
              >
                {bd.growthLabel && (
                  <span className="cs-ability__badge">
                    {GROWTH_LABELS[bd.growthLabel]}
                  </span>
                )}
                <span className="cs-ability__label">
                  {ABILITY_LABELS[ability]}
                </span>
                <span className="cs-ability__score cs-ability__score--locked">
                  {score}
                </span>
                <span className="cs-ability__mod">{formatModifier(mod)}</span>
                <span className="cs-ability__breakdown">
                  {bd.raceBonus > 0 && (
                    <span className="cs-ability__tag cs-ability__tag--race">
                      +{bd.raceBonus} race
                    </span>
                  )}
                  {bd.classGrowth > 0 && (
                    <span className="cs-ability__tag cs-ability__tag--class">
                      +{bd.classGrowth} class
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Growth legend ────────────────────────────────── */}
        {character.class && CLASS_MAP.has(character.class) && (
          <div className="cs-growth-legend">
            <span className="cs-growth-legend__item cs-growth-legend__item--primary">
              ★ Primary — +1 every 2 levels
            </span>
            <span className="cs-growth-legend__item cs-growth-legend__item--secondary">
              ◆ Secondary — +1 every 3 levels
            </span>
            <span className="cs-growth-legend__item cs-growth-legend__item--tertiary">
              ● Tertiary — +1 every 5 levels
            </span>
          </div>
        )}
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

      {/* ── Proficiency Choices (dropdowns) ────────────── */}
      {unresolvedChoices.length > 0 && (
        <section className="cs-section">
          <h2 className="cs-section__title">Choose Your Proficiencies</h2>
          <div className="cs-grid cs-grid--2">
            {unresolvedChoices.map((marker) => {
              const category = parseChoiceMarker(marker)!;
              const options = PROFICIENCY_CHOICES[category] ?? [];
              const currentValue = choices[marker] ?? "";
              const label =
                category === "language"
                  ? "Bonus Language"
                  : category === "weapon"
                  ? "Weapon of Choice"
                  : `Choose ${category}`;

              return (
                <label key={marker} className="cs-field">
                  <span className="cs-field__label">{label}</span>
                  <select
                    className="cs-field__input"
                    value={currentValue}
                    onChange={(e) => handleChoice(marker, e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Proficiencies (auto-computed, read-only) ──── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Proficiencies</h2>
        {(!character.race && !character.class) && (
          <p className="cs-section__hint">
            Select a race and class above to see your proficiencies.
          </p>
        )}
        <div className="cs-grid cs-grid--2">
          <div className="cs-field">
            <span className="cs-field__label">Languages</span>
            <div className="cs-prof-list">
              {character.languages.length > 0 ? (
                character.languages.map((l) => (
                  <span key={l} className="cs-prof-tag cs-prof-tag--race">
                    {l}
                  </span>
                ))
              ) : (
                <span className="cs-prof-empty">None</span>
              )}
            </div>
            {character.race && (
              <span className="cs-prof-source">From: {character.race}</span>
            )}
          </div>
          <div className="cs-field">
            <span className="cs-field__label">Tool Proficiencies</span>
            <div className="cs-prof-list">
              {character.toolProficiencies.length > 0 ? (
                character.toolProficiencies.map((t) => (
                  <span key={t} className="cs-prof-tag cs-prof-tag--class">
                    {t}
                  </span>
                ))
              ) : (
                <span className="cs-prof-empty">None</span>
              )}
            </div>
            {character.class && (
              <span className="cs-prof-source">From: {character.class}</span>
            )}
          </div>
          <div className="cs-field">
            <span className="cs-field__label">Armor Proficiencies</span>
            <div className="cs-prof-list">
              {character.armorProficiencies.length > 0 ? (
                character.armorProficiencies.map((a) => (
                  <span key={a} className="cs-prof-tag cs-prof-tag--class">
                    {a}
                  </span>
                ))
              ) : (
                <span className="cs-prof-empty">None</span>
              )}
            </div>
            {character.class && (
              <span className="cs-prof-source">From: {character.class}</span>
            )}
          </div>
          <div className="cs-field">
            <span className="cs-field__label">Weapon Proficiencies</span>
            <div className="cs-prof-list">
              {character.weaponProficiencies.length > 0 ? (
                character.weaponProficiencies.map((w) => (
                  <span key={w} className="cs-prof-tag cs-prof-tag--class">
                    {w}
                  </span>
                ))
              ) : (
                <span className="cs-prof-empty">None</span>
              )}
            </div>
            {character.class && (
              <span className="cs-prof-source">From: {character.class}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tooltip builder ──────────────────────────────────────────────

function buildTooltip(
  ability: AbilityName,
  bd: { base: number; raceBonus: number; classGrowth: number; total: number }
): string {
  const parts = [`Base: ${bd.base}`];
  if (bd.raceBonus) parts.push(`Race: +${bd.raceBonus}`);
  if (bd.classGrowth) parts.push(`Class: +${bd.classGrowth}`);
  parts.push(`Total: ${bd.total}`);
  return `${ability.charAt(0).toUpperCase() + ability.slice(1)}\n${parts.join("\n")}`;
}