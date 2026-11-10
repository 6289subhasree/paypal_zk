"use client";
import { useEffect, useRef } from "react";

/**
 * Renders oversized text made of crisp circular pixel dots.
 * Used in the footer for the giant pixelated "ZK PASS" wordmark matching
 * the oversized "Cotool" wordmark in the reference.
 */
export function PixelText({
  text = "ZK PASS",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d")!;

    // Render bold text to offscreen canvas
    const offscreen = document.createElement("canvas");
    const ow = 700;
    const oh = 150;
    offscreen.width = ow;
    offscreen.height = oh;
    const octx = offscreen.getContext("2d")!;
    octx.fillStyle = "#FFFFFF";
    octx.font = "900 110px 'Inter Tight', system-ui, sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.letterSpacing = "6px";
    octx.fillText(text, ow / 2, oh / 2);

    const imageData = octx.getImageData(0, 0, ow, oh);
    const pixels = imageData.data;

    // Grid sampling parameters
    const step = 6;
    const dotR = 2.4 * dpr;
    const scaleX = (w * dpr) / ow;
    const scaleY = (h * dpr) / oh;

    ctx.clearRect(0, 0, w * dpr, h * dpr);

    for (let y = 0; y < oh; y += step) {
      for (let x = 0; x < ow; x += step) {
        const idx = (y * ow + x) * 4;
        const alpha = pixels[idx + 3];
        if (alpha > 70) {
          const px = x * scaleX;
          const py = y * scaleY;

          // Subtle variation in dot brightness
          const rnd = Math.random();
          const fill = rnd < 0.75 ? "#FFFFFF" : rnd < 0.9 ? "#B0D0FF" : "#E2E8F0";

          ctx.beginPath();
          ctx.arc(px, py, dotR, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
        }
      }
    }
  }, [text]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full block select-none ${className}`}
      style={{ height: 160 }}
      aria-label={text}
      role="img"
    />
  );
}
