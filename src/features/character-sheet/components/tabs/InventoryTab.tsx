import { useState } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type {
  InventoryItem,
  ItemType,
  DieType,
  DamageType,
} from "@shared/types/dnd";
import { carryCapacity } from "@shared/utils/dndMath";

// ── Constants ────────────────────────────────────────────────────

const ITEM_TYPES: ItemType[] = [
  "weapon",
  "armor",
  "potion",
  "gear",
  "treasure",
  "other",
];

const ITEM_TYPE_ICONS: Record<ItemType, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  potion: "🧪",
  gear: "⚙️",
  treasure: "💰",
  other: "📦",
};

function blankItem(): Omit<InventoryItem, "id"> {
  return {
    name: "",
    type: "gear",
    quantity: 1,
    weight: 0,
    description: "",
    equipped: false,
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ────────────────────────────────────────────────────

export default function InventoryTab() {
  const { character, updateField } = useCharacterStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<InventoryItem, "id">>(blankItem());
  const [filterType, setFilterType] = useState<ItemType | "all">("all");

  if (!character) return null;

  // ── Weight calculation ───────────────────────────────────────

  const totalWeight = character.inventory.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );
  const maxCarry = carryCapacity(character.abilityScores.strength);

  // ── Item CRUD ────────────────────────────────────────────────

  function saveItem() {
    const items = [...character!.inventory];
    if (editingId) {
      const idx = items.findIndex((i) => i.id === editingId);
      if (idx !== -1) items[idx] = { ...form, id: editingId };
    } else {
      items.push({ ...form, id: generateId() });
    }
    updateField("inventory", items);
    setShowForm(false);
    setEditingId(null);
    setForm(blankItem());
  }

  function editItem(item: InventoryItem) {
    const { id, ...rest } = item;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  }

  function removeItem(id: string) {
    updateField(
      "inventory",
      character!.inventory.filter((i) => i.id !== id)
    );
  }

  function toggleEquipped(id: string) {
    const items = character!.inventory.map((i) =>
      i.id === id ? { ...i, equipped: !i.equipped } : i
    );
    updateField("inventory", items);
  }

  function adjustQuantity(id: string, delta: number) {
    const items = character!.inventory.map((i) =>
      i.id === id
        ? { ...i, quantity: Math.max(0, i.quantity + delta) }
        : i
    );
    updateField("inventory", items.filter((i) => i.quantity > 0));
  }

  // ── Filtered items ───────────────────────────────────────────

  const filtered =
    filterType === "all"
      ? character.inventory
      : character.inventory.filter((i) => i.type === filterType);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs-tab cs-tab--inventory">
      {/* ── Weight tracker ────────────────────────────────── */}
      <section className="cs-section">
        <h2 className="cs-section__title">Encumbrance</h2>
        <div className="cs-weight">
          <div className="cs-weight__bar-container">
            <div
              className="cs-weight__bar"
              style={{
                width: `${Math.min(100, (totalWeight / maxCarry) * 100)}%`,
              }}
              data-over={totalWeight > maxCarry ? "true" : undefined}
            />
            <span className="cs-weight__text">
              {totalWeight.toFixed(1)} / {maxCarry} lbs
            </span>
          </div>
        </div>
      </section>

      {/* ── Item list ─────────────────────────────────────── */}
      <section className="cs-section">
        <div className="cs-section__header">
          <h2 className="cs-section__title">
            Items ({character.inventory.length})
          </h2>
          <div className="cs-section__actions">
            <select
              className="cs-field__input"
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as ItemType | "all")
              }
            >
              <option value="all">All Types</option>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ITEM_TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <button
              className="btn btn--primary"
              onClick={() => {
                setForm(blankItem());
                setEditingId(null);
                setShowForm(true);
              }}
            >
              + Add Item
            </button>
          </div>
        </div>

        <div className="cs-items">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`cs-item ${item.equipped ? "cs-item--equipped" : ""}`}
            >
              <button
                className={`cs-item__equip ${
                  item.equipped ? "cs-item__equip--yes" : ""
                }`}
                onClick={() => toggleEquipped(item.id)}
                title={item.equipped ? "Equipped" : "Not equipped"}
              >
                {item.equipped ? "◆" : "◇"}
              </button>

              <span className="cs-item__icon">
                {ITEM_TYPE_ICONS[item.type]}
              </span>

              <div className="cs-item__info">
                <span className="cs-item__name">{item.name}</span>
                {item.description && (
                  <span className="cs-item__desc">{item.description}</span>
                )}
                {item.damageDie && (
                  <span className="cs-item__damage">
                    {item.damageDie}
                    {item.damageBonus ? ` + ${item.damageBonus}` : ""}{" "}
                    {item.damageType}
                  </span>
                )}
                {item.acBonus != null && item.acBonus > 0 && (
                  <span className="cs-item__ac">AC +{item.acBonus}</span>
                )}
              </div>

              <div className="cs-item__qty">
                <button
                  className="cs-item__qty-btn"
                  onClick={() => adjustQuantity(item.id, -1)}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  className="cs-item__qty-btn"
                  onClick={() => adjustQuantity(item.id, 1)}
                >
                  +
                </button>
              </div>

              {item.weight != null && (
                <span className="cs-item__weight">
                  {(item.weight * item.quantity).toFixed(1)} lb
                </span>
              )}

              <div className="cs-item__actions">
                <button className="cs-item__btn" onClick={() => editItem(item)}>
                  Edit
                </button>
                <button
                  className="cs-item__btn cs-item__btn--danger"
                  onClick={() => removeItem(item.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="cs-empty">
            No items yet. Add equipment to your inventory above.
          </p>
        )}
      </section>

      {/* ── Add / Edit Item Form ──────────────────────────── */}
      {showForm && (
        <div className="cs-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cs-modal__title">
              {editingId ? "Edit Item" : "Add Item"}
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
                <span className="cs-field__label">Type</span>
                <select
                  className="cs-field__input"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as ItemType })
                  }
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Quantity</span>
                <input
                  className="cs-field__input cs-field__input--narrow"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Weight (lb each)</span>
                <input
                  className="cs-field__input cs-field__input--narrow"
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.weight ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, weight: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label className="cs-field" style={{ marginTop: "0.75rem" }}>
              <span className="cs-field__label">Description</span>
              <textarea
                className="cs-field__input cs-field__textarea"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>

            {/* Weapon-specific fields */}
            {form.type === "weapon" && (
              <div className="cs-grid cs-grid--3" style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">Damage Die</span>
                  <select
                    className="cs-field__input"
                    value={form.damageDie ?? "d6"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        damageDie: e.target.value as DieType,
                      })
                    }
                  >
                    {["d4", "d6", "d8", "d10", "d12"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cs-field">
                  <span className="cs-field__label">Damage Bonus</span>
                  <input
                    className="cs-field__input cs-field__input--narrow"
                    type="number"
                    value={form.damageBonus ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        damageBonus: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="cs-field">
                  <span className="cs-field__label">Damage Type</span>
                  <input
                    className="cs-field__input"
                    value={form.damageType ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        damageType: e.target.value as DamageType,
                      })
                    }
                    placeholder="slashing"
                  />
                </label>
              </div>
            )}

            {/* Armor-specific */}
            {form.type === "armor" && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">AC Bonus</span>
                  <input
                    className="cs-field__input cs-field__input--narrow"
                    type="number"
                    value={form.acBonus ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, acBonus: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            )}

            <div className="cs-modal__footer">
              <button
                className="btn btn--outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={saveItem}
                disabled={!form.name.trim()}
              >
                {editingId ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
