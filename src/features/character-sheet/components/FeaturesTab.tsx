import { useState } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type { Feature } from "@shared/types/dnd";

// ── Helpers ──────────────────────────────────────────────────────

function blankFeature(): Omit<Feature, "id"> {
  return {
    name: "",
    source: "",
    description: "",
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ────────────────────────────────────────────────────

export default function FeaturesTab() {
  const { character, updateField } = useCharacterStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Feature, "id">>(blankFeature());

  if (!character) return null;

  // ── Feature CRUD ─────────────────────────────────────────────

  function saveFeature() {
    const features = [...character!.features];
    if (editingId) {
      const idx = features.findIndex((f) => f.id === editingId);
      if (idx !== -1) features[idx] = { ...form, id: editingId };
    } else {
      features.push({ ...form, id: generateId() });
    }
    updateField("features", features);
    setShowForm(false);
    setEditingId(null);
    setForm(blankFeature());
  }

  function editFeature(feat: Feature) {
    const { id, ...rest } = feat;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  }

  function removeFeature(id: string) {
    updateField(
      "features",
      character!.features.filter((f) => f.id !== id)
    );
  }

  function useCharge(id: string) {
    const features = character!.features.map((f) => {
      if (f.id !== id || !f.usesMax) return f;
      const current = f.usesCurrent ?? 0;
      if (current >= f.usesMax) return f;
      return { ...f, usesCurrent: current + 1 };
    });
    updateField("features", features);
  }

  function resetCharges(id: string) {
    const features = character!.features.map((f) =>
      f.id === id ? { ...f, usesCurrent: 0 } : f
    );
    updateField("features", features);
  }

  function shortRest() {
    const features = character!.features.map((f) =>
      f.rechargeOn === "shortRest" ? { ...f, usesCurrent: 0 } : f
    );
    updateField("features", features);
  }

  function longRest() {
    const features = character!.features.map((f) =>
      f.rechargeOn ? { ...f, usesCurrent: 0 } : f
    );
    updateField("features", features);
  }

  // ── Group by source ──────────────────────────────────────────

  const grouped = character.features.reduce<Record<string, Feature[]>>(
    (acc, feat) => {
      const source = feat.source || "Other";
      (acc[source] ??= []).push(feat);
      return acc;
    },
    {}
  );

  const sources = Object.keys(grouped).sort();

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--features">
      <section className="cs-section">
        <div className="cs-section__header">
          <h2 className="cs-section__title">
            Features & Traits ({character.features.length})
          </h2>
          <div className="cs-section__actions">
            <button className="btn btn--outline" onClick={shortRest}>
              Short Rest
            </button>
            <button className="btn btn--outline" onClick={longRest}>
              Long Rest
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                setForm(blankFeature());
                setEditingId(null);
                setShowForm(true);
              }}
            >
              + Add Feature
            </button>
          </div>
        </div>

        {sources.map((source) => (
          <div key={source} className="cs-feature-group">
            <h3 className="cs-feature-group__title">{source}</h3>
            {grouped[source].map((feat) => (
              <div key={feat.id} className="cs-feature-card">
                <div className="cs-feature-card__header">
                  <span className="cs-feature-card__name">{feat.name}</span>
                  {feat.rechargeOn && (
                    <span className="cs-feature-card__recharge">
                      {feat.rechargeOn === "shortRest"
                        ? "Short Rest"
                        : "Long Rest"}
                    </span>
                  )}
                  <div className="cs-feature-card__actions">
                    <button
                      className="cs-spell-card__btn"
                      onClick={() => editFeature(feat)}
                    >
                      Edit
                    </button>
                    <button
                      className="cs-spell-card__btn cs-spell-card__btn--danger"
                      onClick={() => removeFeature(feat.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {feat.description && (
                  <p className="cs-feature-card__desc">{feat.description}</p>
                )}

                {feat.usesMax != null && feat.usesMax > 0 && (
                  <div className="cs-feature-card__uses">
                    <span>
                      Uses: {feat.usesCurrent ?? 0} / {feat.usesMax}
                    </span>
                    <div className="cs-feature-card__uses-btns">
                      <button
                        className="cs-item__qty-btn"
                        onClick={() => useCharge(feat.id)}
                        disabled={(feat.usesCurrent ?? 0) >= feat.usesMax}
                      >
                        Use
                      </button>
                      <button
                        className="cs-item__qty-btn"
                        onClick={() => resetCharges(feat.id)}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {character.features.length === 0 && (
          <p className="cs-empty">
            No features yet. Add class features, racial traits, and feats here.
          </p>
        )}
      </section>

      {/* ── Add / Edit Feature Form ───────────────────────── */}
      {showForm && (
        <div className="cs-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cs-modal__title">
              {editingId ? "Edit Feature" : "Add Feature"}
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
                <span className="cs-field__label">Source</span>
                <input
                  className="cs-field__input"
                  value={form.source}
                  onChange={(e) =>
                    setForm({ ...form, source: e.target.value })
                  }
                  placeholder="e.g. Wizard, Half-Elf, Feat"
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Max Uses (0 = unlimited)</span>
                <input
                  className="cs-field__input cs-field__input--narrow"
                  type="number"
                  min={0}
                  value={form.usesMax ?? 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm({
                      ...form,
                      usesMax: val > 0 ? val : undefined,
                      usesCurrent: val > 0 ? 0 : undefined,
                    });
                  }}
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Recharge</span>
                <select
                  className="cs-field__input"
                  value={form.rechargeOn ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rechargeOn:
                        (e.target.value as "shortRest" | "longRest") ||
                        undefined,
                    })
                  }
                >
                  <option value="">None</option>
                  <option value="shortRest">Short Rest</option>
                  <option value="longRest">Long Rest</option>
                </select>
              </label>
            </div>
            <label className="cs-field" style={{ marginTop: "0.75rem" }}>
              <span className="cs-field__label">Description</span>
              <textarea
                className="cs-field__input cs-field__textarea"
                rows={4}
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
                onClick={saveFeature}
                disabled={!form.name.trim()}
              >
                {editingId ? "Save Changes" : "Add Feature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
