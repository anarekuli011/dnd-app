import { useState, useEffect } from "react";
import { useAuth } from "@features/auth/context/AuthContext";
import { getCharactersByOwner } from "@shared/services/characterService";
import type { Character } from "@shared/types/dnd";

interface CharacterSelectProps {
  onSelect: (character: Character) => void;
  onSkip?: () => void;
}

export default function CharacterSelect({ onSelect, onSkip }: CharacterSelectProps) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);

    getCharactersByOwner(user.uid)
      .then((chars) => {
        if (!cancelled) {
          setCharacters(chars);
          // Auto-select if only one character
          if (chars.length === 1) {
            setSelectedId(chars[0].id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load characters:", err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleConfirm = () => {
    const char = characters.find((c) => c.id === selectedId);
    if (char) onSelect(char);
  };

  if (loading) {
    return (
      <div className="char-select">
        <div className="char-select__card">
          <div className="char-select__loading">
            <span className="session-loading__spinner" />
            Loading characters…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="char-select">
      <div className="char-select__card">
        <div className="char-select__icon">⚔️</div>
        <h2 className="char-select__title">Choose Your Character</h2>
        <p className="char-select__subtitle">
          Select which character you'll play in this session
        </p>

        {characters.length === 0 ? (
          <div className="char-select__empty">
            <p>You don't have any characters yet.</p>
            <p>Create a character from the dashboard first, then join the session.</p>
            {onSkip && (
              <button className="btn btn--outline" onClick={onSkip}>
                Join without a character
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="char-select__list">
              {characters.map((char) => {
                const isSelected = selectedId === char.id;
                return (
                  <button
                    key={char.id}
                    className={`char-select__item ${
                      isSelected ? "char-select__item--selected" : ""
                    }`}
                    onClick={() => setSelectedId(char.id)}
                  >
                    <span className="char-select__item-avatar">
                      {char.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="char-select__item-info">
                      <span className="char-select__item-name">{char.name}</span>
                      <span className="char-select__item-meta">
                        {char.race && `${char.race} `}
                        {char.class && `${char.class} `}
                        {char.level > 0 && `Lv ${char.level}`}
                      </span>
                    </div>
                    <div className="char-select__item-stats">
                      <span className="char-select__item-hp">
                        ❤️ {char.hitPoints.current}/{char.hitPoints.max}
                      </span>
                      <span className="char-select__item-ac">
                        🛡️ {char.armorClass}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="char-select__item-check">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="char-select__actions">
              <button
                className="btn btn--primary"
                disabled={!selectedId}
                onClick={handleConfirm}
              >
                Enter Session
              </button>
              {onSkip && (
                <button className="btn btn--outline" onClick={onSkip}>
                  Skip
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
