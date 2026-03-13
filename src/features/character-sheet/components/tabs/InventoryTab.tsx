import { useState } from "react";
import { useCharacterStore } from "../../store/useCharacterStore";
import type {
  InventoryItem,
  ItemType,
  DieType,
  DamageType,
} from "@shared/types/dnd";
import { computeCarryCapacity } from "@shared/utils/classProgression";

// ── Weapon data ──────────────────────────────────────────────────

interface WeaponDef {
  name: string;
  category: string;
  damageDie: DieType;
  damageType: DamageType;
  weight: number;
  description: string;
}

const WEAPONS: WeaponDef[] = [
  // Simple Weapons
  { name: "Dagger",          category: "Simple Weapons",  damageDie: "d4",  damageType: "piercing",    weight: 1.0,
    description: "A short, sharp blade favoured for its concealability. Light enough to throw and deadly in close quarters." },
  { name: "Mace",            category: "Simple Weapons",  damageDie: "d6",  damageType: "bludgeoning", weight: 10.0,
    description: "A heavy flanged head on a sturdy shaft, designed to crush armour and shatter bone with each swing." },
  { name: "Quarterstaff",    category: "Simple Weapons",  damageDie: "d6",  damageType: "bludgeoning", weight: 2.0,
    description: "A versatile wooden staff used for both offence and defence. A traveller's companion and a mage's classic weapon." },
  { name: "Spear",           category: "Simple Weapons",  damageDie: "d6",  damageType: "piercing",    weight: 9.0,
    description: "A long-shafted weapon tipped with a sharp point, effective at keeping enemies at a distance or hurling from afar." },
  { name: "Light Crossbow",  category: "Simple Weapons",  damageDie: "d8",  damageType: "piercing",    weight: 3.5,
    description: "A compact ranged weapon that fires bolts with surprising force. Easy to use, requiring strength to reload rather than skill to aim." },
  // Martial Weapons
  { name: "Battleaxe",       category: "Martial Weapons", damageDie: "d8",  damageType: "slashing",    weight: 20.0,
    description: "A broad-bladed axe built for war. Its heavy head delivers devastating chops that can cleave through shields." },
  { name: "Longsword",       category: "Martial Weapons", damageDie: "d8",  damageType: "slashing",    weight: 15.0,
    description: "The quintessential knightly weapon — balanced, reliable, and equally effective with one hand or two." },
  { name: "Shortsword",      category: "Martial Weapons", damageDie: "d6",  damageType: "piercing",    weight: 8.0,
    description: "A quick, light blade ideal for rapid strikes and dual wielding. Favoured by rogues and skirmishers alike." },
  { name: "Warhammer",       category: "Martial Weapons", damageDie: "d8",  damageType: "bludgeoning", weight: 25.0,
    description: "A massive hammer forged for the battlefield. Each blow lands with the weight of a thunderclap, denting plate and breaking resolve." },
  { name: "Whip",            category: "Martial Weapons", damageDie: "d4",  damageType: "slashing",    weight: 1.5,
    description: "A flexible leather lash with surprising reach. Skilled wielders can disarm foes or trip them from a safe distance." },
  // Ranged
  { name: "Longbow",         category: "Martial Weapons", damageDie: "d8",  damageType: "piercing",    weight: 7.0,
    description: "A tall, powerful bow with impressive range. Requires considerable strength to draw but delivers lethal precision at distance." },
  { name: "Shortbow",        category: "Martial Weapons", damageDie: "d6",  damageType: "piercing",    weight: 3.5,
    description: "A compact bow that trades range for speed. Perfect for mobile archers who shoot on the move." },
  { name: "Hand Crossbow",   category: "Martial Weapons", damageDie: "d6",  damageType: "piercing",    weight: 7.5,
    description: "A small, one-handed crossbow that can be fired quickly. Ideal for ambushes and fighting in tight spaces." },
  // Exotic / Class-specific
  { name: "Blowgun",         category: "Exotic",          damageDie: "d4",  damageType: "piercing",    weight: 0.5,
    description: "A slender tube that fires tiny darts in silence. Often paired with poisons to compensate for its low damage." },
  { name: "Shuriken",        category: "Exotic",          damageDie: "d4",  damageType: "piercing",    weight: 0.1,
    description: "Razor-sharp throwing stars that can be concealed in a palm. Deadly when used in rapid succession." },
  { name: "Nunchaku",        category: "Exotic",          damageDie: "d6",  damageType: "bludgeoning", weight: 3.0,
    description: "Two hardwood sticks connected by a short chain. Whirling strikes build momentum for surprising force." },
  { name: "Katana",          category: "Exotic",          damageDie: "d10", damageType: "slashing",    weight: 6.0,
    description: "A curved, single-edged blade of exceptional craftsmanship. Its razor edge and flowing strikes reward discipline and precision." },
];

const WEAPON_MAP = new Map(WEAPONS.map((w) => [w.name, w]));

// ── Armor data ───────────────────────────────────────────────────

interface ArmorDef {
  name: string;
  category: string;
  acBonus: number;
  weight: number;
  description: string;
}

const ARMORS: ArmorDef[] = [
  // Light Armor
  { name: "Padded Armor",    category: "Light Armor",  acBonus: 1,  weight: 4.0,
    description: "Layers of quilted cloth stitched together. Offers minimal protection but barely hinders movement." },
  { name: "Leather Armor",   category: "Light Armor",  acBonus: 1,  weight: 5.0,
    description: "Cured and hardened animal hide shaped to fit the body. A staple for scouts and adventurers who value mobility." },
  { name: "Studded Leather", category: "Light Armor",  acBonus: 2,  weight: 6.0,
    description: "Tough leather reinforced with riveted metal studs. The best protection you can wear without sacrificing agility." },
  // Medium Armor
  { name: "Hide Armor",      category: "Medium Armor", acBonus: 2,  weight: 5.5,
    description: "Thick pelts and furs layered into crude but effective armour. Favoured by druids and wilderness warriors." },
  { name: "Chain Shirt",     category: "Medium Armor", acBonus: 3,  weight: 10.0,
    description: "A shirt of interlocking metal rings worn under clothing. Provides solid defence while remaining relatively light." },
  { name: "Scale Mail",      category: "Medium Armor", acBonus: 4,  weight: 22.5,
    description: "Overlapping metal scales sewn onto a leather backing. Heavy but highly resistant to slashing attacks." },
  // Heavy Armor
  { name: "Ring Mail",       category: "Heavy Armor",  acBonus: 4,  weight: 20.0,
    description: "Metal rings sewn directly onto a heavy leather foundation. The most affordable heavy armour, but noisy and cumbersome." },
  { name: "Chain Mail",      category: "Heavy Armor",  acBonus: 6,  weight: 27.5,
    description: "Thousands of interlocking steel rings forming a full suit. A classic choice for knights and soldiers alike." },
  { name: "Plate Armor",     category: "Heavy Armor",  acBonus: 8,  weight: 32.5,
    description: "Full-body plates of forged steel covering every limb and joint. The pinnacle of personal protection — and weight." },
  // Shields
  { name: "Shield",          category: "Shields",      acBonus: 2,  weight: 10.0,
    description: "A sturdy wooden or metal shield strapped to the forearm. Blocks incoming blows and can be used to bash enemies." },
  { name: "Tower Shield",    category: "Shields",      acBonus: 3,  weight: 20.0,
    description: "A massive full-body shield that provides near-total cover. Extremely heavy but invaluable in a siege or formation." },
  // Non-metal variants
  { name: "Wooden Shield",   category: "Shields (non-metal)",         acBonus: 2,  weight: 4.0,
    description: "A shield carved from ironoak, suitable for those whose beliefs forbid metal. Surprisingly durable for its weight." },
  { name: "Ironwood Breastplate", category: "Medium Armor (non-metal)", acBonus: 2, weight: 10.0,
    description: "A breastplate shaped from magically hardened wood. Accepted by nature-bound warriors who reject metal armour." },
  { name: "Hide Shield",     category: "Shields (non-metal)",         acBonus: 1,  weight: 2.0,
    description: "A round shield of layered beast hides stretched over a wooden frame. Light and quick to raise in defence." },
];

const ARMOR_MAP = new Map(ARMORS.map((a) => [a.name, a]));

// ── Gear data (linked to tool proficiencies) ─────────────────────

interface GearDef {
  name: string;
  linkedTo: string; // tool proficiency that grants access
  description: string;
  weight: number;
}

const GEAR: GearDef[] = [
  // Thieves' Tools
  { name: "Lockpick Set",       linkedTo: "Thieves' Tools",        description: "A set of fine picks and tension wrenches for opening locks without a key.",           weight: 0.5 },
  { name: "Trap Disarm Kit",    linkedTo: "Thieves' Tools",        description: "Specialised tools for detecting and safely disabling mechanical traps.",               weight: 1.0 },
  // Fletcher's Tools
  { name: "Arrow Crafting Kit", linkedTo: "Fletcher's Tools",      description: "Materials and tools for crafting arrows and maintaining bows in the field.",           weight: 2.5 },
  { name: "Bowstring Set",      linkedTo: "Fletcher's Tools",      description: "Spare bowstrings of various draw weights, waxed and ready for use.",                  weight: 0.5 },
  // Arcane Focus
  { name: "Crystal Orb",        linkedTo: "Arcane Focus",          description: "A polished crystal sphere that channels arcane energy to empower spellcasting.",       weight: 1.5 },
  { name: "Arcane Wand",        linkedTo: "Arcane Focus",          description: "A slender wand carved from enchanted wood, used to direct magical forces.",           weight: 0.5 },
  // Holy Symbol
  { name: "Holy Amulet",        linkedTo: "Holy Symbol",           description: "A blessed amulet bearing a sacred emblem, required to channel divine magic.",         weight: 0.5 },
  { name: "Prayer Beads",       linkedTo: "Holy Symbol",           description: "Consecrated beads used in meditation and prayer to strengthen divine connection.",     weight: 0.3 },
  // Herbalism Kit
  { name: "Herb Pouch",         linkedTo: "Herbalism Kit",         description: "A leather pouch filled with dried herbs, roots, and leaves for crafting remedies.",    weight: 1.5 },
  { name: "Mortar & Pestle",    linkedTo: "Herbalism Kit",         description: "A stone bowl and grinder for preparing herbal mixtures and poultices.",               weight: 2.0 },
  // Mount Handling Kit
  { name: "Riding Saddle",      linkedTo: "Mount Handling Kit",    description: "A sturdy leather saddle fitted for long rides and mounted combat.",                   weight: 12.0 },
  { name: "Grooming Kit",       linkedTo: "Mount Handling Kit",    description: "Brushes, hoof picks, and oils for keeping a mount healthy and battle-ready.",         weight: 3.0 },
  // Poisoner's Kit
  { name: "Venom Vials",        linkedTo: "Poisoner's Kit",        description: "Small glass vials and applicators for storing and applying poisons to blades.",       weight: 0.5 },
  { name: "Poison Applicator",  linkedTo: "Poisoner's Kit",        description: "A needle-tipped tool for coating weapons or darts with toxins.",                      weight: 0.3 },
  // Alchemist's Supplies
  { name: "Reagent Pouch",      linkedTo: "Alchemist's Supplies",  description: "A pouch of rare powders, salts, and essences used in alchemical recipes.",            weight: 1.5 },
  { name: "Alchemist's Burner", linkedTo: "Alchemist's Supplies",  description: "A portable flame source for heating mixtures and distilling compounds.",              weight: 2.0 },
  // Trapper's Kit
  { name: "Snare Wire",         linkedTo: "Trapper's Kit",         description: "Thin but strong wire for setting animal snares and tripwire traps.",                  weight: 1.0 },
  { name: "Animal Bait",        linkedTo: "Trapper's Kit",         description: "Scented lures and bait for attracting game or distracting beasts.",                   weight: 0.5 },
  // Psionic Focus
  { name: "Mind Crystal",       linkedTo: "Psionic Focus",         description: "A resonating crystal that amplifies psionic energy and sharpens mental focus.",       weight: 0.3 },
  { name: "Meditation Beads",   linkedTo: "Psionic Focus",         description: "Smooth beads that help centre the mind for deep concentration and psionic channelling.", weight: 0.2 },
  // Disguise Kit
  { name: "Makeup Set",         linkedTo: "Disguise Kit",          description: "Theatrical paints, prosthetics, and adhesives for altering your appearance.",         weight: 1.5 },
  { name: "Wig Collection",     linkedTo: "Disguise Kit",          description: "An assortment of wigs and hairpieces in various styles and colours.",                 weight: 1.0 },
  // Forgery Kit
  { name: "Ink & Quill Set",    linkedTo: "Forgery Kit",           description: "High-quality inks and precision quills for replicating handwriting and documents.",   weight: 0.5 },
  { name: "Seal Stamps",        linkedTo: "Forgery Kit",           description: "Blank wax seals and carving tools for forging official stamps and emblems.",          weight: 0.5 },
  // Calligrapher's Supplies
  { name: "Calligraphy Set",    linkedTo: "Calligrapher's Supplies", description: "Fine brushes, ink stones, and paper for elegant writing and ward inscriptions.",   weight: 1.0 },
  { name: "Enchanted Ink",      linkedTo: "Calligrapher's Supplies", description: "Ink infused with trace magic, used for scrolls and mystical calligraphy.",         weight: 0.3 },
  // Musical Instruments (Bard)
  { name: "Lute",               linkedTo: "Three Musical Instruments", description: "A stringed instrument perfect for ballads, battle hymns, and magical melodies.", weight: 1.5 },
  { name: "Flute",              linkedTo: "Three Musical Instruments", description: "A wooden wind instrument whose melodies can charm, soothe, or inspire.",        weight: 0.5 },
  { name: "Hand Drum",          linkedTo: "Three Musical Instruments", description: "A small drum used for rhythmic chanting and percussive spell weaving.",         weight: 1.5 },
  // Summoning Circle Kit
  { name: "Chalk & Runes",      linkedTo: "Summoning Circle Kit",  description: "Enchanted chalk and stencils for drawing summoning circles and binding glyphs.",     weight: 0.5 },
  { name: "Binding Candles",    linkedTo: "Summoning Circle Kit",  description: "Ritual candles inscribed with runes that anchor summoned entities.",                 weight: 1.0 },
  // Artisan's Tools
  { name: "Whetstone",          linkedTo: "Artisan's Tools",       description: "A fine-grained stone for honing blades to razor sharpness before battle.",            weight: 0.5 },
  { name: "Blade Oil Kit",      linkedTo: "Artisan's Tools",       description: "Protective oils and cloths for maintaining weapons and preventing rust.",             weight: 0.5 },
  // Druidic Focus
  { name: "Wooden Totem",       linkedTo: "Druidic Focus",         description: "A hand-carved totem channelling the primal forces of nature for spellcasting.",      weight: 1.0 },
  { name: "Mistletoe Sprig",    linkedTo: "Druidic Focus",         description: "A sacred sprig of mistletoe used as a natural conduit for druidic magic.",           weight: 0.1 },
];

const GEAR_MAP = new Map(GEAR.map((g) => [g.name, g]));

// ── Potion data (linked to tool proficiencies) ───────────────────

interface PotionDef {
  name: string;
  linkedTo: string;
  description: string;
  weight: number;
}

const POTIONS: PotionDef[] = [
  // Herbalism Kit
  { name: "Healing Salve",      linkedTo: "Herbalism Kit",         description: "A thick herbal paste that mends minor wounds when applied. Restores a small amount of HP.",   weight: 0.3 },
  { name: "Antidote",           linkedTo: "Herbalism Kit",         description: "A bitter herbal brew that neutralises common poisons and venoms.",                            weight: 0.3 },
  { name: "Herbal Tea",         linkedTo: "Herbalism Kit",         description: "A restorative tea that eases exhaustion and grants a short burst of stamina.",                weight: 0.2 },
  // Alchemist's Supplies
  { name: "Minor Healing Potion", linkedTo: "Alchemist's Supplies", description: "A red alchemical mixture that restores a moderate amount of HP when consumed.",             weight: 0.5 },
  { name: "Fire Flask",         linkedTo: "Alchemist's Supplies",  description: "A volatile flask that ignites on impact, dealing fire damage in a small area.",              weight: 0.5 },
  { name: "Smoke Bomb",         linkedTo: "Alchemist's Supplies",  description: "A clay sphere that releases thick smoke on impact, heavily obscuring a small area.",         weight: 0.3 },
  // Poisoner's Kit
  { name: "Weakening Poison",   linkedTo: "Poisoner's Kit",        description: "A colourless poison that saps the target's strength, imposing disadvantage on STR checks.",  weight: 0.2 },
  { name: "Sleep Poison",       linkedTo: "Poisoner's Kit",        description: "A potent sedative that can render a target unconscious if they fail a CON save.",            weight: 0.2 },
  // Arcane Focus
  { name: "Mana Draught",       linkedTo: "Arcane Focus",          description: "A shimmering blue liquid that restores one expended spell slot of level 1 or 2.",            weight: 0.3 },
  // Holy Symbol
  { name: "Holy Water",         linkedTo: "Holy Symbol",           description: "Blessed water that deals radiant damage to undead and fiends on contact.",                   weight: 0.5 },
  // Druidic Focus
  { name: "Nature's Balm",      linkedTo: "Druidic Focus",         description: "A poultice of wild herbs that cures disease and removes one condition when applied.",        weight: 0.3 },
  // Psionic Focus
  { name: "Clarity Elixir",     linkedTo: "Psionic Focus",         description: "A translucent tonic that sharpens mental focus, granting advantage on the next WIS check.", weight: 0.2 },
];

const POTION_MAP = new Map(POTIONS.map((p) => [p.name, p]));

// ── Helpers ──────────────────────────────────────────────────────

const ITEM_TYPES: ItemType[] = [
  "weapon",
  "armor",
  "potion",
  "gear",
  "treasure",
  "other",
];

/** Types the player can add during character creation. Treasure and Other are session-only. */
const CREATABLE_TYPES: ItemType[] = [
  "weapon",
  "armor",
  "potion",
  "gear",
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

/**
 * Returns all weapons the character can use based on their
 * weapon proficiencies. Categories like "Simple Weapons" expand
 * to all weapons in that category. Specific names match directly.
 */
function getAvailableWeapons(proficiencies: string[]): WeaponDef[] {
  const profSet = new Set(proficiencies);
  const result: WeaponDef[] = [];
  const seen = new Set<string>();

  for (const weapon of WEAPONS) {
    if (seen.has(weapon.name)) continue;
    // Match by category (e.g. "Simple Weapons") or by exact name
    if (profSet.has(weapon.category) || profSet.has(weapon.name)) {
      result.push(weapon);
      seen.add(weapon.name);
    }
  }

  // Also handle special proficiencies like "Kensei Weapon of Choice"
  // which would have been resolved to a specific weapon name
  for (const prof of proficiencies) {
    const w = WEAPON_MAP.get(prof);
    if (w && !seen.has(w.name)) {
      result.push(w);
      seen.add(w.name);
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns all armor the character can use based on their
 * armor proficiencies. Categories expand to all armor in that category.
 */
function getAvailableArmors(proficiencies: string[]): ArmorDef[] {
  const profSet = new Set(proficiencies);
  const result: ArmorDef[] = [];
  const seen = new Set<string>();

  for (const armor of ARMORS) {
    if (seen.has(armor.name)) continue;
    if (profSet.has(armor.category) || profSet.has(armor.name)) {
      result.push(armor);
      seen.add(armor.name);
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns gear items available based on tool proficiencies.
 */
function getAvailableGear(toolProficiencies: string[]): GearDef[] {
  const profSet = new Set(toolProficiencies);
  return GEAR.filter((g) => profSet.has(g.linkedTo))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns potions available based on tool proficiencies.
 */
function getAvailablePotions(toolProficiencies: string[]): PotionDef[] {
  const profSet = new Set(toolProficiencies);
  return POTIONS.filter((p) => profSet.has(p.linkedTo))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Component ────────────────────────────────────────────────────

export default function InventoryTab() {
  const { character, updateField } = useCharacterStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<InventoryItem, "id">>(blankItem());
  const [filterType, setFilterType] = useState<ItemType | "all">("all");

  if (!character) return null;

  // ── Available weapons & armor from proficiencies ─────────────

  const availableWeapons = getAvailableWeapons(character.weaponProficiencies);
  const availableArmors = getAvailableArmors(character.armorProficiencies);
  const availableGear = getAvailableGear(character.toolProficiencies);
  const availablePotions = getAvailablePotions(character.toolProficiencies);

  // ── Weight calculation ───────────────────────────────────────

  const totalWeight = character.inventory.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );
  const carryBreakdown = computeCarryCapacity(
    character.abilityScores.strength,
    character.race,
    character.class
  );
  const maxCarry = carryBreakdown.total;

  // ── Item CRUD ────────────────────────────────────────────────

  function saveItem() {
    if (!character) return;
    const items = [...character.inventory];
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
    if (!character) return;
    updateField(
      "inventory",
      character.inventory.filter((i) => i.id !== id)
    );
  }

  function toggleEquipped(id: string) {
    if (!character) return;
    const items = character.inventory.map((i) =>
      i.id === id ? { ...i, equipped: !i.equipped } : i
    );
    updateField("inventory", items);
  }

  function adjustQuantity(id: string, delta: number) {
    if (!character) return;
    const items = character.inventory.map((i) =>
      i.id === id
        ? { ...i, quantity: Math.max(0, i.quantity + delta) }
        : i
    );
    updateField("inventory", items.filter((i) => i.quantity > 0));
  }

  // ── Select weapon from dropdown ──────────────────────────────

  function selectWeapon(weaponName: string) {
    const weapon = WEAPON_MAP.get(weaponName);
    if (weapon) {
      setForm({
        ...form,
        name: weapon.name,
        type: "weapon",
        damageDie: weapon.damageDie,
        damageType: weapon.damageType,
        weight: weapon.weight,
      });
    }
  }

  // ── Select armor from dropdown ───────────────────────────────

  function selectArmor(armorName: string) {
    const armor = ARMOR_MAP.get(armorName);
    if (armor) {
      setForm({
        ...form,
        name: armor.name,
        type: "armor",
        acBonus: armor.acBonus,
        weight: armor.weight,
      });
    }
  }

  // ── Select gear from dropdown ────────────────────────────────

  function selectGear(gearName: string) {
    const gear = GEAR_MAP.get(gearName);
    if (gear) {
      setForm({
        ...form,
        name: gear.name,
        type: "gear",
        description: gear.description,
        weight: gear.weight,
      });
    } else {
      setForm({ ...blankItem(), type: "gear" });
    }
  }

  // ── Select potion from dropdown ──────────────────────────────

  function selectPotion(potionName: string) {
    const potion = POTION_MAP.get(potionName);
    if (potion) {
      setForm({
        ...form,
        name: potion.name,
        type: "potion",
        description: potion.description,
        weight: potion.weight,
      });
    } else {
      setForm({ ...blankItem(), type: "potion" });
    }
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
                width: `${Math.min(100, (totalWeight / (maxCarry || 1)) * 100)}%`,
              }}
              data-over={totalWeight > maxCarry ? "true" : undefined}
            />
            <span className="cs-weight__text">
              {totalWeight.toFixed(1)} / {maxCarry} kg
            </span>
          </div>
          <div className="cs-stat-breakdown">
            <span className="cs-stat-breakdown__item">
              STR × 2 = {carryBreakdown.base} kg
            </span>
            {carryBreakdown.raceBonus > 0 && (
              <span className="cs-stat-breakdown__item">
                + {carryBreakdown.raceBonus} kg ({character.race})
              </span>
            )}
            {carryBreakdown.classBonus > 0 && (
              <span className="cs-stat-breakdown__item">
                + {carryBreakdown.classBonus} kg ({character.class})
              </span>
            )}
            <span className="cs-stat-breakdown__item cs-stat-breakdown__item--total">
              = {maxCarry} kg max
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
                {item.type === "weapon" && item.damageDie && (
                  <span className="cs-item__damage">
                    {item.damageDie}
                    {item.damageBonus ? ` + ${item.damageBonus}` : ""}{" "}
                    {item.damageType}
                  </span>
                )}
                {item.type === "armor" && item.acBonus != null && item.acBonus > 0 && (
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
                  {(item.weight * item.quantity).toFixed(1)} kg
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

            {/* Item type selector */}
            <div className="cs-grid cs-grid--2">
              <label className="cs-field">
                <span className="cs-field__label">Item Type</span>
                <select
                  className="cs-field__input"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value as ItemType;
                    setForm({
                      ...blankItem(),
                      type,
                      name: form.name,
                      description: form.description,
                    });
                  }}
                >
                  {CREATABLE_TYPES.map((t) => (
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
            </div>

            {/* ── Weapon type selector ─────────────────────── */}
            {form.type === "weapon" && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">Weapon Type</span>
                  <select
                    className="cs-field__input"
                    value={form.name}
                    onChange={(e) => selectWeapon(e.target.value)}
                  >
                    <option value="">— Select Weapon —</option>
                    {availableWeapons.map((w) => (
                      <option key={w.name} value={w.name}>
                        {w.name} ({w.damageDie} {w.damageType}, {w.weight} kg)
                      </option>
                    ))}
                  </select>
                </label>

                {form.name && WEAPON_MAP.has(form.name) && (
                  <div className="cs-item-preview">
                    <span className="cs-item-preview__desc">
                      {WEAPON_MAP.get(form.name)!.description}
                    </span>
                    <span className="cs-item-preview__stat">
                      Damage: {form.damageDie} {form.damageType}
                    </span>
                    <span className="cs-item-preview__stat">
                      Weight: {form.weight} kg
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Armor type selector ──────────────────────── */}
            {form.type === "armor" && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">Armor Type</span>
                  <select
                    className="cs-field__input"
                    value={form.name}
                    onChange={(e) => selectArmor(e.target.value)}
                  >
                    <option value="">— Select Armor —</option>
                    {availableArmors.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name} (AC +{a.acBonus}, {a.weight} kg)
                      </option>
                    ))}
                  </select>
                </label>

                {form.name && ARMOR_MAP.has(form.name) && (
                  <div className="cs-item-preview">
                    <span className="cs-item-preview__desc">
                      {ARMOR_MAP.get(form.name)!.description}
                    </span>
                    <span className="cs-item-preview__stat">
                      AC Bonus: +{form.acBonus}
                    </span>
                    <span className="cs-item-preview__stat">
                      Weight: {form.weight} kg
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Gear selector ─────────────────────────────── */}
            {form.type === "gear" && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">Gear Type</span>
                  <select
                    className="cs-field__input"
                    value={form.name}
                    onChange={(e) => selectGear(e.target.value)}
                  >
                    <option value="">— Select Gear —</option>
                    {availableGear.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name} ({g.weight} kg)
                      </option>
                    ))}
                  </select>
                </label>

                {form.name && GEAR_MAP.has(form.name) && (
                  <div className="cs-item-preview">
                    <span className="cs-item-preview__desc">
                      {GEAR_MAP.get(form.name)!.description}
                    </span>
                    <span className="cs-item-preview__stat">
                      Weight: {form.weight} kg
                    </span>
                  </div>
                )}

                {availableGear.length === 0 && (
                  <p className="cs-section__hint">
                    No gear available — your class has no tool proficiencies.
                  </p>
                )}
              </div>
            )}

            {/* ── Potion selector ──────────────────────────────── */}
            {form.type === "potion" && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="cs-field">
                  <span className="cs-field__label">Potion Type</span>
                  <select
                    className="cs-field__input"
                    value={form.name}
                    onChange={(e) => selectPotion(e.target.value)}
                  >
                    <option value="">— Select Potion —</option>
                    {availablePotions.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.weight} kg)
                      </option>
                    ))}
                  </select>
                </label>

                {form.name && POTION_MAP.has(form.name) && (
                  <div className="cs-item-preview">
                    <span className="cs-item-preview__desc">
                      {POTION_MAP.get(form.name)!.description}
                    </span>
                    <span className="cs-item-preview__stat">
                      Weight: {form.weight} kg
                    </span>
                  </div>
                )}

                {availablePotions.length === 0 && (
                  <p className="cs-section__hint">
                    No potions available — your class has no relevant tool proficiencies.
                  </p>
                )}
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