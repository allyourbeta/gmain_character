import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";

dotenv.config();

type GeminiProfile = {
  name: string;
  vibe: string;
  appearance: {
    skinTone: string;
    faceShape: string;
    hairColor: string;
    hairStyle: string;
    glasses: boolean;
    glassesColor: string;
    glassesShape: string;
    hat: boolean;
    hatColor: string;
    hatType: string;
    hatDetails: string;
    facialHair: string;
    shirtColor: string;
    glassesFrameColor: string;
    clothingDetails: string;
    notableFeatures: string[];
    logosOrPatches: string[];
    distinctiveMarks: string[];
  };
  catchphrases: string[];
  specialPower: string;
  theme: string;
  obstacles: string[];
  powerups: string[];
};

type CharacterProfile = GeminiProfile & {
  face: {
    skinTone: string;
    glasses: boolean;
    glassesColor: string;
    glassesShape: string;
    hat: boolean;
    hatColor: string;
    hatType: string;
    hairColor: string;
    hairStyle: string;
    facialHair: string;
    faceShape: string;
  };
  appearance: GeminiProfile["appearance"] & {
    hair: string;
  };
};

const app = express();
const port = Number(process.env.PORT ?? 8787);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 5
  }
});
const maxTotalFrameBytes = 3 * 1024 * 1024;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/analyze-video", upload.array("frames", 5), async (req, res) => {
  const frames = (req.files ?? []) as Express.Multer.File[];
  const totalBytes = frames.reduce((sum, frame) => sum + frame.size, 0);

  console.log("[analyze-video] frame request received", {
    frameCount: frames.length,
    totalBytes,
    mimeTypes: frames.map((frame) => frame.mimetype)
  });

  try {
    if (!frames.length) {
      throw publicError("invalid response", "No frame images were uploaded.");
    }
    if (totalBytes > maxTotalFrameBytes) {
      throw publicError("upload too large", "Frame upload is over the 3MB limit.");
    }

    const profiles = await analyzeFramesWithGemini(frames);
    console.log("[analyze-video] Gemini profiles generated", { 
      count: profiles.length, 
      names: profiles.map(p => p.name) 
    });

    res.json({
      profiles: profiles,
      source: "gemini"
    });
  } catch (error) {
    const reason = getPublicReason(error);
    console.error("[analyze-video] Gemini analysis failed", error);
    res.status(reason === "upload too large" ? 413 : 502).json({
      error: {
        message: "Gemini could not analyze your recording.",
        reason
      }
    });
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const reason = getPublicReason(error);
  console.error("[server] request failed before analysis", error);
  res.status(reason === "upload too large" ? 413 : 400).json({
    error: {
      message: "Gemini could not analyze your recording.",
      reason
    }
  });
});

async function analyzeFramesWithGemini(frames: Express.Multer.File[]): Promise<CharacterProfile[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw publicError("Gemini API error", "GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  // Gemini integration: only extracted video frames are sent, never the full recording.
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildGeminiPrompt() },
            ...frames.map((frame) => ({
              inlineData: {
                mimeType: frame.mimetype || "image/jpeg",
                data: frame.buffer.toString("base64")
              }
            } as const))
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    }),
    30000
  );

  const text = response.text;
  console.log("[analyze-video] Gemini raw text length", text?.length ?? 0);
  if (!text) {
    throw publicError("invalid response", "Gemini returned no text");
  }

  try {
    const parsed = parseJson(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(item => normalizeGeminiProfile(item));
  } catch (error) {
    console.error("[analyze-video] invalid Gemini JSON", error, text);
    throw publicError("invalid response", "Gemini returned invalid profile JSON");
  }
}

function buildGeminiPrompt() {
  return `These frames are from a short video showing a GROUP of people (2 or 3 people). Analyze the frames and create a SEPARATE playful game character profile for EACH distinct person visible.

Focus on each person's:
- visible appearance
- clothing
- accessories
- small visible details such as hat logos, patches, hat markings, glasses frame color, shirt color, jacket color, and distinctive marks
- energy/vibe
- game theme ideas

Do not identify real people by name.
Do not include sensitive trait guesses.
Return ONLY valid JSON. No markdown, no commentary.

The JSON must be an ARRAY of objects, one per person detected. Each object must match this schema:
{
  "name": string,
  "vibe": string,
  "appearance": {
    "skinTone": string,
    "faceShape": string,
    "hairColor": string,
    "hairStyle": string,
    "glasses": boolean,
    "glassesColor": string,
    "glassesShape": string,
    "hat": boolean,
    "hatColor": string,
    "hatType": string,
    "hatDetails": string,
    "facialHair": string,
    "shirtColor": string,
    "glassesFrameColor": string,
    "clothingDetails": string,
    "notableFeatures": string[],
    "logosOrPatches": string[],
    "distinctiveMarks": string[]
  },
  "catchphrases": string[],
  "specialPower": string,
  "theme": string,
  "obstacles": string[],
  "powerups": string[]
}

Give each person a DIFFERENT name, theme, and specialPower. Make the names creative and fun.
Use CSS hex colors for skinTone, hairColor, glassesColor, hatColor, and shirtColor.
Use one of these themes when possible: cyberpunk, startup office, anime arena, hacker basement, chaotic hackathon.
Keep catchphrases, obstacles, and powerups short and game-readable.
Return an array even if only 1 person is detected (array of length 1).`;
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(unfenced);
}

function normalizeGeminiProfile(value: unknown): CharacterProfile {
  if (!isObject(value)) {
    throw new Error("Gemini JSON was not an object");
  }

  const appearance = getObject(value.appearance, "appearance");
  const normalizedAppearance = {
    skinTone: getString(appearance.skinTone, "#9b623f"),
    faceShape: getString(appearance.faceShape, "rounded oval"),
    hairColor: getString(appearance.hairColor, "#17110d"),
    hairStyle: getString(appearance.hairStyle, "mostly hidden"),
    hair: getString(appearance.hairStyle, "mostly hidden"),
    glasses: getBoolean(appearance.glasses, false),
    glassesColor: getString(appearance.glassesColor, "#39ff88"),
    glassesShape: getString(appearance.glassesShape, "round"),
    hat: getBoolean(appearance.hat, false),
    hatColor: getString(appearance.hatColor, "#050505"),
    hatType: getString(appearance.hatType, "none"),
    hatDetails: getString(appearance.hatDetails, ""),
    facialHair: getString(appearance.facialHair, "none"),
    shirtColor: getString(appearance.shirtColor, "#171923"),
    glassesFrameColor: getString(appearance.glassesFrameColor, getString(appearance.glassesColor, "#39ff88")),
    clothingDetails: getString(appearance.clothingDetails, ""),
    notableFeatures: getStringArray(appearance.notableFeatures, []),
    logosOrPatches: getStringArray(appearance.logosOrPatches, []),
    distinctiveMarks: getStringArray(appearance.distinctiveMarks, [])
  };

  const catchphrases = getStringArray(value.catchphrases, ["watch this", "ship it live"]);
  const obstacles = getStringArray(value.obstacles, ["BUG", "MERGE", "DEMO"]);
  const powerups = getStringArray(value.powerups, ["SHIP", "HYPE"]);

  if (!catchphrases.length) catchphrases.push("watch this");
  if (!obstacles.length) obstacles.push("BUG");
  if (!powerups.length) powerups.push("SHIP");

  return {
    name: getString(value.name, "Main Character"),
    vibe: getString(value.vibe, "main-character energy"),
    face: {
      skinTone: normalizedAppearance.skinTone,
      glasses: normalizedAppearance.glasses,
      glassesColor: normalizedAppearance.glassesColor,
      glassesShape: normalizedAppearance.glassesShape,
      hat: normalizedAppearance.hat,
      hatColor: normalizedAppearance.hatColor,
      hatType: normalizedAppearance.hatType,
      hairColor: normalizedAppearance.hairColor,
      hairStyle: normalizedAppearance.hairStyle,
      facialHair: normalizedAppearance.facialHair,
      faceShape: normalizedAppearance.faceShape
    },
    appearance: normalizedAppearance,
    catchphrases,
    specialPower: getString(value.specialPower, "Main Character Dash"),
    theme: getString(value.theme, "chaotic hackathon"),
    obstacles,
    powerups
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`Gemini JSON missing ${label}`);
  }
  return value;
}

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return [...fallback];
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length ? strings.slice(0, 6) : [...fallback];
}

function publicError(reason: string, detail: string) {
  const error = new Error(detail) as Error & { publicReason: string };
  error.publicReason = reason;
  return error;
}

function getPublicReason(error: unknown) {
  if (isObject(error) && typeof error.publicReason === "string") {
    return error.publicReason;
  }
  if (isObject(error) && error.code === "LIMIT_FILE_SIZE") {
    return "upload too large";
  }
  if (error instanceof SyntaxError) {
    return "invalid response";
  }
  if (error instanceof Error && error.message === "Gemini request timed out") {
    return "timeout";
  }
  return "Gemini API error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(publicError("timeout", "Gemini request timed out")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

app.post("/api/generate-avatar", async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile || !profile.appearance) {
      res.status(400).json({ error: "Missing profile" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const a = profile.appearance;
    const face = profile.face ?? {};

    const prompt = `Generate a single cartoon fighting game character, full body, standing in a boxing ready pose with fists up.

Character details:
- Skin tone: ${a.skinTone || "medium brown"}
- Shirt/top color: ${a.shirtColor || "dark grey"}
- ${face.hat ? `Wearing a ${a.hatColor || "dark"} ${a.hatType || "cap"}` : "No hat"}
- ${face.glasses ? `Wearing ${a.glassesShape || "rectangular"} glasses with ${a.glassesColor || "dark"} frames` : "No glasses"}
- Hair: ${a.hairColor || "black"} ${a.hairStyle || "short"} hair
- ${face.facialHair && face.facialHair !== "none" ? `Has ${face.facialHair}` : "Clean shaven"}
- Clothing details: ${a.clothingDetails || "casual"}

Style: Colorful cartoon game character, bold outlines, chibi-proportioned (big head, small body), vibrant colors, dynamic fighting pose. White or transparent background. Character should fill most of the image. Side view facing right.`;

    console.log("[generate-avatar] Generating avatar for:", profile.name);

    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      45000
    );

    // The @google/genai SDK can return parts in different structures
    // Try candidates[0].content.parts first, then response.candidates
    const rawResponse = response as any;
    const parts = rawResponse.candidates?.[0]?.content?.parts
      || rawResponse.response?.candidates?.[0]?.content?.parts
      || [];

    console.log("[generate-avatar] Response parts count:", parts.length,
      "types:", parts.map((p: any) => p.text ? "text" : p.inlineData ? "image" : "unknown"));

    if (!parts.length) {
      console.error("[generate-avatar] No parts in response. Full response keys:", Object.keys(rawResponse));
      res.status(502).json({ error: "No image generated" });
      return;
    }

    const imagePart = parts.find(
      (part: any) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      console.error("[generate-avatar] No image data found in parts. Part types:",
        parts.map((p: any) => ({ hasText: !!p.text, hasInlineData: !!p.inlineData, mimeType: p.inlineData?.mimeType })));
      res.status(502).json({ error: "No image in response" });
      return;
    }

    console.log("[generate-avatar] Avatar generated for:", profile.name);
    res.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (error) {
    console.error("[generate-avatar] Failed:", error);
    res.status(502).json({ error: "Avatar generation failed" });
  }
});

app.listen(port, () => {
  console.log(`Main Character Mode API running on http://localhost:${port}`);
});
