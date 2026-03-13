import { useState, useEffect } from "react";
import { useAuth } from "@features/auth/context/AuthContext";
import { getCampaignsByGM } from "@shared/services/campaignService";
import type { Campaign } from "@shared/types/dnd";

interface CreateSessionProps {
  onCreate: (campaignId: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export default function CreateSession({ onCreate, onCancel, loading }: CreateSessionProps) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [useQuickSession, setUseQuickSession] = useState(false);

  // Fetch campaigns where user is GM
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoadingCampaigns(true);

    getCampaignsByGM(user.uid)
      .then((data) => {
        if (!cancelled) {
          setCampaigns(data);
          if (data.length > 0) setSelectedId(data[0].id);
          setLoadingCampaigns(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load campaigns:", err);
        if (!cancelled) setLoadingCampaigns(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreate = () => {
    // If quick session or no campaigns, use a placeholder campaign ID
    const campaignId = useQuickSession || !selectedId ? "quick-session" : selectedId;
    onCreate(campaignId);
  };

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="session-create">
      <div className="session-create__card">
        <div className="session-create__icon">🏰</div>
        <h2 className="session-create__title">Start a Session</h2>
        <p className="session-create__subtitle">
          Create a live session for your players to join
        </p>

        {loadingCampaigns ? (
          <div className="session-create__loading">
            <span className="session-create__spinner" />
            Loading campaigns…
          </div>
        ) : (
          <>
            {hasCampaigns && !useQuickSession && (
              <div className="session-create__field">
                <label className="session-create__label" htmlFor="campaign-select">
                  Campaign
                </label>
                <select
                  id="campaign-select"
                  className="session-create__select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={loading}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasCampaigns && (
              <label className="session-create__checkbox">
                <input
                  type="checkbox"
                  checked={useQuickSession}
                  onChange={(e) => setUseQuickSession(e.target.checked)}
                  disabled={loading}
                />
                <span>Quick session (no campaign)</span>
              </label>
            )}

            {!hasCampaigns && (
              <div className="session-create__notice">
                <span className="session-create__notice-icon">ℹ️</span>
                <p>
                  You don't have any campaigns yet. You can still start a quick
                  session — players can join and you can roll dice together.
                </p>
              </div>
            )}
          </>
        )}

        <div className="session-create__actions">
          <button
            className="btn btn--primary session-create__submit"
            onClick={handleCreate}
            disabled={loading || loadingCampaigns}
          >
            {loading ? (
              <>
                <span className="session-create__spinner" />
                Creating…
              </>
            ) : (
              "Create Session"
            )}
          </button>
          <button
            className="btn btn--outline session-create__cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
