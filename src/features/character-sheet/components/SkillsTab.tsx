import { useCharacterStore } from "../../store/useCharacterStore";
import {
  SKILL_NAMES,
  SKILL_ABILITY_MAP,
  type SkillName,
  type AbilityName,
} from "@shared/types/dnd";
import { abilityModifier } from "@shared/utils/dndMath";

// ── Helpers ──────────────────────────────────────────────────────

const ABILITY_SHORT: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function formatSkillName(skill: SkillName): string {
  // Convert camelCase to Title Case with spaces
  return skill
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());
}

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Component ────────────────────────────────────────────────────

export default function SkillsTab() {
  const { character, updateNested } = useCharacterStore();
  if (!character) return null;

  const profBonus = character.proficiencyBonus;

  // ── Sort skills by ability ───────────────────────────────────

  const sorted = [...SKILL_NAMES].sort((a, b) => {
    const aAbility = SKILL_ABILITY_MAP[a];
    const bAbility = SKILL_ABILITY_MAP[b];
    if (aAbility !== bAbility) return aAbility.localeCompare(bAbility);
    return a.localeCompare(b);
  });

  return (
    <div className="cs-tab cs-tab--skills">
      <section className="cs-section">
        <h2 className="cs-section__title">Skills</h2>
        <p className="cs-section__hint">
          Click the circle to toggle proficiency. Click again for expertise (double proficiency).
        </p>

        <div className="cs-skills">
          {sorted.map((skill) => {
            const ability = SKILL_ABILITY_MAP[skill] as AbilityName;
            const abilityScore = character.abilityScores[ability];
            const baseMod = abilityModifier(abilityScore);
            const prof = character.skills[skill];
            const isProficient = prof?.proficient ?? false;
            const hasExpertise = prof?.expertise ?? false;

            let bonus = baseMod;
            if (hasExpertise) bonus += profBonus * 2;
            else if (isProficient) bonus += profBonus;

            function cycleProf() {
              if (!isProficient && !hasExpertise) {
                // → proficient
                updateNested(`skills.${skill}`, {
                  proficient: true,
                  expertise: false,
                });
              } else if (isProficient && !hasExpertise) {
                // → expertise
                updateNested(`skills.${skill}`, {
                  proficient: true,
                  expertise: true,
                });
              } else {
                // → none
                updateNested(`skills.${skill}`, {
                  proficient: false,
                  expertise: false,
                });
              }
            }

            return (
              <div key={skill} className="cs-skill">
                <button
                  className={`cs-skill__prof ${
                    hasExpertise
                      ? "cs-skill__prof--expert"
                      : isProficient
                      ? "cs-skill__prof--yes"
                      : ""
                  }`}
                  onClick={cycleProf}
                  title={
                    hasExpertise
                      ? "Expertise — click to remove"
                      : isProficient
                      ? "Proficient — click for expertise"
                      : "Not proficient — click to add"
                  }
                >
                  {hasExpertise ? "★" : isProficient ? "●" : "○"}
                </button>
                <span className="cs-skill__mod">{formatMod(bonus)}</span>
                <span className="cs-skill__name">{formatSkillName(skill)}</span>
                <span className="cs-skill__ability">
                  {ABILITY_SHORT[ability]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Passive Perception ────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Passive Scores</h2>
        <div className="cs-passives">
          {(["perception", "investigation", "insight"] as SkillName[]).map(
            (skill) => {
              const ability = SKILL_ABILITY_MAP[skill] as AbilityName;
              const baseMod = abilityModifier(
                character.abilityScores[ability]
              );
              const prof = character.skills[skill];
              let bonus = baseMod;
              if (prof?.expertise) bonus += profBonus * 2;
              else if (prof?.proficient) bonus += profBonus;

              return (
                <div key={skill} className="cs-passive">
                  <span className="cs-passive__value">{10 + bonus}</span>
                  <span className="cs-passive__label">
                    Passive {formatSkillName(skill)}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
