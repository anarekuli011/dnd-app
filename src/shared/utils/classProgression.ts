// ══════════════════════════════════════════════════════════════════
// Class & Race Progression Engine
// ══════════════════════════════════════════════════════════════════
//
// Ability scores are fully deterministic:
//   total = BASE + raceBonuses + classGrowth(level)
//
// Players cannot manually adjust ability scores.
// ══════════════════════════════════════════════════════════════════

import type { AbilityName, AbilityScores, DieType, SpellSchool, Spell } from "@shared/types/dnd";
import { ABILITY_NAMES, DIE_MAX } from "@shared/types/dnd";

// ── Base score for all abilities ─────────────────────────────────

const BASE_SCORE = 10;

// ══════════════════════════════════════════════════════════════════
// Race Definitions
// ══════════════════════════════════════════════════════════════════

export interface RaceDef {
  name: string;
  description: string;
  bonuses: Partial<Record<AbilityName, number>>;
  speed: number;
  languages: string[];
  bonusSlots: Partial<Record<number, number>>;
  carryBonus: number;
  bonusSavingThrow?: AbilityName;
  /** Levels at which this race learns an additional language (via CHOOSE: dropdown) */
  bonusLanguageLevels?: number[];
}

export const RACES: RaceDef[] = [
  {
    name: "Human",
    description:
      "Versatile and ambitious, humans adapt to any role and thrive through sheer determination and resourcefulness.",
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    languages: ["Common", "CHOOSE:language"],
    bonusSlots: { 1: 1 },
    carryBonus: 15,
    bonusLanguageLevels: [8, 16],
  },
  {
    name: "Elf",
    description:
      "Graceful and long-lived, elves possess keen senses, natural affinity for magic, and an unearthly elegance.",
    bonuses: { dexterity: 2, intelligence: 1, wisdom: 1 },
    speed: 35,
    languages: ["Common", "Elvish"],
    bonusSlots: { 1: 1 },
    carryBonus: 5,
    bonusSavingThrow: "dexterity",
  },
  {
    name: "Dwarf",
    description:
      "Stout and resilient, dwarves are master craftsmen and fierce warriors forged in mountain strongholds.",
    bonuses: { constitution: 2, strength: 1, wisdom: 1 },
    speed: 25,
    languages: ["Common", "Dwarvish"],
    bonusSlots: {},
    carryBonus: 25,
    bonusSavingThrow: "constitution",
  },
  {
    name: "Orc",
    description:
      "Powerful and relentless, orcs channel primal fury into raw combat strength and unwavering endurance.",
    bonuses: { strength: 2, constitution: 2 },
    speed: 30,
    languages: ["Common", "Orcish"],
    bonusSlots: {},
    carryBonus: 30,
    bonusSavingThrow: "strength",
  },
  {
    name: "Goblin",
    description:
      "Small but cunning, goblins survive through wit, speed, and a knack for turning chaos to their advantage.",
    bonuses: { dexterity: 2, charisma: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Goblin"],
    bonusSlots: { 1: 1 },
    carryBonus: 5,
    bonusSavingThrow: "dexterity",
  },
  {
    name: "Demon",
    description:
      "Born of infernal planes, demons wield dark power and resist fire, carrying an aura of dread wherever they go.",
    bonuses: { charisma: 2, strength: 1, intelligence: 1 },
    speed: 30,
    languages: ["Common", "Infernal"],
    bonusSlots: { 2: 1 },
    carryBonus: 20,
    bonusSavingThrow: "charisma",
  },
  {
    name: "Angel",
    description:
      "Celestial beings touched by divine light, angels radiate holy energy and inspire courage in their allies.",
    bonuses: { wisdom: 2, charisma: 1, constitution: 1 },
    speed: 35,
    languages: ["Common", "Celestial"],
    bonusSlots: { 2: 1 },
    carryBonus: 10,
    bonusSavingThrow: "wisdom",
  },
];

export const RACE_MAP = new Map(RACES.map((r) => [r.name, r]));

// ══════════════════════════════════════════════════════════════════
// Class Definitions
// ══════════════════════════════════════════════════════════════════

export interface ClassGrowth {
  /** +1 every 2 levels  → +10 at level 20 */
  primary: AbilityName;
  /** +1 every 3 levels  → +6 at level 20 */
  secondary: AbilityName;
  /** +1 every 5 levels  → +4 at level 20 */
  tertiary: AbilityName;
}

export interface ClassDef {
  name: string;
  description: string;
  growth: ClassGrowth;
  hitDie: DieType;
  armorProfile: "heavy" | "medium" | "light" | "unarmored";
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  spellcastingAbility: AbilityName;
  allowedSchools: SpellSchool[];
  /** full = slots at Lv1 up to Lv9, half = slots at Lv2 up to Lv5, third = slots at Lv3 up to Lv3 */
  casterType: "full" | "half" | "third";
  carryBonus: number;
  /** Default spells the class starts with (0-2). Full Spell objects minus id. */
  starterSpells: Omit<Spell, "id">[];
  /** Which ability saves this class is proficient in */
  savingThrows: AbilityName[];
}

export const CLASSES: ClassDef[] = [
  {
    name: "Rogue",
    description:
      "A stealthy trickster who uses cunning and agility to overcome obstacles and outmanoeuvre foes.",
    growth: { primary: "dexterity", secondary: "intelligence", tertiary: "charisma" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Hand Crossbow", "Rapier"],
    toolProficiencies: ["Thieves' Tools"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["shadowcraft", "illusion", "enchantment"],
    casterType: "third",
    carryBonus: 10,
    starterSpells: [
      { name: "Shadow Step", level: 0, school: "shadowcraft", castingTime: "1 bonus action", range: "Self", components: "S", duration: "1 round", description: "You briefly meld into the shadows, allowing you to move 10 feet without provoking opportunity attacks.", prepared: true },
    ],
    savingThrows: ["dexterity", "intelligence"],
  },
  {
    name: "Archer",
    description:
      "A sharpshooter who masters ranged combat, raining precise death from a distance.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Longbow", "Shortbow", "Hand Crossbow"],
    toolProficiencies: ["Fletcher's Tools"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "divination", "evocation"],
    casterType: "half",
    carryBonus: 10,
    starterSpells: [
      { name: "Hunter's Mark", level: 0, school: "primal", castingTime: "1 bonus action", range: "90 feet", components: "V", duration: "1 hour", description: "You mark a creature as your quarry. Your ranged attacks against the target deal an extra d4 damage.", prepared: true },
    ],
    savingThrows: ["dexterity", "wisdom"],
  },
  {
    name: "Wizard",
    description:
      "A scholarly spellcaster who wields arcane magic drawn from years of intense study.",
    growth: { primary: "intelligence", secondary: "wisdom", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Light Crossbow"],
    toolProficiencies: ["Arcane Focus"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["evocation", "abjuration", "conjuration", "divination", "transmutation"],
    casterType: "full",
    carryBonus: 0,
    starterSpells: [
      { name: "Fire Bolt", level: 0, school: "evocation", castingTime: "1 action", range: "120 feet", components: "V, S", duration: "Instantaneous", description: "You hurl a ball of fire at a target. Make a spell attack roll — on a hit, the target takes d10 fire damage.", prepared: true },
      { name: "Mage Armor", level: 1, school: "abjuration", castingTime: "1 action", range: "Touch", components: "V, S, M", duration: "8 hours", description: "A protective magical force surrounds you or a willing creature, setting their base AC to 13 + DEX modifier.", prepared: true },
    ],
    savingThrows: ["intelligence", "wisdom"],
  },
  {
    name: "Priest",
    description:
      "A divine healer and protector, channelling holy power to mend wounds and shield allies.",
    growth: { primary: "wisdom", secondary: "charisma", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Mace"],
    toolProficiencies: ["Holy Symbol", "Herbalism Kit"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["divine", "abjuration", "necromancy", "divination"],
    casterType: "half",
    carryBonus: 10,
    starterSpells: [
      { name: "Sacred Flame", level: 0, school: "divine", castingTime: "1 action", range: "60 feet", components: "V, S", duration: "Instantaneous", description: "A radiant beam descends on a creature. The target must make a DEX save or take d8 radiant damage.", prepared: true },
      { name: "Cure Wounds", level: 1, school: "divine", castingTime: "1 action", range: "Touch", components: "V, S", duration: "Instantaneous", description: "You touch a creature and channel divine energy, restoring d8 + spellcasting modifier hit points.", prepared: true },
    ],
    savingThrows: ["wisdom", "charisma"],
  },
  {
    name: "Warrior",
    description:
      "A battle-hardened fighter who relies on raw strength and martial prowess.",
    growth: { primary: "strength", secondary: "constitution", tertiary: "dexterity" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: [],
    spellcastingAbility: "strength",
    allowedSchools: ["battlecraft", "evocation"],
    casterType: "third",
    carryBonus: 30,
    starterSpells: [
      { name: "Battle Cry", level: 0, school: "battlecraft", castingTime: "1 bonus action", range: "Self (30-foot radius)", components: "V", duration: "1 round", description: "You let out a thundering war cry. Allies within range gain advantage on their next attack roll.", prepared: true },
    ],
    savingThrows: ["strength", "constitution"],
  },
  {
    name: "Knight",
    description:
      "An armoured champion bound by a code of honour, excelling in mounted and melee combat.",
    growth: { primary: "strength", secondary: "constitution", tertiary: "charisma" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "Lance"],
    toolProficiencies: ["Mount Handling Kit"],
    spellcastingAbility: "charisma",
    allowedSchools: ["battlecraft", "divine", "abjuration"],
    casterType: "third",
    carryBonus: 25,
    starterSpells: [
      { name: "Shield of Faith", level: 0, school: "divine", castingTime: "1 bonus action", range: "Self", components: "V, S", duration: "1 minute", description: "A shimmering field of divine energy surrounds you, granting +2 AC for the duration.", prepared: true },
    ],
    savingThrows: ["strength", "charisma"],
  },
  {
    name: "Paladin",
    description:
      "A holy warrior who combines martial skill with divine magic to smite evil.",
    growth: { primary: "strength", secondary: "charisma", tertiary: "constitution" },
    hitDie: "d12",
    armorProfile: "heavy",
    armorProficiencies: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons"],
    toolProficiencies: ["Holy Symbol"],
    spellcastingAbility: "charisma",
    allowedSchools: ["divine", "abjuration", "evocation"],
    casterType: "half",
    carryBonus: 25,
    starterSpells: [
      { name: "Divine Smite", level: 0, school: "divine", castingTime: "Part of attack", range: "Melee", components: "V", duration: "Instantaneous", description: "When you hit with a melee attack, you channel holy energy through your weapon, dealing an extra d8 radiant damage.", prepared: true },
    ],
    savingThrows: ["strength", "charisma"],
  },
  {
    name: "Assassin",
    description:
      "A deadly shadow operative who eliminates targets with precision and lethal efficiency.",
    growth: { primary: "dexterity", secondary: "intelligence", tertiary: "strength" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Dagger", "Blowgun", "Hand Crossbow"],
    toolProficiencies: ["Poisoner's Kit", "Thieves' Tools"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["shadowcraft", "necromancy", "illusion"],
    casterType: "third",
    carryBonus: 10,
    starterSpells: [
      { name: "Poison Strike", level: 0, school: "shadowcraft", castingTime: "1 bonus action", range: "Self", components: "S, M", duration: "1 minute", description: "You coat your weapon in a quick-acting toxin. Your next attack deals an extra d6 poison damage.", prepared: true },
    ],
    savingThrows: ["dexterity", "intelligence"],
  },
  {
    name: "Necromancer",
    description:
      "A dark mage who commands the forces of death, raising undead servants to do their bidding.",
    growth: { primary: "intelligence", secondary: "wisdom", tertiary: "charisma" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Sickle"],
    toolProficiencies: ["Arcane Focus", "Alchemist's Supplies"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["necromancy", "conjuration", "divination", "enchantment"],
    casterType: "full",
    carryBonus: 0,
    starterSpells: [
      { name: "Chill Touch", level: 0, school: "necromancy", castingTime: "1 action", range: "120 feet", components: "V, S", duration: "1 round", description: "A ghostly skeletal hand reaches toward a creature. On a hit, it takes d8 necrotic damage and cannot regain HP until your next turn.", prepared: true },
      { name: "False Life", level: 1, school: "necromancy", castingTime: "1 action", range: "Self", components: "V, S, M", duration: "1 hour", description: "You draw on dark energy to bolster yourself, gaining d4 + 4 temporary hit points.", prepared: true },
    ],
    savingThrows: ["intelligence", "wisdom"],
  },
  {
    name: "Huntress",
    description:
      "A swift wilderness tracker who blends primal instincts with deadly combat skills.",
    growth: { primary: "dexterity", secondary: "wisdom", tertiary: "strength" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Longbow", "Shortsword", "Spear"],
    toolProficiencies: ["Herbalism Kit", "Trapper's Kit"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "divination", "transmutation"],
    casterType: "half",
    carryBonus: 15,
    starterSpells: [
      { name: "Nature's Whisper", level: 0, school: "primal", castingTime: "1 action", range: "Self", components: "V, S", duration: "10 minutes", description: "You attune to the natural world around you, gaining advantage on Perception and Survival checks for the duration.", prepared: true },
    ],
    savingThrows: ["dexterity", "wisdom"],
  },
  {
    name: "Mystic",
    description:
      "A psionically gifted adept who bends reality through sheer force of will.",
    growth: { primary: "wisdom", secondary: "intelligence", tertiary: "charisma" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff"],
    toolProficiencies: ["Psionic Focus"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["divination", "enchantment", "transmutation", "abjuration"],
    casterType: "full",
    carryBonus: 0,
    starterSpells: [
      { name: "Mind Spike", level: 0, school: "divination", castingTime: "1 action", range: "60 feet", components: "S", duration: "Instantaneous", description: "You drive a psychic lance into a creature's mind. The target takes d6 psychic damage and you learn its location for 1 round.", prepared: true },
      { name: "Thought Shield", level: 0, school: "abjuration", castingTime: "1 reaction", range: "Self", components: "S", duration: "1 round", description: "When targeted by a mental effect, you erect a psychic barrier granting advantage on the saving throw.", prepared: true },
    ],
    savingThrows: ["wisdom", "intelligence"],
  },
  {
    name: "Trickster",
    description:
      "A chaotic illusionist who deceives enemies and warps perception to gain the upper hand.",
    growth: { primary: "charisma", secondary: "dexterity", tertiary: "intelligence" },
    hitDie: "d6",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Hand Crossbow", "Rapier"],
    toolProficiencies: ["Disguise Kit", "Forgery Kit"],
    spellcastingAbility: "charisma",
    allowedSchools: ["illusion", "enchantment", "shadowcraft"],
    casterType: "half",
    carryBonus: 5,
    starterSpells: [
      { name: "Minor Illusion", level: 0, school: "illusion", castingTime: "1 action", range: "30 feet", components: "S, M", duration: "1 minute", description: "You create a sound or image of an object that lasts for the duration. Creatures can make an Investigation check to see through it.", prepared: true },
    ],
    savingThrows: ["charisma", "dexterity"],
  },
  {
    name: "Sorcerer",
    description:
      "A natural-born spellcaster whose innate magical bloodline fuels devastating power.",
    growth: { primary: "charisma", secondary: "intelligence", tertiary: "constitution" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff", "Light Crossbow"],
    toolProficiencies: ["Arcane Focus"],
    spellcastingAbility: "charisma",
    allowedSchools: ["evocation", "enchantment", "transmutation", "conjuration"],
    casterType: "full",
    carryBonus: 0,
    starterSpells: [
      { name: "Arcane Surge", level: 0, school: "evocation", castingTime: "1 action", range: "120 feet", components: "V, S", duration: "Instantaneous", description: "Raw magical energy erupts from your hands in a bolt of force. The target takes d10 force damage on a hit.", prepared: true },
      { name: "Magic Missile", level: 1, school: "evocation", castingTime: "1 action", range: "120 feet", components: "V, S", duration: "Instantaneous", description: "Three glowing darts of force unerringly strike targets of your choice, each dealing d4 + 1 force damage.", prepared: true },
    ],
    savingThrows: ["charisma", "constitution"],
  },
  {
    name: "Ninja",
    description:
      "A disciplined shadow warrior combining martial arts, stealth, and surprise attacks.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Shortsword", "Nunchaku", "Shuriken"],
    toolProficiencies: ["Thieves' Tools", "Poisoner's Kit"],
    spellcastingAbility: "dexterity",
    allowedSchools: ["shadowcraft", "illusion"],
    casterType: "third",
    carryBonus: 10,
    starterSpells: [
      { name: "Shadow Cloak", level: 0, school: "shadowcraft", castingTime: "1 bonus action", range: "Self", components: "S", duration: "1 round", description: "Shadows wrap around your form, granting you advantage on your next Stealth check and making you heavily obscured in dim light.", prepared: true },
    ],
    savingThrows: ["dexterity", "strength"],
  },
  {
    name: "Samurai",
    description:
      "A noble swordmaster who channels unwavering focus and discipline into devastating strikes.",
    growth: { primary: "strength", secondary: "dexterity", tertiary: "wisdom" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "Katana"],
    toolProficiencies: ["Calligrapher's Supplies"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["battlecraft", "divination"],
    casterType: "third",
    carryBonus: 20,
    starterSpells: [
      { name: "Focused Strike", level: 0, school: "battlecraft", castingTime: "Part of attack", range: "Melee", components: "V", duration: "Instantaneous", description: "You centre your focus into a single devastating blow. Your next melee attack roll gains +2 and deals an extra d4 damage.", prepared: true },
    ],
    savingThrows: ["strength", "wisdom"],
  },
  {
    name: "Bard",
    description:
      "A charismatic performer who weaves magic through music, inspiring allies and beguiling foes.",
    growth: { primary: "charisma", secondary: "dexterity", tertiary: "wisdom" },
    hitDie: "d8",
    armorProfile: "light",
    armorProficiencies: ["Light Armor"],
    weaponProficiencies: ["Simple Weapons", "Rapier", "Shortsword", "Hand Crossbow"],
    toolProficiencies: ["Three Musical Instruments"],
    spellcastingAbility: "charisma",
    allowedSchools: ["enchantment", "illusion", "divination"],
    casterType: "half",
    carryBonus: 5,
    starterSpells: [
      { name: "Vicious Mockery", level: 0, school: "enchantment", castingTime: "1 action", range: "60 feet", components: "V", duration: "Instantaneous", description: "You unleash a string of cutting insults laced with magic. The target takes d4 psychic damage and has disadvantage on its next attack.", prepared: true },
      { name: "Healing Word", level: 1, school: "enchantment", castingTime: "1 bonus action", range: "60 feet", components: "V", duration: "Instantaneous", description: "You speak a word of magical encouragement. A creature you can see regains d4 + spellcasting modifier hit points.", prepared: true },
    ],
    savingThrows: ["charisma", "dexterity"],
  },
  {
    name: "Summoner",
    description:
      "A conjurer who calls forth creatures and elemental forces to fight alongside them.",
    growth: { primary: "intelligence", secondary: "charisma", tertiary: "wisdom" },
    hitDie: "d6",
    armorProfile: "unarmored",
    armorProficiencies: [],
    weaponProficiencies: ["Dagger", "Quarterstaff"],
    toolProficiencies: ["Arcane Focus", "Summoning Circle Kit"],
    spellcastingAbility: "intelligence",
    allowedSchools: ["conjuration", "transmutation", "divination", "abjuration"],
    casterType: "full",
    carryBonus: 0,
    starterSpells: [
      { name: "Conjure Spark", level: 0, school: "conjuration", castingTime: "1 action", range: "60 feet", components: "V, S", duration: "1 round", description: "You conjure a tiny elemental spark that darts toward a target, dealing d6 fire, cold, or lightning damage (your choice).", prepared: true },
      { name: "Find Familiar", level: 1, school: "conjuration", castingTime: "1 hour", range: "10 feet", components: "V, S, M", duration: "Until dispelled", description: "You summon a spirit that takes the form of a small creature. It obeys your commands and can scout, deliver touch spells, and aid you.", prepared: true },
    ],
    savingThrows: ["intelligence", "charisma"],
  },
  {
    name: "Kensei",
    description:
      "A weapon master who achieves supernatural perfection through lifelong devotion to a single blade.",
    growth: { primary: "dexterity", secondary: "strength", tertiary: "constitution" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor"],
    weaponProficiencies: ["Simple Weapons", "Martial Weapons", "CHOOSE:weapon"],
    toolProficiencies: ["Calligrapher's Supplies", "Artisan's Tools"],
    spellcastingAbility: "dexterity",
    allowedSchools: ["battlecraft", "transmutation"],
    casterType: "third",
    carryBonus: 15,
    starterSpells: [
      { name: "Blade Ward", level: 0, school: "battlecraft", castingTime: "1 bonus action", range: "Self", components: "V, S", duration: "1 round", description: "You trace protective sigils in the air with your blade. Until your next turn, you have resistance to bludgeoning, piercing, and slashing damage.", prepared: true },
    ],
    savingThrows: ["dexterity", "constitution"],
  },
  {
    name: "Druid",
    description:
      "A guardian of nature who shapeshifts and commands the primal forces of the wild.",
    growth: { primary: "wisdom", secondary: "constitution", tertiary: "intelligence" },
    hitDie: "d10",
    armorProfile: "medium",
    armorProficiencies: ["Light Armor", "Medium Armor (non-metal)", "Shields (non-metal)"],
    weaponProficiencies: ["Club", "Dagger", "Quarterstaff", "Scimitar", "Sickle", "Spear"],
    toolProficiencies: ["Herbalism Kit", "Druidic Focus"],
    spellcastingAbility: "wisdom",
    allowedSchools: ["primal", "transmutation", "conjuration", "divination"],
    casterType: "half",
    carryBonus: 15,
    starterSpells: [
      { name: "Druidcraft", level: 0, school: "primal", castingTime: "1 action", range: "30 feet", components: "V, S", duration: "Instantaneous", description: "You create a tiny natural effect — predict weather, bloom a flower, summon a harmless sensory effect, or light/snuff a small flame.", prepared: true },
      { name: "Goodberry", level: 1, school: "transmutation", castingTime: "1 action", range: "Touch", components: "V, S, M", duration: "24 hours", description: "You create 10 magical berries. Each berry restores 1 HP when consumed and provides enough nourishment for a full day.", prepared: true },
    ],
    savingThrows: ["wisdom", "constitution"],
  },
];

export const CLASS_MAP = new Map(CLASSES.map((c) => [c.name, c]));

// ══════════════════════════════════════════════════════════════════
// Ability Score Computation
// ══════════════════════════════════════════════════════════════════

/**
 * Computes the class-based growth bonus for a single ability at
 * the given level.
 *
 *   primary   → +1 every 2 levels  (Lv 2,4,6,…,20  = +10 at 20)
 *   secondary → +1 every 3 levels  (Lv 3,6,9,…,18  = +6 at 20)
 *   tertiary  → +1 every 5 levels  (Lv 5,10,15,20   = +4 at 20)
 */
function classGrowthForAbility(
  growth: ClassGrowth,
  ability: AbilityName,
  level: number
): number {
  if (ability === growth.primary) return Math.floor(level / 2);
  if (ability === growth.secondary) return Math.floor(level / 3);
  if (ability === growth.tertiary) return Math.floor(level / 5);
  return 0;
}

/**
 * Computes the full ability scores for a character given their
 * race, class, and level.
 *
 * Returns the default base scores (all 10) if race or class
 * is not yet selected.
 */
export function computeAbilityScores(
  raceName: string,
  className: string,
  level: number
): AbilityScores {
  const scores = {} as AbilityScores;

  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  for (const ability of ABILITY_NAMES) {
    let total = BASE_SCORE;

    // Add race bonus
    if (race) {
      total += race.bonuses[ability] ?? 0;
    }

    // Add class growth
    if (cls) {
      total += classGrowthForAbility(cls.growth, ability, level);
    }

    scores[ability] = total;
  }

  return scores;
}

// ══════════════════════════════════════════════════════════════════
// Breakdown (for UI tooltips / display)
// ══════════════════════════════════════════════════════════════════

export interface AbilityBreakdown {
  base: number;
  raceBonus: number;
  classGrowth: number;
  total: number;
  growthLabel: "primary" | "secondary" | "tertiary" | null;
}

/**
 * Returns a per-ability breakdown showing where each point comes from.
 */
export function abilityScoreBreakdown(
  raceName: string,
  className: string,
  level: number
): Record<AbilityName, AbilityBreakdown> {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const result = {} as Record<AbilityName, AbilityBreakdown>;

  for (const ability of ABILITY_NAMES) {
    const raceBonus = race ? (race.bonuses[ability] ?? 0) : 0;
    const classGrowth = cls
      ? classGrowthForAbility(cls.growth, ability, level)
      : 0;

    let growthLabel: "primary" | "secondary" | "tertiary" | null = null;
    if (cls) {
      if (ability === cls.growth.primary) growthLabel = "primary";
      else if (ability === cls.growth.secondary) growthLabel = "secondary";
      else if (ability === cls.growth.tertiary) growthLabel = "tertiary";
    }

    result[ability] = {
      base: BASE_SCORE,
      raceBonus,
      classGrowth,
      total: BASE_SCORE + raceBonus + classGrowth,
      growthLabel,
    };
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════
// Combat Stats Computation
// ══════════════════════════════════════════════════════════════════

// ── Armor profile constants ──────────────────────────────────────

const ARMOR_PROFILES = {
  heavy:     { baseAC: 16, maxDex: 0,    label: "Heavy Armor" },
  medium:    { baseAC: 14, maxDex: 2,    label: "Medium Armor" },
  light:     { baseAC: 12, maxDex: null, label: "Light Armor" },
  unarmored: { baseAC: 10, maxDex: null, label: "Unarmored" },
} as const;

export { ARMOR_PROFILES };

// ── Speed ────────────────────────────────────────────────────────

export function computeSpeed(raceName: string): number {
  const race = RACE_MAP.get(raceName);
  return race?.speed ?? 30;
}

// ── Initiative ───────────────────────────────────────────────────

export function computeInitiative(dexScore: number): number {
  return Math.floor((dexScore - 10) / 2);
}

// ── Armor Class ──────────────────────────────────────────────────

export interface ACBreakdown {
  baseAC: number;
  dexBonus: number;
  armorBonus: number;
  shieldBonus: number;
  total: number;
  profileLabel: string;
}

/**
 * Computes AC from class armor profile + DEX + equipped items.
 * Equipped armor with acBonus replaces the class base AC.
 * Equipped shields (armor type items with "shield" in name) stack.
 */
export function computeAC(
  className: string,
  dexScore: number,
  equippedItems: { acBonus?: number; name: string; type: string }[]
): ACBreakdown {
  const cls = CLASS_MAP.get(className);
  const profile = cls
    ? ARMOR_PROFILES[cls.armorProfile]
    : ARMOR_PROFILES.unarmored;

  const dexMod = Math.floor((dexScore - 10) / 2);
  const dexBonus =
    profile.maxDex !== null ? Math.min(dexMod, profile.maxDex) : dexMod;

  // Check for equipped armor / shields
  let armorBonus = 0;
  let shieldBonus = 0;

  for (const item of equippedItems) {
    if (!item.acBonus || item.acBonus <= 0) continue;
    const isShield = item.name.toLowerCase().includes("shield");
    if (isShield) {
      shieldBonus += item.acBonus;
    } else {
      armorBonus = Math.max(armorBonus, item.acBonus);
    }
  }

  return {
    baseAC: profile.baseAC,
    dexBonus,
    armorBonus,
    shieldBonus,
    total: profile.baseAC + dexBonus + armorBonus + shieldBonus,
    profileLabel: profile.label,
  };
}

// ── Hit Points ───────────────────────────────────────────────────

export interface HPBreakdown {
  hitDie: DieType;
  hitDieMax: number;
  avgRoll: number;
  conModPerLevel: number;
  maxHP: number;
  formula: string;
}

/**
 * Computes max HP using standard rules:
 *   Level 1 → hit die max + CON modifier
 *   Each level after → average roll (ceil(dieMax/2)+1) + CON modifier
 *
 * Minimum max HP is always 1.
 */
export function computeMaxHP(
  className: string,
  level: number,
  conScore: number
): HPBreakdown {
  const cls = CLASS_MAP.get(className);
  const hitDie: DieType = cls?.hitDie ?? "d8";
  const hitDieMax = DIE_MAX[hitDie];
  const avgRoll = Math.ceil(hitDieMax / 2) + 1;
  const conMod = Math.floor((conScore - 10) / 2);

  const lvl1HP = hitDieMax + conMod;
  const restHP = (level - 1) * (avgRoll + conMod);
  const maxHP = Math.max(1, lvl1HP + restHP);

  const formula =
    level === 1
      ? `${hitDieMax} (${hitDie} max) + ${conMod} (CON)`
      : `${hitDieMax} + ${level - 1}×${avgRoll} (avg ${hitDie}) + ${level}×${conMod} (CON)`;

  return {
    hitDie,
    hitDieMax,
    avgRoll,
    conModPerLevel: conMod,
    maxHP,
    formula,
  };
}

// ── Hit Dice ─────────────────────────────────────────────────────

export function computeHitDice(
  className: string,
  level: number
): { dieType: DieType; total: number } {
  const cls = CLASS_MAP.get(className);
  return {
    dieType: cls?.hitDie ?? "d8",
    total: level,
  };
}

// ══════════════════════════════════════════════════════════════════
// Proficiency Choices
// ══════════════════════════════════════════════════════════════════

/** Available options for each CHOOSE: category */
export const PROFICIENCY_CHOICES: Record<string, string[]> = {
  language: [
    "Elvish",
    "Dwarvish",
    "Orcish",
    "Goblin",
    "Infernal",
    "Celestial",
    "Draconic",
    "Sylvan",
    "Primordial",
    "Abyssal",
    "Deep Speech",
    "Giant",
    "Gnomish",
    "Halfling",
    "Undercommon",
  ],
  weapon: [
    "Longsword",
    "Greatsword",
    "Scimitar",
    "Rapier",
    "Battleaxe",
    "Warhammer",
    "Halberd",
    "Glaive",
    "Flail",
    "Morningstar",
    "War Pick",
    "Trident",
    "Whip",
    "Longbow",
  ],
};

/**
 * Returns the CHOOSE: category from a marker string.
 * e.g. "CHOOSE:language" → "language"
 */
/**
 * Returns the CHOOSE: category from a marker string.
 * e.g. "CHOOSE:language" → "language"
 * e.g. "CHOOSE:language_lv8" → "language"
 * e.g. "CHOOSE:weapon" → "weapon"
 */
export function parseChoiceMarker(item: string): string | null {
  if (!item.startsWith("CHOOSE:")) return null;
  const raw = item.slice(7);
  // Strip _lvXX suffix to get the base category
  return raw.replace(/_lv\d+$/, "");
}

// ══════════════════════════════════════════════════════════════════
// Proficiency Computation
// ══════════════════════════════════════════════════════════════════

export interface ComputedProficiencies {
  languages: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
}

/**
 * Computes all proficiencies by merging race (languages)
 * and class (armor, weapon, tool) contributions.
 *
 * `choices` is a map of "CHOOSE:category" → selected value.
 * Unresolved choices stay as "CHOOSE:xxx" markers.
 */
export function computeProficiencies(
  raceName: string,
  className: string,
  choices: Record<string, string> = {},
  level: number = 1
): ComputedProficiencies {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const resolve = (items: string[]): string[] =>
    items.map((item) => {
      if (item.startsWith("CHOOSE:")) {
        const selected = choices[item];
        return selected || item; // keep marker if unresolved
      }
      return item;
    });

  // Base languages + level-gated bonus languages
  const langSources = [...(race?.languages ?? ["Common"])];
  if (race?.bonusLanguageLevels) {
    for (const lvl of race.bonusLanguageLevels) {
      if (level >= lvl) {
        langSources.push(`CHOOSE:language_lv${lvl}`);
      }
    }
  }

  const languages = resolve(langSources);
  const armor = resolve([...(cls?.armorProficiencies ?? [])]);
  const weapons = resolve([...(cls?.weaponProficiencies ?? [])]);
  const tools = resolve([...(cls?.toolProficiencies ?? [])]);

  // Deduplicate (but keep CHOOSE: markers)
  const dedup = (arr: string[]) => [...new Set(arr)].sort((a, b) => {
    // Sort CHOOSE: items to the end
    const aIsChoice = a.startsWith("CHOOSE:");
    const bIsChoice = b.startsWith("CHOOSE:");
    if (aIsChoice && !bIsChoice) return 1;
    if (!aIsChoice && bIsChoice) return -1;
    return a.localeCompare(b);
  });

  return {
    languages: dedup(languages),
    armorProficiencies: dedup(armor),
    weaponProficiencies: dedup(weapons),
    toolProficiencies: dedup(tools),
  };
}

/**
 * Scans all proficiency arrays from race + class and returns
 * the list of CHOOSE: markers that need resolution.
 */
export function getUnresolvedChoices(
  raceName: string,
  className: string,
  level: number = 1
): string[] {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const all = [
    ...(race?.languages ?? []),
    ...(cls?.armorProficiencies ?? []),
    ...(cls?.weaponProficiencies ?? []),
    ...(cls?.toolProficiencies ?? []),
  ];

  // Add level-gated language choices
  if (race?.bonusLanguageLevels) {
    for (const lvl of race.bonusLanguageLevels) {
      if (level >= lvl) {
        all.push(`CHOOSE:language_lv${lvl}`);
      }
    }
  }

  return all.filter((item) => item.startsWith("CHOOSE:"));
}

// ══════════════════════════════════════════════════════════════════
// Spellcasting
// ══════════════════════════════════════════════════════════════════

/**
 * Returns the spellcasting ability for a class, or undefined if
 * the class is not recognised.
 */
export function computeSpellcastingAbility(
  className: string
): AbilityName | undefined {
  const cls = CLASS_MAP.get(className);
  return cls?.spellcastingAbility;
}

// ══════════════════════════════════════════════════════════════════
// Spell Slot Progression
// ══════════════════════════════════════════════════════════════════

/**
 * Spell slot tables by caster type.
 * Key = character level (1–20), value = array of slots [lv1, lv2, ..., lv9].
 */

const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
};

const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [2,0,0,0,0,0,0,0,0],
  3:  [3,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [4,2,0,0,0,0,0,0,0],
  6:  [4,2,0,0,0,0,0,0,0],
  7:  [4,3,0,0,0,0,0,0,0],
  8:  [4,3,0,0,0,0,0,0,0],
  9:  [4,3,2,0,0,0,0,0,0],
  10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0],
  12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0],
  14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,2,0,0,0,0,0],
  16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0],
  18: [4,3,3,3,1,0,0,0,0],
  19: [4,3,3,3,2,0,0,0,0],
  20: [4,3,3,3,2,0,0,0,0],
};

const THIRD_CASTER_SLOTS: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [0,0,0,0,0,0,0,0,0],
  3:  [2,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [3,0,0,0,0,0,0,0,0],
  6:  [3,0,0,0,0,0,0,0,0],
  7:  [4,2,0,0,0,0,0,0,0],
  8:  [4,2,0,0,0,0,0,0,0],
  9:  [4,2,0,0,0,0,0,0,0],
  10: [4,3,0,0,0,0,0,0,0],
  11: [4,3,0,0,0,0,0,0,0],
  12: [4,3,0,0,0,0,0,0,0],
  13: [4,3,2,0,0,0,0,0,0],
  14: [4,3,2,0,0,0,0,0,0],
  15: [4,3,2,0,0,0,0,0,0],
  16: [4,3,3,0,0,0,0,0,0],
  17: [4,3,3,0,0,0,0,0,0],
  18: [4,3,3,0,0,0,0,0,0],
  19: [4,3,3,0,0,0,0,0,0],
  20: [4,3,3,0,0,0,0,0,0],
};

const SLOT_TABLES: Record<string, Record<number, number[]>> = {
  full: FULL_CASTER_SLOTS,
  half: HALF_CASTER_SLOTS,
  third: THIRD_CASTER_SLOTS,
};

export interface SpellSlotProgression {
  /** Max slots per spell level (index 0 = level 1, index 8 = level 9) */
  slots: number[];
  /** Highest spell level this character has access to */
  maxSpellLevel: number;
  /** Caster type label for display */
  casterLabel: string;
  /** Per-level breakdown: base from class + bonus from race */
  breakdown: { base: number; raceBonus: number; total: number }[];
}

/**
 * Computes the spell slot progression for a character.
 * Base slots come from the class's caster type table.
 * Race bonuses stack on top (only if the character has
 * access to that spell level already, or the bonus is for level 1).
 */
export function computeSpellSlots(
  className: string,
  raceName: string,
  level: number
): SpellSlotProgression {
  const cls = CLASS_MAP.get(className);
  const race = RACE_MAP.get(raceName);

  const casterType = cls?.casterType ?? "third";
  const table = SLOT_TABLES[casterType];
  const baseSlots = table[Math.min(Math.max(level, 1), 20)] ?? [0,0,0,0,0,0,0,0,0];

  const raceBonuses = race?.bonusSlots ?? {};

  const breakdown: SpellSlotProgression["breakdown"] = [];
  const finalSlots: number[] = [];
  let maxSpellLevel = 0;

  for (let i = 0; i < 9; i++) {
    const spellLevel = i + 1;
    const base = baseSlots[i];
    const raceBonus = raceBonuses[spellLevel] ?? 0;
    // Only apply race bonus if character has base slots OR it's level 1
    const applicableBonus = (base > 0 || spellLevel === 1) ? raceBonus : 0;
    const total = base + applicableBonus;

    finalSlots.push(total);
    breakdown.push({ base, raceBonus: applicableBonus, total });

    if (total > 0) maxSpellLevel = spellLevel;
  }

  const casterLabels: Record<string, string> = {
    full: "Full Caster",
    half: "Half Caster",
    third: "Third Caster",
  };

  return {
    slots: finalSlots,
    maxSpellLevel,
    casterLabel: casterLabels[casterType] ?? "Third Caster",
    breakdown,
  };
}

// ══════════════════════════════════════════════════════════════════
// Carry Capacity
// ══════════════════════════════════════════════════════════════════

export interface CarryCapacityBreakdown {
  base: number;       // STR × 2
  raceBonus: number;
  classBonus: number;
  total: number;
}

/**
 * Computes carry capacity in kg.
 *   total = (STR × 2) + race bonus + class bonus
 */
export function computeCarryCapacity(
  strengthScore: number,
  raceName: string,
  className: string
): CarryCapacityBreakdown {
  const race = RACE_MAP.get(raceName);
  const cls = CLASS_MAP.get(className);

  const base = strengthScore * 2;
  const raceBonus = race?.carryBonus ?? 0;
  const classBonus = cls?.carryBonus ?? 0;

  return {
    base,
    raceBonus,
    classBonus,
    total: base + raceBonus + classBonus,
  };
}

// ── Starter Spells ───────────────────────────────────────────────

/**
 * Returns the starter spells for a class, each with a generated id.
 */
export function getStarterSpells(className: string): Spell[] {
  const cls = CLASS_MAP.get(className);
  if (!cls) return [];

  return cls.starterSpells.map((s, i) => ({
    ...s,
    id: `starter-${className.toLowerCase()}-${i}`,
  }));
}

// ── Saving Throw Proficiencies ───────────────────────────────────

/**
 * Computes saving throw proficiencies from class + race.
 * Class provides 2 base proficiencies, race may add 1 bonus.
 */
export function computeSavingThrows(
  className: string,
  raceName: string
): Partial<Record<AbilityName, boolean>> {
  const cls = CLASS_MAP.get(className);
  const race = RACE_MAP.get(raceName);

  const result: Partial<Record<AbilityName, boolean>> = {};

  // Class saves (2 per class)
  if (cls) {
    for (const ability of cls.savingThrows) {
      result[ability] = true;
    }
  }

  // Race bonus save (1 per race, if any)
  if (race?.bonusSavingThrow) {
    result[race.bonusSavingThrow] = true;
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════
// Class Combat Bonuses (for future combat system)
// ══════════════════════════════════════════════════════════════════

/**
 * Weapon Mastery — Kensei-specific bonus damage with chosen weapon.
 *
 * Scaling: +1 at level 3, then +1 every 4 levels after.
 *   Lv 1-2:  +0  (still learning)
 *   Lv 3-6:  +1  (first breakthrough)
 *   Lv 7-10: +2  (refined technique)
 *   Lv 11-14: +3 (master strikes)
 *   Lv 15-18: +4 (legendary precision)
 *   Lv 19-20: +5 (transcendent mastery)
 *
 * For comparison at level 20:
 *   - Kensei Katana: d10 + DEX mod (~6) + mastery (+5) ≈ 16.5 avg
 *   - Wizard spell: d10 + multiple targets + spell slot scaling
 *   - Warrior: d12 + STR mod (~8) + Battlecraft buffs ≈ 14.5 avg
 * So Kensei hits hardest per single swing, but no AOE or magic utility.
 */
export function computeWeaponMastery(
  className: string,
  level: number
): { bonus: number; label: string } | null {
  if (className !== "Kensei") return null;

  let bonus: number;
  let label: string;

  if (level < 3) {
    bonus = 0;
    label = "Apprentice";
  } else if (level < 7) {
    bonus = 1;
    label = "Adept";
  } else if (level < 11) {
    bonus = 2;
    label = "Expert";
  } else if (level < 15) {
    bonus = 3;
    label = "Master";
  } else if (level < 19) {
    bonus = 4;
    label = "Grandmaster";
  } else {
    bonus = 5;
    label = "Transcendent";
  }

  return { bonus, label };
}

/**
 * Generic class combat bonuses — extendable for future classes.
 * Returns all active combat bonuses for display and combat resolution.
 */
export interface CombatBonus {
  name: string;
  type: "damage" | "attack" | "defense";
  value: number;
  description: string;
  appliesTo?: string; // e.g. "chosen weapon" or "all melee"
}

export function getClassCombatBonuses(
  className: string,
  level: number,
  chosenWeapon?: string
): CombatBonus[] {
  const bonuses: CombatBonus[] = [];

  // Kensei weapon mastery
  const mastery = computeWeaponMastery(className, level);
  if (mastery && mastery.bonus > 0) {
    bonuses.push({
      name: `Weapon Mastery (${mastery.label})`,
      type: "damage",
      value: mastery.bonus,
      description: `+${mastery.bonus} damage with your chosen weapon from years of devoted training.`,
      appliesTo: chosenWeapon ?? "chosen weapon",
    });
  }

  return bonuses;
}