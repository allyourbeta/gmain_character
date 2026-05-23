import { useState, useEffect } from "react";
import type { CharacterProfile } from "../types/character";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

type SquadLobbyProps = {
  players: PlayerSlot[];
  onRecordSquad: () => void;
  onStartBattle: () => void;
  onLoadSquad: (slots: SavedSlot[]) => void;
};

type SavedSlot = {
  id: number;
  profile: CharacterProfile;
  heroFrameUrl: string;
  avatarUrl: string | null;
};

export function SquadLobby({ players, onRecordSquad, onStartBattle, onLoadSquad }: SquadLobbyProps) {
  const [hasSavedSquad, setHasSavedSquad] = useState(false);
  const filledPlayers = players.filter(p => p.profile !== null);
  const canStartBattle = filledPlayers.length >= 2;

  useEffect(() => {
    const saved = localStorage.getItem("maincharacter_squad");
    setHasSavedSquad(!!saved);
  }, []);

  const saveSquad = () => {
    const savedSlots: SavedSlot[] = filledPlayers
      .filter(p => p.heroFrameUrl)
      .map(p => ({
        id: p.id,
        profile: p.profile!,
        heroFrameUrl: p.heroFrameUrl!,
        avatarUrl: p.avatarUrl || null
      }));
    
    if (savedSlots.length > 0) {
      localStorage.setItem("maincharacter_squad", JSON.stringify(savedSlots));
      setHasSavedSquad(true);
    }
  };

  const loadSavedSquad = () => {
    try {
      const saved = localStorage.getItem("maincharacter_squad");
      if (saved) {
        const savedSlots: SavedSlot[] = JSON.parse(saved);
        onLoadSquad(savedSlots);
        setHasSavedSquad(true);
      }
    } catch (error) {
      console.error("Failed to load saved squad:", error);
    }
  };

  return (
    <section className="screen lobby-screen">
      <div className="lobby-container">
        <header className="lobby-header">
          <h1>SQUAD ASSEMBLY</h1>
          <p>Build your team of main characters</p>
        </header>

        {filledPlayers.length === 0 ? (
          <div className="empty-squad">
            <button 
              className="record-squad-button"
              onClick={onRecordSquad}
            >
              <div className="plus-icon">+</div>
              <span className="record-squad-label">Record Your Squad</span>
              <p className="record-description">Film all your team members together in one video</p>
            </button>
          </div>
        ) : (
          <div className="squad-slots">
            {players.map(player => (
              <div key={player.id} className={`squad-slot ${player.profile ? 'filled' : 'empty'}`}>
                {player.profile && player.heroFrameUrl ? (
                  <div className="player-card">
                    <div className="hero-portrait">
                      <img src={player.heroFrameUrl} alt={player.profile.name} />
                      <div className="hero-glow"></div>
                    </div>
                    <div className="player-info">
                      <h3>{player.profile.name}</h3>
                      <p className="player-vibe">{player.profile.vibe}</p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-slot">
                    <div className="empty-placeholder">
                      <span>Waiting for squad recording...</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="lobby-actions">
          <div className="squad-management">
            {filledPlayers.length > 0 && (
              <button 
                className="secondary-button"
                onClick={onRecordSquad}
              >
                Re-Record Squad
              </button>
            )}
            <button 
              className="secondary-button"
              onClick={saveSquad}
              disabled={filledPlayers.length === 0}
            >
              Save Squad
            </button>
            {hasSavedSquad && (
              <button 
                className="secondary-button"
                onClick={loadSavedSquad}
              >
                Load Saved Squad
              </button>
            )}
          </div>

          {filledPlayers.length > 0 && (
            <button 
              className={`primary-cta battle-button ${canStartBattle ? 'ready' : 'disabled'}`}
              onClick={onStartBattle}
              disabled={!canStartBattle}
            >
              ENTER THE ARENA
              {canStartBattle && <div className="battle-pulse"></div>}
            </button>
          )}
        </div>

        {filledPlayers.length > 0 && !canStartBattle && (
          <p className="battle-requirement">
            Need at least 2 players to start battle
          </p>
        )}
      </div>
    </section>
  );
}