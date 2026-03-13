import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface JoinSessionProps {
  onJoin: (code: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

const CODE_LENGTH = 6;

export default function JoinSession({ onJoin, onCancel, loading, error }: JoinSessionProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ── Focus management ─────────────────────────────────────────

  const focusInput = (index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputsRef.current[index]?.focus();
      inputsRef.current[index]?.select();
    }
  };

  // ── Input handler ────────────────────────────────────────────

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow alphanumeric characters
      const char = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);

      const next = [...digits];
      next[index] = char;
      setDigits(next);

      // Auto-advance to next input
      if (char && index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }

      // Auto-submit when all filled
      if (char && index === CODE_LENGTH - 1) {
        const code = next.join("");
        if (code.length === CODE_LENGTH) {
          onJoin(code);
        }
      }
    },
    [digits, onJoin]
  );

  // ── Keyboard navigation ──────────────────────────────────────

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // If current cell is empty, move back and clear previous
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        focusInput(index - 1);
        e.preventDefault();
      } else {
        // Clear current cell
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      }
    } else if (e.key === "ArrowLeft") {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      focusInput(index + 1);
      e.preventDefault();
    } else if (e.key === "Enter") {
      const code = digits.join("");
      if (code.length === CODE_LENGTH) {
        onJoin(code);
      }
    }
  };

  // ── Paste support ────────────────────────────────────────────

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, CODE_LENGTH);

    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);

    // Focus the next empty slot or the last one
    const nextEmpty = next.findIndex((d) => !d);
    focusInput(nextEmpty >= 0 ? nextEmpty : CODE_LENGTH - 1);

    // Auto-submit if fully pasted
    if (pasted.length === CODE_LENGTH) {
      onJoin(pasted);
    }
  };

  // ── Manual submit ────────────────────────────────────────────

  const handleSubmit = () => {
    const code = digits.join("");
    if (code.length === CODE_LENGTH) {
      onJoin(code);
    }
  };

  const isFilled = digits.every((d) => d !== "");

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="session-join">
      <div className="session-join__card">
        <div className="session-join__icon">🗝️</div>
        <h2 className="session-join__title">Join a Session</h2>
        <p className="session-join__subtitle">
          Enter the 6-character code from your GM
        </p>

        <div className="session-join__code-inputs">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              disabled={loading}
              autoFocus={i === 0}
              className={`session-join__digit ${digit ? "session-join__digit--filled" : ""}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              onFocus={(e) => e.target.select()}
              aria-label={`Code digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <div className="session-join__error">
            <span className="session-join__error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="session-join__actions">
          <button
            className="btn btn--primary session-join__submit"
            onClick={handleSubmit}
            disabled={!isFilled || loading}
          >
            {loading ? (
              <span className="session-join__spinner" />
            ) : (
              "Join Session"
            )}
          </button>
          <button
            className="btn btn--outline session-join__cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        <p className="session-join__hint">
          Your GM can find the code on their session screen after creating a session.
        </p>
      </div>
    </div>
  );
}
