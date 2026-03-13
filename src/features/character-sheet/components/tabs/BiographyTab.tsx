import { useCharacterStore } from "../../store/useCharacterStore";

export default function BiographyTab() {
  const { character, updateField } = useCharacterStore();
  if (!character) return null;

  return (
    <div className="cs-tab cs-tab--biography">
      {/* ── Backstory ─────────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Backstory</h2>
        <p className="cs-section__hint">
          Write your character's origin story, motivations, and history.
          This is entirely for your own enjoyment and roleplay.
        </p>
        <textarea
          className="cs-field__input cs-field__textarea cs-field__textarea--large"
          rows={10}
          value={character.personalityTraits ?? ""}
          onChange={(e) => updateField("personalityTraits", e.target.value)}
          placeholder="Where did your character come from? What drives them? What shaped them into who they are today?"
        />
      </section>

      {/* ── Session Notes (read-only during creation) ──────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Session Notes</h2>
        <div className="cs-notes-placeholder">
          {character.notes ? (
            <div className="cs-notes-content">
              {character.notes}
            </div>
          ) : (
            <div className="cs-notes-empty">
              <span className="cs-notes-empty__icon">📝</span>
              <span className="cs-notes-empty__title">No notes yet</span>
              <span className="cs-notes-empty__text">
                Session notes will appear here as you play. During a live
                session, you can jot down events, discoveries, NPC names,
                quest details, and anything you want to remember.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}