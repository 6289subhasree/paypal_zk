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
  blink: "Blink twice",
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
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[30px]">On-device liveness</h2>
        <Badge tone="sandbox">Runs in your browser</Badge>
      </div>
      <p className="max-w-[62ch] text-[15px] text-ink-soft">
        Follow two quick prompts in front of your camera. Face tracking runs in this browser with MediaPipe: nothing is
        recorded or uploaded, only whether the prompts were completed. It isn&apos;t a certified liveness check.
      </p>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-charcoal">
        <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        {running && (
          // Oval face guide; the rest of the frame is dimmed slightly.
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
            <div className="aspect-[3/4] h-[78%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.28)]" />
          </div>
        )}
        {!running && phase !== "passed" && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-[15px] text-white/85">
            {phase === "unavailable"
              ? "Camera or face tracking isn't available here. You can use the simulated step instead."
              : phase === "failed"
                ? hint
                : "Camera is off. Start the check when you're ready."}
          </div>
        )}
        {phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-white">
            <Spinner label="Starting camera and face tracking" />
          </div>
        )}
        {phase === "running" && (
          <div aria-live="polite" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-center gap-2 p-3">
            {tasks.map((t, i) => (
              <span
                key={t}
                className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                  i === current ? "bg-primary text-white" : i < current ? "bg-approve-soft text-approve" : "bg-white/85 text-ink-soft"
                }`}
              >
                {i < current ? "✓ " : ""}
                {TASK_TEXT[t]}
                {t === "blink" && i === current && ` · ${blinks}/2`}
                {t === "turn" && i === current && ` · ${Number(sides.a) + Number(sides.b)}/2 sides`}
              </span>
            ))}
          </div>
        )}
        {phase === "running" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-0.5 font-mono text-[12px] text-white">
            {Math.max(0, Math.ceil((TIME_LIMIT_MS - elapsed) / 1000))}s
          </span>
        )}
        {phase === "passed" && (
          <div className="absolute inset-0 grid place-items-center bg-black/55 text-white">
            <span className="font-serif text-[30px]">Liveness passed</span>
          </div>
        )}
      </div>

      {phase === "running" && hint && <p className="text-[15px] text-reject" role="alert">{hint}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {(phase === "idle" || phase === "failed") && (
          <button className="btn btn-accent" onClick={start} disabled={!!busy}>
            {phase === "failed" ? "Try again" : "Start liveness check"}
          </button>
        )}
        {phase === "passed" && busy && <Spinner label={busy} />}
        {/* Hidden while the camera check runs, so it can't be clicked by accident mid-check. */}
        {(phase === "idle" || phase === "failed" || phase === "unavailable") && (
          <button
            className="btn btn-quiet"
            disabled={!!busy}
            onClick={() => {
              stop();
              onDone({ method: "simulated", challenges: [] });
            }}
          >
            Use simulated step instead
          </button>
        )}
      </div>
    </div>
  );
}
