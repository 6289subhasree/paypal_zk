// Prepare MediaPipe assets for on-device liveness, served from public/mediapipe:
// - copies the WebAssembly runtime from node_modules
// - downloads the face landmarker model once (about 3.6 MB) if it isn't there yet
// Failures are non-fatal: the app falls back to loading the model from Google's CDN,
// and to the simulated liveness step if that fails too.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const out = new URL("../public/mediapipe/", import.meta.url);
mkdirSync(out, { recursive: true });

cpSync(new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url), new URL("wasm/", out), {
  recursive: true,
});

const model = new URL("face_landmarker.task", out);
if (!existsSync(model)) {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(model, Buffer.from(await res.arrayBuffer()));
    console.log("downloaded MediaPipe face model");
  } catch (err) {
    console.warn(`could not download the face model (${err.message}); the browser will load it from the CDN`);
  }
}
console.log("MediaPipe assets ready in public/mediapipe");
