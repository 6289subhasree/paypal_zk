"use client";

/**
 * Authentic Japanese woodblock-style pixel wave from cotool.ai.
 * Flowing continuously from left to right in an infinite seamless loop.
 */
export function HeroWave({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ height: "400px" }}
    >
      {/* 3 identical seamless wave tiles flowing from left to right */}
      <div
        className="absolute -bottom-2 left-0 flex animate-wave-ltr will-change-transform"
        style={{
          width: "300%",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div className="w-1/3 shrink-0" style={{ transform: "translateZ(0)" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ minWidth: "1400px", transform: "translateY(2%)" }}
          />
        </div>
        <div className="w-1/3 shrink-0" style={{ transform: "translateZ(0)" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ minWidth: "1400px", transform: "translateY(2%)" }}
          />
        </div>
        <div className="w-1/3 shrink-0" style={{ transform: "translateZ(0)" }}>
          <img
            src="/wave_exact.svg"
            alt=""
            className="w-full h-auto block select-none pointer-events-none"
            style={{ minWidth: "1400px", transform: "translateY(2%)" }}
          />
        </div>
      </div>
    </div>
  );
}
