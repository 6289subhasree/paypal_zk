"use client";
import { useEffect, useState } from "react";

const ITEMS = [
  { id: "verify", label: "Verify" },
  { id: "passport", label: "Passport" },
  { id: "pay", label: "Pay" },
];

/** Sticky index for the three product sections; the one in view is dark, the rest fade. */
export function ShowcaseNav() {
  const [active, setActive] = useState("verify");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Product sections">
      <ul className="space-y-0.5">
        {ITEMS.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={`flex items-center gap-2.5 font-serif text-[22px] leading-tight transition-colors duration-300 ${
                active === id ? "text-[var(--lp-ink)]" : "text-[#b9b9b9] hover:text-[#8a8a8a]"
              }`}
            >
              <GridMark on={active === id} />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function GridMark({ on = true, className = "" }: { on?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3.5 w-3.5 shrink-0 transition-opacity ${on ? "opacity-100" : "opacity-0"} ${className}`} aria-hidden>
      {[1.5, 6, 10.5].flatMap((x) => [1.5, 6, 10.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="var(--lp-blue)" />))}
    </svg>
  );
}
