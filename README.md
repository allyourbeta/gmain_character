# Main Character Mode

Hackathon proof-of-concept: record a short selfie video, extract a few key frames in the browser, ask Gemini Flash for a structured character profile, then play a prebuilt Phaser game starring a stylized version of the user.

This app does not ask AI to generate arbitrary game code. Gemini only returns JSON. The Phaser game template, avatar renderer, controls, obstacles, and powerups stay inside this codebase.

## Tech Stack

- React + Vite + TypeScript
- Phaser 3 for the browser game
- Express backend
- Multer for multipart frame uploads
- `@google/genai` for Gemini
- dotenv for server-only environment variables

## Project Structure

```text
.
|-- server/
|   `-- index.ts
|-- src/
|   |-- components/
|   |-- game/
|   |-- lib/
|   |-- types/
|   |-- App.tsx
|   `-- main.tsx
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## Setup

```bash
npm install
cp .env.example .env
```

Put your key in `.env`:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
```

`GEMINI_API_KEY` belongs only in `.env` for the backend. Do not put it in Vite env vars or frontend code.

Use Node 20 or newer for the Gemini SDK.

## Run the Frontend

```bash
npm run dev:client
```

Open the Vite URL, usually `http://localhost:5173`.

## Run the Backend

In a second terminal:

```bash
npm run dev:server
```

The API runs on `http://localhost:8787`.

## Build

```bash
npm run build
```

## Gemini Frame Analysis

When the user clicks **Generate My Game**, the browser extracts four frames from the recorded video at about 10%, 35%, 60%, and 85% of the clip. Each frame is resized to about 512px wide and encoded as JPEG at roughly 0.7 quality.

The frontend sends only these images to:

```http
POST /api/analyze-video
```

The backend accepts multipart form data with multiple `frames` files, rejects total uploads over 3MB, sends all frames to Gemini in one request, and asks Gemini to return only JSON matching the `CharacterProfile` schema.

If Gemini fails, the app fails honestly:

- no fake character profile
- no fake avatar
- no game render
- visible message: `Gemini could not analyze your recording.`
- visible high-level reason such as `upload too large`, `invalid response`, `Gemini API error`, or `timeout`
- detailed error logs stay in the console/server logs only

To verify Gemini is being called, watch backend logs for:

```text
[analyze-video] frame request received
[analyze-video] Gemini raw text length ...
[analyze-video] Gemini profile generated ...
```

Frontend console logs also show frame extraction counts, byte sizes, request status, and response status.

## License

MIT License
