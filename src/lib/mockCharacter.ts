import type { CharacterProfile } from "../types/character";

const profiles: CharacterProfile[] = [
  {
    name: "Cap Mode Ash",
    vibe: "main-character energy",
    face: {
      skinTone: "#9b623f",
      glasses: true,
      glassesColor: "#39ff88",
      glassesShape: "round",
      hat: true,
      hatColor: "#050505",
      hatType: "baseball cap",
      hairColor: "#17110d",
      hairStyle: "mostly hidden",
      facialHair: "short beard",
      faceShape: "rounded oval"
    },
    appearance: {
      skinTone: "#9b623f",
      faceShape: "rounded oval",
      hairColor: "#17110d",
      hairStyle: "mostly hidden",
      hair: "mostly hidden under black baseball cap",
      glasses: true,
      glassesColor: "#39ff88",
      glassesShape: "round",
      hat: true,
      hatColor: "#050505",
      hatType: "baseball cap",
      hatDetails: "plain cap with front patch area",
      facialHair: "short beard",
      shirtColor: "#171923",
      glassesFrameColor: "#39ff88",
      clothingDetails: "dark shirt",
      notableFeatures: ["black baseball cap", "round green glasses", "dark shirt"],
      logosOrPatches: ["front hat patch"],
      distinctiveMarks: []
    },
    catchphrases: ["watch this", "ship it live", "chaos is a feature"],
    specialPower: "Cap Lock Dash",
    theme: "chaotic hackathon",
    obstacles: ["BUG", "MERGE", "DEMO"],
    powerups: ["SHIP", "HYPE"]
  }
];

export function generateMockCharacterProfile(): Promise<CharacterProfile> {
  if (!import.meta.env.DEV) {
    throw new Error("Mock character generation is disabled outside development.");
  }

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(profiles[Math.floor(Math.random() * profiles.length)]);
    }, 1100);
  });
}
