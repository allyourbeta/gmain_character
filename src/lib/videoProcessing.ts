export async function extractFramesFromVideo(videoUrl: string) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  await waitForVideoMetadata(video);
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
  const timestamps = [0.1, 0.35, 0.6, 0.85].map((percent) => Math.min(duration * percent, duration - 0.05));
  const frames: Array<{ blob: Blob; dataUrl: string; size: number }> = [];

  for (const timestamp of timestamps) {
    video.currentTime = Math.max(0, timestamp);
    await waitForSeek(video);
    frames.push(await drawFrame(video));
  }

  return frames;
}

function waitForVideoMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new PublicGenerationError("invalid response", "Could not read recording metadata."));
    video.load();
  });
}

function waitForSeek(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new PublicGenerationError("invalid response", "Could not extract frames."));
  });
}

function drawFrame(video: HTMLVideoElement) {
  return new Promise<{ blob: Blob; dataUrl: string; size: number }>((resolve, reject) => {
    const targetWidth = 512;
    const ratio = video.videoHeight / video.videoWidth || 9 / 16;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * ratio);
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new PublicGenerationError("invalid response", "Could not create frame canvas."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new PublicGenerationError("invalid response", "Could not encode frame image."));
          return;
        }
        resolve({
          blob,
          dataUrl: canvas.toDataURL("image/jpeg", 0.72),
          size: blob.size
        });
      },
      "image/jpeg",
      0.7
    );
  });
}

export function statusToReason(status: number) {
  if (status === 413) return "upload too large";
  if (status === 504) return "timeout";
  return "Gemini API error";
}

export function toPublicGenerationError(error: unknown) {
  if (error instanceof PublicGenerationError) return error;
  return new PublicGenerationError("Gemini API error", "Gemini analysis failed.");
}

export class PublicGenerationError extends Error {
  reason: string;

  constructor(reason: string, message: string) {
    super(message);
    this.reason = reason;
  }
}