"use client";
// On-device active liveness with MediaPipe Face Landmarker.
// Everything runs in this browser tab: no frames, images or landmarks are uploaded.
// Only the outcome (which challenges passed, how long it took) is sent to the server.
// This is not a certified liveness check and is labelled that way in the KYC result.
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Spinner } from "./ui";

export type LivenessResult = {
  method: "on_device" | "simulated";
  challenges: ("blink" | "turn_left" | "turn_right")[];
  duration_ms?: number;
};

type Phase = "idle" | "loading" | "running" | "passed" | "failed" | "unavailable";
type Task = "blink" | "turn";

const MODEL_LOCAL = "/mediapipe/face_landmarker.task";
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const TIME_LIMIT_MS = 45_000;
const BLINK_CLOSED = 0.55;
const BLINK_OPEN = 0.25;
const TURN_THRESHOLD = 0.17; // nose offset from the face centre, as a share of face width

const TASK_TEXT: Record<Task, string> = {
  blink: "Blink twice naturally",
  turn: "Slowly turn your head to one side, then to the other",
};

/** Random prompt order, so a pre-recorded video can't follow a fixed script. */
function randomOrder(): Task[] {
  return crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? ["blink", "turn"] : ["turn", "blink"];
}

type Landmarker = {
  detectForVideo: (
    v: HTMLVideoElement,
    t: number,
  ) => {
    faceLandmarks: { x: number; y: number }[][];
    faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
  };
  close: () => void;
};

async function createLandmarker(): Promise<Landmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const local = await fetch(MODEL_LOCAL, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
  const modelAssetPath = local ? MODEL_LOCAL : MODEL_CDN;
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath, delegate },
    runningMode: "VIDEO" as const,
    numFaces: 2, // so we can tell when more than one face is in view
    outputFaceBlendshapes: true,
  });
  try {
    return (await FaceLandmarker.createFromOptions(fileset, options("GPU"))) as unknown as Landmarker;
  } catch {
    return (await FaceLandmarker.createFromOptions(fileset, options("CPU"))) as unknown as Landmarker;
  }
}

export function LivenessCheck({ busy, onDone }: { busy: string; onDone: (r: LivenessResult) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const landmarker = useRef<Landmarker | null>(null);
  const frame = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [current, setCurrent] = useState(0);
  const [hint, setHint] = useState("");
  const [blinks, setBlinks] = useState(0);
  const [sides, setSides] = useState({ a: false, b: false });
  const [elapsed, setElapsed] = useState(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    (video.current?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stop();
      landmarker.current?.close();
    },
    [stop],
  );

  async function start() {
    setPhase("loading");
    setHint("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      landmarker.current ??= await createLandmarker();
    } catch (err) {
      console.error("Liveness setup failed:", err);
      stop();
      setPhase("unavailable");
      return;
    }
    const order = randomOrder();
    setTasks(order);
    setCurrent(0);
    setBlinks(0);
    setSides({ a: false, b: false });
    setPhase("running");
    run(order);
  }

  function run(order: Task[]) {
    const started = performance.now();
    let step = 0;
    let blinkCount = 0;
    let eyesClosed = false;
    const seen = { a: false, b: false };

    const tick = () => {
      const v = video.current;
      const lm = landmarker.current;
      if (!v || !lm) return;
      const now = performance.now();
      setElapsed(now - started);
      if (now - started > TIME_LIMIT_MS) {
        stop();
        setPhase("failed");
        setHint("Time ran out. Make sure your face is well lit and try again.");
        return;
      }
      if (v.readyState >= 2) {
        const res = lm.detectForVideo(v, now);
        const faces = res.faceLandmarks.length;
        if (faces === 0) setHint("Move into view so the camera can see your face.");
        else if (faces > 1) setHint("Only one face should be in view.");
        else {
          setHint("");
          const task = order[step];
          if (task === "blink") {
            const cats = res.faceBlendshapes?.[0]?.categories ?? [];
            const score = (name: string) => cats.find((c) => c.categoryName === name)?.score ?? 0;
            const closed = (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2;
            if (!eyesClosed && closed > BLINK_CLOSED) eyesClosed = true;
            else if (eyesClosed && closed < BLINK_OPEN) {
              eyesClosed = false;
              blinkCount += 1;
              setBlinks(blinkCount);
            }
            if (blinkCount >= 2) step += 1;
          } else {
            // Nose tip (1) against the two cheek edges (234, 454): about 0 facing forward.
            const f = res.faceLandmarks[0];
            const left = f[234].x;
            const right = f[454].x;
            const offset = (f[1].x - (left + right) / 2) / Math.abs(right - left || 1);
            if (offset > TURN_THRESHOLD) seen.a = true;
            if (offset < -TURN_THRESHOLD) seen.b = true;
            setSides({ ...seen });
            if (seen.a && seen.b) step += 1;
          }
          setCurrent(step);
          if (step >= order.length) {
            stop();
            setPhase("passed");
            onDone({
              method: "on_device",
              challenges: ["blink", "turn_left", "turn_right"],
              duration_ms: Math.round(now - started),
            });
            return;
          }
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  const running = phase === "running" || phase === "loading";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-bold text-neutral-900 sm:text-2xl">On-Device Active Liveness</h2>
        <Badge tone="neutral">MediaPipe Wasm</Badge>
      </div>
      <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
        Follow two short prompts in front of your camera. Face mesh tracking executes strictly in your browser tab:
        zero images or video frames are ever uploaded.
      </p>

      {/* Video Viewport Container */}
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-800 bg-[#111113] shadow-inner">
        <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />

        {/* Reticle guide overlay */}
        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-40 sm:h-56 sm:w-48 rounded-[50%] border-2 border-dashed border-[#a9d5f5]/60" />
          </div>
        )}

        {!running && phase !== "passed" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            <div className="max-w-xs space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                📷
              </div>
              <p className="font-sans text-sm text-neutral-300">
                {phase === "unavailable"
                  ? "Camera or face tracking isn't available here. You can proceed with the simulated check."
                  : phase === "failed"
                    ? hint
                    : "Camera is inactive."}
              </p>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-white backdrop-blur-xs">
            <Spinner label="Loading MediaPipe model & camera" />
          </div>
        )}

        {phase === "passed" && (
          <div className="absolute inset-0 grid place-items-center bg-[#0018f2]/85 text-white backdrop-blur-xs">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0018f2] text-xl font-bold">
                ✓
              </div>
              <div className="font-serif text-2xl font-bold">Liveness Verified</div>
              <div className="font-mono text-xs text-[#a9d5f5]">On-device mesh match complete</div>
            </div>
          </div>
        )}
      </div>

      {phase === "running" && (
        <div aria-live="polite" className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3.5 space-y-2">
          <ol className="space-y-1.5 font-sans text-xs sm:text-sm">
            {tasks.map((t, i) => (
              <li
                key={t}
                className={`flex items-center justify-between font-medium ${
                  i === current ? "text-[#0018f2] font-semibold" : i < current ? "text-[#1a7f4b]" : "text-neutral-400"
                }`}
              >
                <span>
                  {i < current ? "✓ " : `${i + 1}. `}
                  {TASK_TEXT[t]}
                  {t === "blink" && i === current && ` (${blinks}/2 blinks)`}
                  {t === "turn" && i === current && ` (${Number(sides.a) + Number(sides.b)}/2 sides)`}
                </span>
                {i === current && (
                  <span className="font-mono text-xs uppercase bg-[#0018f2]/10 text-[#0018f2] px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
              </li>
            ))}
          </ol>
          {hint && <p className="font-sans text-xs text-[#cf3a31]">{hint}</p>}
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono pt-1">
            <span>Timeout limit</span>
            <span>{Math.max(0, Math.ceil((TIME_LIMIT_MS - elapsed) / 1000))}s remaining</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {(phase === "idle" || phase === "failed") && (
          <button
            className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
            onClick={start}
            disabled={!!busy}
          >
            {phase === "failed" ? "Try again" : "Start camera check"}
          </button>
        )}
        {phase === "passed" && busy && <Spinner label={busy} />}
        {phase !== "passed" && (
          <button
            className="btn btn-quiet"
            disabled={!!busy || phase === "loading"}
            onClick={() => {
              stop();
              onDone({ method: "simulated", challenges: [] });
            }}
          >
            Use simulated check instead
          </button>
        )}
      </div>
    </div>
  );
}
