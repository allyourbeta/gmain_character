import { useState } from "react";
import { BoxingGame } from "./components/BoxingGame";
import { LandingPage } from "./components/LandingPage";
import { SquadLobby } from "./components/SquadLobby";
import { Recorder } from "./components/Recorder";
import { Generating } from "./components/GenerationSteps";
import { AnalysisErrorView } from "./components/CharacterReveal";
import { extractFramesFromVideo, statusToReason, toPublicGenerationError, PublicGenerationError } from "./lib/videoProcessing";
import type { CharacterProfile } from "./types/character";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

type Step = "landing" | "lobby" | "recording" | "generating" | "battle" | "error";
type GenerationStatus =
  | "Recording"
  | "Extracting Frames"
  | "Sending to Gemini"
  | "Analyzing"
  | "Generating Character"
  | "Ready";

type AnalyzeResponse =
  | {
      profiles: CharacterProfile[];
      source: "gemini";
    }
  | {
      error: {
        message: string;
        reason: string;
      };
    };

export default function App() {
  const [step, setStep] = useState<Step>("landing");
  const [players, setPlayers] = useState<PlayerSlot[]>([
    { id: 1, profile: null, heroFrameUrl: null, avatarUrl: null, videoUrl: null, videoBlob: null },
    { id: 2, profile: null, heroFrameUrl: null, avatarUrl: null, videoUrl: null, videoBlob: null },
    { id: 3, profile: null, heroFrameUrl: null, avatarUrl: null, videoUrl: null, videoBlob: null }
  ]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [heroFrameUrl, setHeroFrameUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("Recording");
  const [analysisError, setAnalysisError] = useState<{ message: string; reason: string } | null>(null);

  async function handleGenerate() {
    setStep("generating");
    setAnalysisError(null);

    try {
      if (!videoUrl || !videoBlob) {
        throw new PublicGenerationError("invalid response", "No recording was available.");
      }

      setGenerationStatus("Extracting Frames");
      const frames = await extractFramesFromVideo(videoUrl);
      const extractedHeroFrameUrl = frames[Math.min(1, frames.length - 1)]?.dataUrl ?? null;
      setHeroFrameUrl(extractedHeroFrameUrl);
      
      const totalBytes = frames.reduce((sum, frame) => sum + frame.size, 0);
      console.log("[frontend] Extracted frames", {
        count: frames.length,
        totalBytes,
        sizes: frames.map((frame) => frame.size)
      });

      const formData = new FormData();
      frames.forEach((frame, index) => {
        formData.append("frames", frame.blob, `frame-${index + 1}.jpg`);
      });

      setGenerationStatus("Sending to Gemini");
      console.log("[frontend] Uploading frames to /api/analyze-video", {
        count: frames.length,
        totalBytes
      });

      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData
      });
      console.log("[frontend] /api/analyze-video status", response.status);

      setGenerationStatus("Analyzing");
      const data = (await response.json()) as AnalyzeResponse;
      console.log("[frontend] /api/analyze-video response", data);

      if (!response.ok || "error" in data) {
        const reason = "error" in data ? data.error.reason : statusToReason(response.status);
        throw new PublicGenerationError(reason, "Gemini could not analyze your recording.");
      }

      setGenerationStatus("Generating Character");
      
      // Update player slots with profiles immediately (so lobby shows names)
      const profiles = data.profiles;
      setPlayers(prev => prev.map((slot, index) => {
        const profile = profiles[index] ?? null;
        return {
          ...slot,
          profile,
          heroFrameUrl: profile ? extractedHeroFrameUrl : null,
          avatarUrl: null,
          videoUrl: profile ? videoUrl : null,
          videoBlob: null
        };
      }));
      
      // Generate AI avatars for each profile in parallel
      console.log("[frontend] Generating avatars for", profiles.length, "characters");
      const avatarPromises = profiles.map(async (profile: CharacterProfile, index: number) => {
        try {
          const avatarRes = await fetch("/api/generate-avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile })
          });
          if (!avatarRes.ok) return null;
          const avatarData = await avatarRes.json();
          if (avatarData.imageBase64 && avatarData.mimeType) {
            return `data:${avatarData.mimeType};base64,${avatarData.imageBase64}`;
          }
          return null;
        } catch (err) {
          console.error(`[frontend] Avatar generation failed for player ${index + 1}`, err);
          return null;
        }
      });

      const avatarUrls = await Promise.all(avatarPromises);
      console.log("[frontend] Avatars generated:", avatarUrls.map(u => u ? "yes" : "no"));

      // Update slots with avatar URLs
      setPlayers(prev => prev.map((slot, index) => {
        const avatarUrl = avatarUrls[index] ?? null;
        return { ...slot, avatarUrl };
      }));
      
      setGenerationStatus("Ready");
      console.log("[frontend] Gemini succeeded; returning to lobby with all slots filled");
      setStep("lobby");
    } catch (error) {
      console.error("[frontend] Gemini analysis failed", error);
      const publicError = toPublicGenerationError(error);
      setAnalysisError({
        message: "Gemini could not analyze your recording.",
        reason: publicError.reason
      });
      setStep("error");
    }
  }

  function resetRecording() {
    setVideoUrl(null);
    setVideoBlob(null);
    setHeroFrameUrl(null);
    setAnalysisError(null);
    setGenerationStatus("Recording");
    setStep("recording");
  }

  function clearAllSlots() {
    setPlayers(prev => prev.map(player => ({
      ...player,
      profile: null,
      videoUrl: null,
      videoBlob: null,
      heroFrameUrl: null,
      avatarUrl: null
    })));
  }

  function handleRecordSquad() {
    setStep("recording");
  }

  function handleStartBattle() {
    setStep("battle");
  }

  function handleRestartFromBattle() {
    setStep("lobby");
  }

  function handleLoadSquad(savedSlots: any[]) {
    setPlayers(prev => prev.map((player) => {
      const saved = savedSlots.find((s: any) => s.id === player.id);
      if (saved) {
        return {
          ...player,
          profile: saved.profile,
          heroFrameUrl: saved.heroFrameUrl,
          avatarUrl: saved.avatarUrl || null,
          videoUrl: null,
          videoBlob: null
        };
      }
      return player;
    }));
  }

  return (
    <main>
      {step === "landing" && <LandingPage onStart={() => setStep("lobby")} />}
      {step === "lobby" && (
        <SquadLobby
          players={players}
          onRecordSquad={handleRecordSquad}
          onStartBattle={handleStartBattle}
          onLoadSquad={handleLoadSquad}
        />
      )}
      {step === "recording" && (
        <Recorder
          videoUrl={videoUrl}
          status={generationStatus}
          onVideoReady={(url, blob) => {
            setVideoUrl(url);
            setVideoBlob(blob);
            setGenerationStatus("Recording");
          }}
          onGenerate={handleGenerate}
          onBack={() => setStep("lobby")}
        />
      )}
      {step === "generating" && <Generating videoUrl={videoUrl} status={generationStatus} />}
      {step === "error" && analysisError && (
        <AnalysisErrorView
          videoUrl={videoUrl}
          error={analysisError}
          status={generationStatus}
          onTryAgain={handleGenerate}
          onRecordAgain={resetRecording}
        />
      )}
      {step === "battle" && (
        <BoxingGame 
          players={players.filter(p => p.profile !== null)} 
          onRestart={handleRestartFromBattle} 
        />
      )}
    </main>
  );
}
