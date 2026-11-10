"use client";
import { useEffect, useRef } from "react";

/**
 * Small centered pixel-art illustration badge (pink/blue/white) matching the
 * intro section of the reference design.
 */
export function PixelBadge({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 64;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;

    // 8x8 pixel grid
    const grid = [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 3, 3, 3, 3, 2, 1],
      [1, 2, 3, 4, 4, 3, 2, 1],
      [1, 2, 3, 4, 4, 3, 2, 1],
      [1, 2, 3, 3, 3, 3, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
    ];

    const colors: Record<number, string> = {
      1: "#FF4AC8", // Neon pink
      2: "#B0D0FF", // Sky blue
      3: "#0808E8", // Electric blue
      4: "#FFFFFF", // White center
    };

    const cellSize = (size * dpr) / 8;
    const dotR = cellSize * 0.38;

    ctx.clearRect(0, 0, size * dpr, size * dpr);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const val = grid[r][c];
        if (val > 0) {
          const cx = c * cellSize + cellSize / 2;
          const cy = r * cellSize + cellSize / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = colors[val];
          ctx.fill();
        }
      }
    }
  }, []);

  return (
    <div className={`inline-flex items-center justify-center p-2 rounded-xl bg-pink-50/60 border border-pink-100 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-14 h-14"
        style={{ width: 56, height: 56 }}
        aria-hidden="true"
      />
    </div>
  );
}

