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

// ── Class definitions ────────────────────────────────────────────

interface ClassDef {
  name: string;
  description: string;
}

const CLASSES: ClassDef[] = [
  { name: "Rogue",       description: "A stealthy trickster who uses cunning and agility to overcome obstacles and outmanoeuvre foes." },
  { name: "Archer",      description: "A sharpshooter who masters ranged combat, raining precise death from a distance." },
  { name: "Wizard",      description: "A scholarly spellcaster who wields arcane magic drawn from years of intense study." },
  { name: "Priest",      description: "A divine healer and protector, channelling holy power to mend wounds and shield allies." },
  { name: "Warrior",     description: "A battle-hardened fighter who relies on raw strength and martial prowess." },
  { name: "Knight",      description: "An armoured champion bound by a code of honour, excelling in mounted and melee combat." },
  { name: "Paladin",     description: "A holy warrior who combines martial skill with divine magic to smite evil." },
  { name: "Assassin",    description: "A deadly shadow operative who eliminates targets with precision and lethal efficiency." },
  { name: "Necromancer", description: "A dark mage who commands the forces of death, raising undead servants to do their bidding." },
  { name: "Huntress",    description: "A swift wilderness tracker who blends primal instincts with deadly combat skills." },
  { name: "Mystic",      description: "A psionically gifted adept who bends reality through sheer force of will." },
  { name: "Trickster",   description: "A chaotic illusionist who deceives enemies and warps perception to gain the upper hand." },
  { name: "Sorcerer",    description: "A natural-born spellcaster whose innate magical bloodline fuels devastating power." },
  { name: "Ninja",       description: "A disciplined shadow warrior combining martial arts, stealth, and surprise attacks." },
  { name: "Samurai",     description: "A noble swordmaster who channels unwavering focus and discipline into devastating strikes." },
  { name: "Bard",        description: "A charismatic performer who weaves magic through music, inspiring allies and beguiling foes." },
  { name: "Summoner",    description: "A conjurer who calls forth creatures and elemental forces to fight alongside them." },
  { name: "Kensei",      description: "A weapon master who achieves supernatural perfection through lifelong devotion to a single blade." },
  { name: "Druid",       description: "A guardian of nature who shapeshifts and commands the primal forces of the wild." },
];

const CLASS_MAP = new Map(CLASSES.map((c) => [c.name, c]));

// ── Race definitions ─────────────────────────────────────────────

interface RaceDef {
  name: string;
  description: string;
}

const RACES: RaceDef[] = [
  { name: "Human",  description: "Versatile and ambitious, humans adapt to any role and thrive through sheer determination and resourcefulness." },
  { name: "Elf",    description: "Graceful and long-lived, elves possess keen senses, natural affinity for magic, and an unearthly elegance." },
  { name: "Dwarf",  description: "Stout and resilient, dwarves are master craftsmen and fierce warriors forged in mountain strongholds." },
  { name: "Orc",    description: "Powerful and relentless, orcs channel primal fury into raw combat strength and unwavering endurance." },
  { name: "Goblin", description: "Small but cunning, goblins survive through wit, speed, and a knack for turning chaos to their advantage." },
  { name: "Demon",  description: "Born of infernal planes, demons wield dark power and resist fire, carrying an aura of dread wherever they go." },
  { name: "Angel",  description: "Celestial beings touched by divine light, angels radiate holy energy and inspire courage in their allies." },
];

const RACE_MAP = new Map(RACES.map((r) => [r.name, r]));

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