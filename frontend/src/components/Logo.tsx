/** ZK Pass mark: a check in a rounded square, electric blue (or white on dark backgrounds). */
export function Logo({ dark = true, className = "h-5 w-5" }: { dark?: boolean; className?: string }) {
  const bg = dark ? "var(--primary)" : "#fff";
  const fg = dark ? "#fff" : "var(--primary)";
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill={bg} />
      <path d="M4.3 8.2l2.4 2.4 5-5.2" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
