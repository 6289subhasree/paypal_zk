/** ZK Pass mark: a check in PayPal yellow (or navy on light backgrounds). */
export function Logo({ dark = false, className = "h-5 w-5" }: { dark?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="10" fill={dark ? "var(--navy)" : "var(--yellow)"} />
      <path
        d="M5.8 10.3l2.7 2.7 5.6-5.9"
        fill="none"
        stroke={dark ? "#fff" : "var(--navy-deep)"}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
