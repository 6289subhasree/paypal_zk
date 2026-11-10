"use client";
import { useEffect, useRef, useCallback } from "react";

type WaveVariant = "hero" | "cta" | "rosette" | "scatter";

interface Pixel {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  amp: number;
}

export function PixelWave({
  variant = "hero",
  height = 320,
  className = "",
}: {
  variant?: WaveVariant;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const pixelsRef = useRef<Pixel[]>([]);
  const isReducedMotion = useRef(false);

  const initPixels = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const pixels: Pixel[] = [];
    const gridSize = 7 * dpr; // Crisp pixel spacing
    const dotRadius = 2.4 * dpr;

    // Palette inspired by the reference
    const PALETTE = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#B0D0FF",
      "#7EA8FF",
      "#3868FF",
      "#0020CC",
      "#FF4AC8", // Accent neon pink
      "#FF4AC8",
      "#FF3434", // Accent bright red
    ];

    if (variant === "hero") {
      // Create Japanese woodblock wave silhouettes using mathematical composite wave equations
      const cols = Math.ceil((w * dpr) / gridSize);
      const rows = Math.ceil((h * dpr) / gridSize);

      for (let c = 0; c < cols; c++) {
        const x = c * gridSize;
        const normX = x / (w * dpr);

        // Three distinct wave crests across width
        // Wave 1: left crest peaking around x = 0.18
        // Wave 2: middle crest peaking around x = 0.52
        // Wave 3: right crest curling over around x = 0.85
        const crest1 = Math.exp(-Math.pow((normX - 0.18) * 5, 2)) * 0.75;
        const crest2 = Math.exp(-Math.pow((normX - 0.52) * 4.5, 2)) * 0.82;
        const crest3 = Math.exp(-Math.pow((normX - 0.84) * 4, 2)) * 0.92;
        
        // Base rolling sea level
        const rolling = Math.sin(normX * Math.PI * 4) * 0.12 + 0.45;
        
        // Peak height profile (1.0 = bottom of canvas, 0.0 = top of canvas)
        const peakHeight = Math.max(crest1, crest2, crest3, rolling);
        const waveTopY = (h * dpr) * (1 - peakHeight * 0.88);

        for (let r = 0; r < rows; r++) {
          const y = r * gridSize;

          // Below the wave silhouette: dense field
          if (y >= waveTopY) {
            // Distance from crest surface
            const depth = (y - waveTopY) / (h * dpr);
            
            // Random spray & foam probability
            let spawnProb = 0.88;
            if (depth < 0.08) spawnProb = 0.65; // Foam edge
            if (Math.random() < spawnProb) {
              // Color selection based on depth & randomness
              let col: string;
              const rnd = Math.random();
              if (depth < 0.05) {
                // Crest foam: mostly white & sky blue with pink hints
                col = rnd < 0.55 ? "#FFFFFF" : rnd < 0.8 ? "#B0D0FF" : rnd < 0.95 ? "#FF4AC8" : "#FF3434";
              } else if (depth < 0.25) {
                // Upper body: blues, whites, pink specks
                col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
              } else {
                // Deep water: darker blues with occasional white/pink dots
                col = rnd < 0.35 ? "#3868FF" : rnd < 0.65 ? "#0020CC" : rnd < 0.85 ? "#B0D0FF" : rnd < 0.95 ? "#FF4AC8" : "#FFFFFF";
              }

              pixels.push({
                x,
                y,
                baseX: x,
                baseY: y,
                size: dotRadius,
                color: col,
                speed: 0.8 + Math.random() * 0.8,
                phase: normX * 8 + Math.random() * Math.PI,
                amp: (1.5 + Math.random() * 2.5) * dpr,
              });
            }
          } else if (y >= waveTopY - 24 * dpr) {
            // Spray particles in the air above the crest
            if (Math.random() < 0.12) {
              const col = Math.random() < 0.6 ? "#FFFFFF" : Math.random() < 0.85 ? "#B0D0FF" : "#FF4AC8";
              pixels.push({
                x,
                y,
                baseX: x,
                baseY: y,
                size: (1.5 + Math.random()) * dpr,
                color: col,
                speed: 1.2 + Math.random() * 1.0,
                phase: Math.random() * Math.PI * 2,
                amp: (3 + Math.random() * 4) * dpr,
              });
            }
          }
        }
      }
    } else if (variant === "cta") {
      // Semicircular tunnel/burst wave on the right side of the CTA banner
      const cols = Math.ceil((w * dpr) / gridSize);
      const rows = Math.ceil((h * dpr) / gridSize);
      const centerX = (w * dpr) * 0.82;
      const centerY = (h * dpr) * 0.5;
      const maxRadius = (h * dpr) * 0.9;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * gridSize;
          const y = r * gridSize;
          const dist = Math.hypot(x - centerX, y - centerY);

          // Concentric ripple bands
          if (dist < maxRadius) {
            const band = Math.sin((dist / maxRadius) * Math.PI * 6);
            if (band > 0.15 && Math.random() < 0.7) {
              const rnd = Math.random();
              const col = rnd < 0.6 ? "#FFFFFF" : rnd < 0.85 ? "#B0D0FF" : rnd < 0.95 ? "#FF4AC8" : "#FF3434";
              pixels.push({
                x,
                y,
                baseX: x,
                baseY: y,
                size: dotRadius * (1 - dist / (maxRadius * 1.5)),
                color: col,
                speed: 0.6 + Math.random() * 0.6,
                phase: dist * 0.05 + Math.random() * 2,
                amp: (1 + Math.random() * 2) * dpr,
              });
            }
          }
        }
      }
    } else if (variant === "scatter") {
      // Corner particle scatter for dark capabilities card
      const cols = Math.ceil((w * dpr) / gridSize);
      const rows = Math.ceil((h * dpr) / gridSize);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * gridSize;
          const y = r * gridSize;
          const normX = x / (w * dpr);
          const normY = y / (h * dpr);
          // Top right density
          const prob = Math.pow(normX, 2) * Math.pow(1 - normY, 2) * 0.9;
          if (Math.random() < prob) {
            const rnd = Math.random();
            const col = rnd < 0.4 ? "#FFFFFF" : rnd < 0.7 ? "#7EA8FF" : rnd < 0.9 ? "#FF4AC8" : "#FF3434";
            pixels.push({
              x,
              y,
              baseX: x,
              baseY: y,
              size: dotRadius,
              color: col,
              speed: 0.4 + Math.random() * 0.4,
              phase: Math.random() * Math.PI * 2,
              amp: 2 * dpr,
            });
          }
        }
      }
    }

    pixelsRef.current = pixels;
  }, [variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    isReducedMotion.current = mql.matches;
    const onMotion = (e: MediaQueryListEvent) => {
      isReducedMotion.current = e.matches;
    };
    mql.addEventListener("change", onMotion);

    initPixels(canvas);

    const ctx = canvas.getContext("2d")!;
    let t = 0;

    const render = () => {
      const { width, height: ch } = canvas;
      ctx.clearRect(0, 0, width, ch);

      const pixels = pixelsRef.current;
      const count = pixels.length;

      for (let i = 0; i < count; i++) {
        const p = pixels[i];
        if (!isReducedMotion.current) {
          p.y = p.baseY + Math.sin(t * p.speed + p.phase) * p.amp;
        }

        ctx.fillStyle = p.color;
        // Draw crisp circle pixel
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isReducedMotion.current) {
        t += 0.02;
      }
      animRef.current = requestAnimationFrame(render);
    };

    render();

    const onResize = () => {
      initPixels(canvas);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      mql.removeEventListener("change", onMotion);
    };
  }, [initPixels]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none block w-full select-none ${className}`}
      style={{ height }}
      aria-hidden="true"
    />
  );
}
