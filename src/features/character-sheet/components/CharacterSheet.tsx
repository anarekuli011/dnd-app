import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCharacterStore } from "../store/useCharacterStore";
import OverviewTab from "./tabs/OverviewTab";
import CombatTab from "./tabs/CombatTab";
import SkillsTab from "./tabs/SkillsTab";
import SpellsTab from "./tabs/SpellsTab";
import InventoryTab from "./tabs/InventoryTab";
import FeaturesTab from "./tabs/FeaturesTab";
import BiographyTab from "./tabs/BiographyTab";

// ── Tab definitions ──────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "combat", label: "Combat", icon: "⚔️" },
  { id: "skills", label: "Skills", icon: "🎯" },
  { id: "spells", label: "Spells", icon: "✨" },
  { id: "inventory", label: "Inventory", icon: "🎒" },
  { id: "features", label: "Features", icon: "⭐" },
  { id: "biography", label: "Bio & Notes", icon: "📖" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Component ────────────────────────────────────────────────────

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { character, loading, saving, dirty, error, loadCharacter, reset } =
    useCharacterStore();

  useEffect(() => {
    if (id) loadCharacter(id);
    return () => reset();
  }, [id]);

  // ── Loading / Error states ───────────────────────────────────

  if (loading) {
    return (
      <div className="cs-loading">
        <div className="cs-loading__spinner" />
        <p>Loading character…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cs-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="cs-error">
        <h2>Character not found</h2>
        <button className="btn btn--primary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Tab renderer ─────────────────────────────────────────────

  function renderTab() {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "combat":
        return <CombatTab />;
      case "skills":
        return <SkillsTab />;
      case "spells":
        return <SpellsTab />;
      case "inventory":
        return <InventoryTab />;
      case "features":
        return <FeaturesTab />;
      case "biography":
        return <BiographyTab />;
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="cs">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="cs-header">
        <button
          className="cs-header__back"
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
        >
          ← Dashboard
        </button>

        <div className="cs-header__identity">
          <h1 className="cs-header__name">{character.name}</h1>
          <span className="cs-header__meta">
            {character.race && `${character.race} `}
            {character.class && `${character.class} `}
            {character.level > 0 && `Lv ${character.level}`}
          </span>
        </div>

        <div className="cs-header__status">
          {saving && <span className="cs-header__saving">Saving…</span>}
          {dirty && !saving && (
            <span className="cs-header__unsaved">Unsaved</span>
          )}
          {!dirty && !saving && (
            <span className="cs-header__saved">Saved ✓</span>
          )}
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <nav className="cs-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`cs-tabs__tab ${
              activeTab === tab.id ? "cs-tabs__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="cs-tabs__icon">{tab.icon}</span>
            <span className="cs-tabs__label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Tab content ─────────────────────────────────────── */}
      <main className="cs-content">{renderTab()}</main>
    </div>
  );
}
