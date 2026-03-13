import { useCharacterStore } from "../../store/useCharacterStore";
import type { Condition, DieType } from "@shared/types/dnd";

// ── Constants ────────────────────────────────────────────────────

const HIT_DIE_OPTIONS: DieType[] = ["d6", "d8", "d10", "d12"];

const CONDITIONS: Condition[] = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
];

// ── Component ────────────────────────────────────────────────────

export default function CombatTab() {
  const { character, updateField, updateNested } = useCharacterStore();
  if (!character) return null;

  const hp = character.hitPoints;
  const ds = character.deathSaves;
  const hd = character.hitDice;

  // ── HP helpers ───────────────────────────────────────────────

  function adjustHP(delta: number) {
    const next = Math.max(0, Math.min(hp.max + hp.temporary, hp.current + delta));
    updateNested("hitPoints.current", next);
  }

  function toggleCondition(c: Condition) {
    const has = character!.conditions.includes(c);
    updateField(
      "conditions",
      has
        ? character!.conditions.filter((x) => x !== c)
        : [...character!.conditions, c]
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--combat">
      {/* ── Core combat stats ─────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Combat Stats</h2>
        <div className="cs-combat-stats">
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Armor Class</span>
            <input
              className="cs-stat-block__value"
              type="number"
              value={character.armorClass}
              onChange={(e) =>
                updateField("armorClass", Math.max(0, Number(e.target.value)))
              }
            />
          </div>
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Initiative</span>
            <input
              className="cs-stat-block__value"
              type="number"
              value={character.initiative}
              onChange={(e) =>
                updateField("initiative", Number(e.target.value))
              }
            />
          </div>
          <div className="cs-stat-block">
            <span className="cs-stat-block__label">Speed</span>
            <input
              className="cs-stat-block__value"
              type="number"
              step={5}
              min={0}
              value={character.speed}
              onChange={(e) =>
                updateField("speed", Math.max(0, Number(e.target.value)))
              }
            />
          </div>
        </div>
      </section>

      {/* ── Hit Points ────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Hit Points</h2>
        <div className="cs-hp">
          <div className="cs-hp__bar-container">
            <div
              className="cs-hp__bar"
              style={{
                width: `${Math.min(100, (hp.current / (hp.max || 1)) * 100)}%`,
              }}
              data-percent={
                hp.max > 0
                  ? Math.round((hp.current / hp.max) * 100)
                  : 0
              }
            />
            <span className="cs-hp__bar-text">
              {hp.current} / {hp.max}
              {hp.temporary > 0 && ` (+${hp.temporary} temp)`}
            </span>
          </div>

          <div className="cs-hp__controls">
            <button className="cs-hp__btn cs-hp__btn--dmg" onClick={() => adjustHP(-1)}>
              −1
            </button>
            <button className="cs-hp__btn cs-hp__btn--dmg" onClick={() => adjustHP(-5)}>
              −5
            </button>
            <button className="cs-hp__btn cs-hp__btn--heal" onClick={() => adjustHP(1)}>
              +1
            </button>
            <button className="cs-hp__btn cs-hp__btn--heal" onClick={() => adjustHP(5)}>
              +5
            </button>
          </div>

          <div className="cs-grid cs-grid--3">
            <label className="cs-field">
              <span className="cs-field__label">Max HP</span>
              <input
                className="cs-field__input cs-field__input--narrow"
                type="number"
                min={1}
                value={hp.max}
                onChange={(e) =>
                  updateNested("hitPoints.max", Math.max(1, Number(e.target.value)))
                }
              />
            </label>
            <label className="cs-field">
              <span className="cs-field__label">Current HP</span>
              <input
                className="cs-field__input cs-field__input--narrow"
                type="number"
                min={0}
                value={hp.current}
                onChange={(e) =>
                  updateNested("hitPoints.current", Math.max(0, Number(e.target.value)))
                }
              />
            </label>
            <label className="cs-field">
              <span className="cs-field__label">Temp HP</span>
              <input
                className="cs-field__input cs-field__input--narrow"
                type="number"
                min={0}
                value={hp.temporary}
                onChange={(e) =>
                  updateNested(
                    "hitPoints.temporary",
                    Math.max(0, Number(e.target.value))
                  )
                }
              />
            </label>
          </div>
        </div>
      </section>

      {/* ── Death Saves ───────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Death Saves</h2>
        <div className="cs-death-saves">
          <div className="cs-death-saves__row">
            <span className="cs-death-saves__label">Successes</span>
            <div className="cs-death-saves__pips">
              {[1, 2, 3].map((i) => (
                <button
                  key={`s-${i}`}
                  className={`cs-death-saves__pip cs-death-saves__pip--success ${
                    ds.successes >= i ? "cs-death-saves__pip--filled" : ""
                  }`}
                  onClick={() =>
                    updateNested(
                      "deathSaves.successes",
                      ds.successes >= i ? i - 1 : i
                    )
                  }
                />
              ))}
            </div>
          </div>
          <div className="cs-death-saves__row">
            <span className="cs-death-saves__label">Failures</span>
            <div className="cs-death-saves__pips">
              {[1, 2, 3].map((i) => (
                <button
                  key={`f-${i}`}
                  className={`cs-death-saves__pip cs-death-saves__pip--fail ${
                    ds.failures >= i ? "cs-death-saves__pip--filled" : ""
                  }`}
                  onClick={() =>
                    updateNested(
                      "deathSaves.failures",
                      ds.failures >= i ? i - 1 : i
                    )
                  }
                />
              ))}
            </div>
          </div>
          <button
            className="btn btn--outline cs-death-saves__reset"
            onClick={() => {
              updateNested("deathSaves.successes", 0);
              updateNested("deathSaves.failures", 0);
            }}
          >
            Reset
          </button>
        </div>
      </section>

      {/* ── Hit Dice ──────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Hit Dice</h2>
        <div className="cs-grid cs-grid--3">
          <label className="cs-field">
            <span className="cs-field__label">Die Type</span>
            <select
              className="cs-field__input"
              value={hd.dieType}
              onChange={(e) =>
                updateNested("hitDice.dieType", e.target.value)
              }
            >
              {HIT_DIE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Total</span>
            <input
              className="cs-field__input cs-field__input--narrow"
              type="number"
              min={1}
              value={hd.total}
              onChange={(e) =>
                updateNested("hitDice.total", Math.max(1, Number(e.target.value)))
              }
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Used</span>
            <input
              className="cs-field__input cs-field__input--narrow"
              type="number"
              min={0}
              max={hd.total}
              value={hd.used}
              onChange={(e) =>
                updateNested(
                  "hitDice.used",
                  Math.max(0, Math.min(hd.total, Number(e.target.value)))
                )
              }
            />
          </label>
        </div>
      </section>

      {/* ── Conditions ────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Conditions</h2>
        <div className="cs-conditions">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              className={`cs-condition ${
                character.conditions.includes(c) ? "cs-condition--active" : ""
              }`}
              onClick={() => toggleCondition(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
