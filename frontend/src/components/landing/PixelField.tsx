"use client";
import { useEffect, useRef } from "react";

/**
 * One small canvas engine for every pixel-dot illustration on the landing page.
 * Dots sit on a fixed grid; each variant decides which grid cells are lit and in what colour.
 * It only animates while on screen, and draws a single still frame for reduced motion.
 */
export type PixelVariant = "wave" | "stream" | "orb" | "wordmark" | "spray" | "tile";

const C = {
  white: "#ffffff",
  ice: "#c9d2ff",
  sky: "#8fa3ff",
  pink: "#ff4ac8",
  blush: "#ffb3e6",
  red: "#ff3434",
  blue: "#0808e8",
  deep: "#0000cc",
  grey: "#d8d8d8",
};

// Stable per-cell random number in [0, 1).
function hash(i: number, j: number, seed = 0) {
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

type Frame = { ctx: CanvasRenderingContext2D; w: number; h: number; t: number; gap: number; text?: string; mask?: Uint8ClampedArray | null; maskW?: number };

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Rolling breakers along the bottom of the hero: a dotted sea with curling crests. */
function drawWave({ ctx, w, h, t, gap }: Frame) {
  const r = gap * 0.36;
  const base = h * 0.66;
  const crests = [0, 1, 2, 3].map((k) => {
    const height = h * [0.5, 0.32, 0.58, 0.38][k];
    // Crests travel slowly to the right and wrap around.
    const pos = ((((k + 0.15) / 4 + t * 0.012) % 1) * 1.3 - 0.15) * w;
    return { pos, height, R: height * 0.42 };
  });
  const surface = (x: number) => {
    let lift = Math.sin(x * 0.018 + t * 0.9) * gap * 0.6 + Math.sin(x * 0.007 - t * 0.4) * h * 0.04;
    for (const c of crests) {
      const d = x - c.pos;
      const L = d < 0 ? w * 0.11 : w * 0.035; // long back slope, steep face
      lift += c.height * Math.exp(-((d / L) ** 2));
    }
    return base - lift;
  };
  const inCurl = (x: number, y: number) => {
    for (const c of crests) {
      const cx = c.pos + c.R * 0.55;
      const cy = base - c.height + c.R * 0.95;
      const d = Math.hypot(x - cx, y - cy);
      if (y < cy && x > c.pos - c.R * 0.3 && d < c.R && d > c.R * 0.5) return (d - c.R * 0.5) / (c.R * 0.5);
    }
    return -1;
  };
  const cols = Math.ceil(w / gap) + 1;
  const rows = Math.ceil(h / gap) + 1;
  for (let i = 0; i < cols; i++) {
    const x = i * gap;
    const top = surface(x);
    for (let j = 0; j < rows; j++) {
      const y = j * gap;
      const n = hash(i, j);
      const curl = inCurl(x, y);
      if (curl >= 0) {
        dot(ctx, x, y, r, curl > 0.6 ? C.white : n > 0.5 ? C.ice : n > 0.15 ? C.blush : C.pink);
        continue;
      }
      const depth = (y - top) / gap; // in rows below the surface
      if (depth < 0) {
        if (depth > -3 && n > 0.8 - depth * 0.05 + 0.08) dot(ctx, x, y, r * 0.7, n > 0.985 ? C.pink : C.white);
        continue;
      }
      let color: string;
      if (depth < 1.5) color = n > 0.2 ? C.white : C.ice;
      else if (depth < 4) color = n > 0.6 ? C.white : n > 0.25 ? C.ice : C.blush;
      else if (depth < 9) color = n > 0.75 ? C.pink : n > 0.45 ? C.sky : n > 0.2 ? C.ice : C.blush;
      else {
        // Deep water: sparser, bluer, a few hot accents.
        if (n < 0.18) continue;
        color = n > 0.96 ? C.red : n > 0.8 ? C.pink : n > 0.45 ? C.sky : "#3d3dff";
      }
      if (depth > 4 && Math.sin(t * 1.6 + n * 50) > 0.96) color = C.white;
      dot(ctx, x, y, r, color);
    }
  }
}

/** Flowing columns of dots, used on the right of the blue call to action. */
function drawStream({ ctx, w, h, t, gap }: Frame) {
  const r = gap * 0.34;
  const cols = Math.ceil(w / gap);
  const rows = Math.ceil(h / gap);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = i / cols;
      const v = j / rows;
      const band = Math.sin(v * 7 + u * 4 - t * 0.8) * 0.5 + 0.5;
      const fade = u * u; // denser towards the right edge
      const n = hash(i, j, 3);
      if (n > band * fade * 1.4) continue;
      const shift = Math.sin(v * 9 + t) * gap * 0.35;
      const color = n < 0.03 ? C.pink : n < 0.05 ? C.red : C.white;
      dot(ctx, i * gap + shift, j * gap, r * (0.6 + band * 0.4), color);
    }
  }
}

/** A dotted disc with a check made of dots, like a seal. */
function drawOrb({ ctx, w, h, t, gap }: Frame) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.46;
  const r = gap * 0.34;
  const check = (x: number, y: number) => {
    // Distance from the check stroke (two segments) in disc-relative units.
    const px = (x - cx) / R;
    const py = (y - cy) / R;
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax, dy = by - ay;
      const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - ax - k * dx, py - ay - k * dy);
    };
    return Math.min(seg(-0.38, 0.02, -0.1, 0.3), seg(-0.1, 0.3, 0.42, -0.26));
  };
  for (let x = cx - R; x <= cx + R; x += gap) {
    for (let y = cy - R; y <= cy + R; y += gap) {
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d > 1) continue;
      const i = Math.round(x / gap), j = Math.round(y / gap);
      const n = hash(i, j, 7);
      if (check(x, y) < 0.075) {
        dot(ctx, x, y, r * 1.1, C.blue);
        continue;
      }
      const ring = Math.sin(d * 18 - t * 1.4) * 0.5 + 0.5;
      const keep = d > 0.86 ? 0.85 : d < 0.62 ? 0.12 : ring * 0.7;
      if (n > keep) continue;
      dot(ctx, x, y, r * (d > 0.86 ? 0.9 : 0.75), n < 0.06 ? C.pink : n < 0.5 ? C.blue : C.sky);
    }
  }
}

/** Sparse scatter in a corner, for the dark capabilities panel. */
function drawSpray({ ctx, w, h, t, gap }: Frame) {
  const r = gap * 0.34;
  for (let i = 0; i * gap < w; i++) {
    for (let j = 0; j * gap < h; j++) {
      const u = i * gap / w, v = j * gap / h;
      const reach = u * (1 - v); // strongest at the top-right corner
      const n = hash(i, j, 11);
      if (n > reach * reach * 1.25) continue;
      const pulse = Math.sin(t * 1.2 + n * 30) > 0.6;
      const color = n < 0.04 ? C.red : n < 0.1 ? C.pink : pulse ? C.white : C.sky;
      dot(ctx, i * gap, j * gap, r, color);
    }
  }
}

/** A small grid of rounded cells that flip slowly: the credential as data. */
function drawTile({ ctx, w, h, t, gap }: Frame) {
  const cols = Math.floor(w / gap), rows = Math.floor(h / gap);
  const s = gap * 0.78;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const n = hash(i, j, 5);
      const phase = Math.floor(t * 0.8 + n * 6) % 9;
      const color = phase === 0 && n > 0.7 ? C.red : n > 0.86 ? C.pink : n > 0.55 ? C.blush : n > 0.42 ? C.white : "#ffd8f1";
      ctx.fillStyle = color;
      const x = i * gap + (gap - s) / 2, y = j * gap + (gap - s) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, s, s, s * 0.22);
      ctx.fill();
    }
  }
}

/** Large text drawn with dots, sampled from an offscreen render of the word. */
function drawWordmark({ ctx, w, h, t, gap, mask, maskW }: Frame) {
  if (!mask || !maskW) return;
  const r = gap * 0.4;
  for (let x = gap / 2; x < w; x += gap) {
    for (let y = gap / 2; y < h; y += gap) {
      const a = mask[(Math.floor(y) * maskW + Math.floor(x)) * 4 + 3];
      if (a < 128) continue;
      const n = hash(Math.round(x / gap), Math.round(y / gap), 9);
      const glint = Math.sin(t * 0.9 + x * 0.012 - y * 0.004) > 0.985;
      dot(ctx, x, y, r, glint ? "#ffffff" : n > 0.992 ? C.pink : "#e4e4e4");
    }
  }
}

const DRAW: Record<PixelVariant, (f: Frame) => void> = {
  wave: drawWave,
  stream: drawStream,
  orb: drawOrb,
  spray: drawSpray,
  tile: drawTile,
  wordmark: drawWordmark,
};

export function PixelField({
  variant,
  gap = 10,
  className = "",
  text = "",
  label,
}: {
  variant: PixelVariant;
  gap?: number;
  className?: string;
  text?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = false, last = 0;
    let mask: Uint8ClampedArray | null = null;
    const start = performance.now();

    const buildMask = () => {
      if (variant !== "wordmark" || !w || !h) return;
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d")!;
      let size = h * 0.98;
      o.font = `800 ${size}px "Inter Tight", system-ui, sans-serif`;
      const tw = o.measureText(text).width;
      if (tw > w * 0.98) size *= (w * 0.98) / tw;
      o.font = `800 ${size}px "Inter Tight", system-ui, sans-serif`;
      o.textBaseline = "middle";
      o.textAlign = "center";
      o.fillText(text, w / 2, h / 2 + size * 0.04);
      mask = o.getImageData(0, 0, w, h).data;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildMask();
      paint(performance.now());
    };

    const paint = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = reduce ? 2 : (now - start) / 1000;
      DRAW[variant]({ ctx, w, h, t, gap, text, mask, maskW: w });
    };

    const loop = (now: number) => {
      if (!visible) return;
      // ~30 fps is plenty for slow motion and halves the work.
      if (now - last > 33) {
        paint(now);
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduce;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    // Redraw once fonts arrive so the wordmark uses the right face.
    document.fonts?.ready.then(() => resize());

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [variant, gap, text]);

  return <canvas ref={ref} className={`block h-full w-full ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
