// Simple geometric icons with a PayPal-blue gradient, used on the landing page.
type Kind = "shield" | "card" | "lock" | "eighteen" | "bolt" | "arrow";

export function FeatureIcon({ kind }: { kind: Kind }) {
  const id = `fi-${kind}`;
  const paint = `url(#${id})`;
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#003087" />
          <stop offset="0.55" stopColor="#0070e0" />
          <stop offset="1" stopColor="#a9c8f5" />
        </linearGradient>
      </defs>
      {kind === "shield" && (
        <path d="M32 6l20 7v16c0 13-8.5 23-20 29C20.5 52 12 42 12 29V13z M23 31l7 7 12-13" fill="none" stroke={paint} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {kind === "card" && (
        <>
          <rect x="6" y="14" width="52" height="36" rx="7" fill={paint} />
          <rect x="14" y="36" width="22" height="5" rx="2.5" fill="#fff" fillOpacity="0.85" />
          <circle cx="45" cy="27" r="6" fill="#ffc439" />
        </>
      )}
      {kind === "lock" && (
        <>
          <path d="M20 28v-7a12 12 0 0124 0v7" fill="none" stroke={paint} strokeWidth="7" strokeLinecap="round" />
          <rect x="12" y="28" width="40" height="28" rx="7" fill={paint} />
        </>
      )}
      {kind === "eighteen" && (
        <>
          <circle cx="32" cy="32" r="25" fill="none" stroke={paint} strokeWidth="6" />
          <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="Inter Tight, sans-serif" fill="#003087">
            18
          </text>
        </>
      )}
      {kind === "bolt" && <path d="M36 4L12 36h17l-3 24 26-34H34z" fill={paint} />}
      {kind === "arrow" && <path d="M14 50L46 18M24 16h24v24" fill="none" stroke={paint} strokeWidth="9" strokeLinecap="square" />}
    </svg>
  );
}
