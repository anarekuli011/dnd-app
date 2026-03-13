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
  return skill
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());
}

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Point cost helpers ───────────────────────────────────────────

/** Proficient = 1 point, Expertise = 2 points total */
function pointCost(proficient: boolean, expertise: boolean): number {
  if (expertise) return 2;
  if (proficient) return 1;
  return 0;
}

// ── Component ────────────────────────────────────────────────────

export default function SkillsTab() {
  const { character, updateNested } = useCharacterStore();
  if (!character) return null;

  const profBonus = character.proficiencyBonus;

  // ── Point budget ─────────────────────────────────────────────

  const totalPoints = character.level; // 1 per level

  const usedPoints = SKILL_NAMES.reduce((sum, skill) => {
    const prof = character.skills[skill];
    return sum + pointCost(prof?.proficient ?? false, prof?.expertise ?? false);
  }, 0);

  const remainingPoints = totalPoints - usedPoints;

  // ── Sort skills by ability ───────────────────────────────────

  const sorted = [...SKILL_NAMES].sort((a, b) => {
    const aAbility = SKILL_ABILITY_MAP[a];
    const bAbility = SKILL_ABILITY_MAP[b];
    if (aAbility !== bAbility) return aAbility.localeCompare(bAbility);
    return a.localeCompare(b);
  });

  // ── Group by ability for section headers ─────────────────────

  let lastAbility = "";

  return (
    <div className="cs-tab cs-tab--skills">
      {/* ── Proficiency Points ─────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Proficiency Points</h2>
        <div className="cs-prof-points">
          <div className="cs-prof-points__bar-container">
            <div
              className="cs-prof-points__bar"
              style={{
                width: `${totalPoints > 0 ? (usedPoints / totalPoints) * 100 : 0}%`,
              }}
            />
            <span className="cs-prof-points__text">
              {usedPoints} / {totalPoints} used
            </span>
          </div>
          <div className="cs-prof-points__info">
            <span className="cs-prof-points__remaining">
              {remainingPoints} point{remainingPoints !== 1 ? "s" : ""} remaining
            </span>
            <span className="cs-prof-points__hint">
              ● Proficient = 1 pt · ★ Expertise = 2 pts
            </span>
          </div>
        </div>
      </section>

      {/* ── Skills ─────────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Skills</h2>
        <p className="cs-section__hint">
          Click the circle to assign proficiency points. Proficient costs 1
          point, expertise costs 2. Click again to remove.
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

            // Show ability group header
            let showHeader = false;
            if (ability !== lastAbility) {
              lastAbility = ability;
              showHeader = true;
            }

            function cycleProf() {
              if (!isProficient && !hasExpertise) {
                // none → proficient (costs 1)
                if (remainingPoints >= 1) {
                  updateNested(`skills.${skill}`, {
                    proficient: true,
                    expertise: false,
                  });
                }
              } else if (isProficient && !hasExpertise) {
                // proficient → expertise (costs 1 more, 2 total)
                if (remainingPoints >= 1) {
                  updateNested(`skills.${skill}`, {
                    proficient: true,
                    expertise: true,
                  });
                } else {
                  // No points for expertise — remove proficiency instead (refund)
                  updateNested(`skills.${skill}`, {
                    proficient: false,
                    expertise: false,
                  });
                }
              } else {
                // expertise → none (refund 2)
                updateNested(`skills.${skill}`, {
                  proficient: false,
                  expertise: false,
                });
              }
            }

            // Can the player upgrade this skill?
            const canUpgrade =
              (!isProficient && remainingPoints >= 1) ||
              (isProficient && !hasExpertise && remainingPoints >= 1);

            return (
              <div key={skill}>
                {showHeader && (
                  <div className="cs-skill-group-header">
                    {ability.charAt(0).toUpperCase() + ability.slice(1)}
                  </div>
                )}
                <div
                  className={`cs-skill ${
                    !canUpgrade && !isProficient
                      ? "cs-skill--disabled"
                      : ""
                  }`}
                >
                  <button
                    className={`cs-skill__prof ${
                      hasExpertise
                        ? "cs-skill__prof--expert"
                        : isProficient
                        ? "cs-skill__prof--yes"
                        : ""
                    } ${
                      !canUpgrade && !isProficient
                        ? "cs-skill__prof--locked"
                        : ""
                    }`}
                    onClick={cycleProf}
                    title={
                      hasExpertise
                        ? "Expertise (2 pts) — click to remove"
                        : isProficient
                        ? remainingPoints >= 1
                          ? "Proficient (1 pt) — click for expertise"
                          : "Proficient (1 pt) — click to remove"
                        : remainingPoints >= 1
                        ? "Not proficient — click to assign (1 pt)"
                        : "No points remaining"
                    }
                  >
                    {hasExpertise ? "★" : isProficient ? "●" : "○"}
                  </button>
                  <span className="cs-skill__mod">{formatMod(bonus)}</span>
                  <span className="cs-skill__name">
                    {formatSkillName(skill)}
                  </span>
                  <span className="cs-skill__cost">
                    {hasExpertise
                      ? "2 pts"
                      : isProficient
                      ? "1 pt"
                      : ""}
                  </span>
                  <span className="cs-skill__ability">
                    {ABILITY_SHORT[ability]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Passive Scores ────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Passive Scores</h2>
        <div className="cs-passives">
          {(["perception", "insight", "investigation"] as SkillName[]).map(
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