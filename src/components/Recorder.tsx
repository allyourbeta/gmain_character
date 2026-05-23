import { useEffect, useRef, useState } from "react";

type RecorderProps = {
  videoUrl: string | null;
  status: string;
  onVideoReady: (url: string | null, blob: Blob | null) => void;
  onGenerate: () => void;
  onBack: () => void;
};

export function Recorder({ videoUrl, status, onVideoReady, onGenerate, onBack }: RecorderProps) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [isCameraReady, setCameraReady] = useState(false);
  const [isRecording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 960, height: 540, facingMode: "user" },
        audio: true
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch {
      setError("Camera permission is needed to record your main character intro.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      onVideoReady(URL.createObjectURL(blob), blob);
      stopCamera();
      setRecording(false);
    };

    recorder.start();
    setRecording(true);
    timeoutRef.current = window.setTimeout(stopRecording, 10000);
  }

  function stopRecording() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <section className="screen studio-screen">
      <div className="studio-shell">
        <div className="recorder-copy">
          <button className="ghost-button" type="button" onClick={onBack}>
            Back
          </button>
          <p className="eyebrow">Step 1: capture the protagonist</p>
          <h1>Record your 10-second origin story.</h1>
          <p>
            Make a face, flash the fit, give the algorithm something dramatic to pretend it understood.
          </p>
          <p className="status-pill">Status: {isRecording ? "Recording" : status}</p>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="camera-card">
          <div className="camera-frame">
            {videoUrl ? (
              <video src={videoUrl} controls playsInline />
            ) : (
              <video ref={previewRef} autoPlay muted playsInline />
            )}
            {isRecording && <span className="recording-pill">Recording max 10s</span>}
            {!isCameraReady && !videoUrl && <span className="empty-camera">camera preview</span>}
          </div>
          <div className="recorder-actions">
            {!isCameraReady && !videoUrl && (
              <button className="secondary-button" type="button" onClick={startCamera}>
                Enable Camera
              </button>
            )}
            {isCameraReady && !isRecording && (
              <button className="primary-cta compact" type="button" onClick={startRecording}>
                Start Recording
              </button>
            )}
            {isRecording && (
              <button className="danger-button" type="button" onClick={stopRecording}>
                Stop Recording
              </button>
            )}
            {videoUrl && (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    onVideoReady(null, null);
                    startCamera();
                  }}
                >
                  Record Again
                </button>
                <button className="primary-cta compact" type="button" onClick={onGenerate}>
                  Generate My Game
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
