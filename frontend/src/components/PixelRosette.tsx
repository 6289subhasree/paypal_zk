"use client";
import { useEffect, useRef } from "react";

/**
 * Concentric geometric pixel-art rosette / mandala matching the reference's
 * privacy statement graphic.
 */
export function PixelRosette({
  size = 280,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;

    const cx = (size * dpr) / 2;
    const cy = (size * dpr) / 2;

    const rings = [
      { r: 24 * dpr, dots: 12, dotR: 2.2 * dpr, color: "#0808E8" },
      { r: 42 * dpr, dots: 24, dotR: 2.6 * dpr, color: "#0000CC" },
      { r: 60 * dpr, dots: 36, dotR: 2.8 * dpr, color: "#3868FF" },
      { r: 78 * dpr, dots: 48, dotR: 3.0 * dpr, color: "#7EA8FF" },
      { r: 96 * dpr, dots: 60, dotR: 2.6 * dpr, color: "#B0D0FF" },
      { r: 114 * dpr, dots: 72, dotR: 2.4 * dpr, color: "#0808E8" },
      { r: 130 * dpr, dots: 84, dotR: 2.0 * dpr, color: "#FF4AC8" }, // Outer pink accent dots
    ];

    let angle = 0;
    const render = () => {
      ctx.clearRect(0, 0, size * dpr, size * dpr);

      // Center decorative pixel cross
      ctx.fillStyle = "#0808E8";
      const cs = 3 * dpr;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx + i * 5 * dpr - cs / 2, cy - cs / 2, cs, cs);
        ctx.fillRect(cx - cs / 2, cy + i * 5 * dpr - cs / 2, cs, cs);
      }

      rings.forEach((ring, ringIdx) => {
        const dir = ringIdx % 2 === 0 ? 1 : -1;
        const currentAngle = angle * 0.15 * dir;

        for (let i = 0; i < ring.dots; i++) {
          const theta = (i / ring.dots) * Math.PI * 2 + currentAngle;
          // Add gentle petal modulation
          const petals = 6;
          const modR = ring.r + Math.sin(theta * petals + ringIdx) * 4 * dpr;
          const px = cx + Math.cos(theta) * modR;
          const py = cy + Math.sin(theta) * modR;

          ctx.beginPath();
          ctx.arc(px, py, ring.dotR, 0, Math.PI * 2);
          ctx.fillStyle = ring.color;
          ctx.fill();
        }
      });

      angle += 0.015;
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
