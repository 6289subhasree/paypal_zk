"use client";

/**
 * Exact Japanese woodblock-style pixel wave from cotool.ai.
 * Scaled at authentic large proportions (2030px per tile) and flowing
 * smoothly from left to right in an infinite seamless loop.
 */
export function HeroWave({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full absolute -bottom-10 sm:-bottom-8 left-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
    >
      <div
        className="flex animate-wave-flow-ltr will-change-transform"
        style={{
          width: "6090px", // Exactly 3 tiles of 2030px width
        }}
      >
        <div className="shrink-0" style={{ width: "2030px" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ width: "2030px", height: "auto" }}
          />
        </div>
        <div className="shrink-0" style={{ width: "2030px" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ width: "2030px", height: "auto" }}
          />
        </div>
        <div className="shrink-0" style={{ width: "2030px" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ width: "2030px", height: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
