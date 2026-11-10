"use client";
import { useEffect, useRef } from "react";

/**
 * Renders oversized text made of small circular pixels.
 * Used in the footer for the large "ZK PASS" wordmark.
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

    // Render text to offscreen canvas to get pixel data
    const offscreen = document.createElement("canvas");
    const ow = 400;
    const oh = 100;
    offscreen.width = ow;
    offscreen.height = oh;
    const octx = offscreen.getContext("2d")!;
    octx.fillStyle = "#000";
    octx.font = "bold 72px 'Inter Tight', sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText(text, ow / 2, oh / 2);

    const imageData = octx.getImageData(0, 0, ow, oh);
    const pixels = imageData.data;

    // Sample the offscreen to create particle positions
    const dotSpacing = 5;
    const dotRadius = 2.4 * dpr;
    const scaleX = (w * dpr) / ow;
    const scaleY = (h * dpr) / oh;

    const colors = [
      "#FFFFFF22",
      "#FFFFFF18",
      "#FFFFFF11",
      "#0808E822",
    ];

    ctx.clearRect(0, 0, w * dpr, h * dpr);

    for (let y = 0; y < oh; y += dotSpacing) {
      for (let x = 0; x < ow; x += dotSpacing) {
        const idx = (y * ow + x) * 4;
        const alpha = pixels[idx + 3];
        if (alpha > 80) {
          const px = x * scaleX;
          const py = y * scaleY;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fill();
        }
      }
    }
  }, [text]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: 120 }}
      aria-hidden="true"
    />
  );
}

