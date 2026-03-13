import { useCharacterStore } from "../../store/useCharacterStore";

export default function BiographyTab() {
  const { character, updateField } = useCharacterStore();
  if (!character) return null;

  return (
    <div className="cs-tab cs-tab--biography">
      {/* ── Personality ───────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Personality</h2>
        <div className="cs-bio-grid">
          <label className="cs-field">
            <span className="cs-field__label">Personality Traits</span>
            <textarea
              className="cs-field__input cs-field__textarea"
              rows={3}
              value={character.personalityTraits ?? ""}
              onChange={(e) =>
                updateField("personalityTraits", e.target.value)
              }
              placeholder="I idolize a particular hero and constantly refer to their deeds…"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Ideals</span>
            <textarea
              className="cs-field__input cs-field__textarea"
              rows={3}
              value={character.ideals ?? ""}
              onChange={(e) => updateField("ideals", e.target.value)}
              placeholder="Knowledge. The path to power and self-improvement…"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Bonds</span>
            <textarea
              className="cs-field__input cs-field__textarea"
              rows={3}
              value={character.bonds ?? ""}
              onChange={(e) => updateField("bonds", e.target.value)}
              placeholder="I have an ancient text that holds terrible secrets…"
            />
          </label>
          <label className="cs-field">
            <span className="cs-field__label">Flaws</span>
            <textarea
              className="cs-field__input cs-field__textarea"
              rows={3}
              value={character.flaws ?? ""}
              onChange={(e) => updateField("flaws", e.target.value)}
              placeholder="I am easily distracted by the promise of information…"
            />
          </label>
        </div>
      </section>

      {/* ── Backstory / Notes ─────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Notes & Backstory</h2>
        <textarea
          className="cs-field__input cs-field__textarea cs-field__textarea--large"
          rows={12}
          value={character.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Write your character's backstory, session notes, or anything else here…"
        />
      </section>
    </div>
  );
}
