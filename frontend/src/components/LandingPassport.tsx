"use client";
import { useEffect, useState } from "react";
import { PassportDoc } from "./PassportDoc";
import { Stamp } from "./ui";

const demoCredential = {
  id: "demo",
  issuer_id: "zkpass-demo-issuer",
  credential_type: "KycApprovedCredential",
  claims: { kyc_approved: true },
  issued_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
  status: "active" as const,
  circuit_version: "kyc_payment@1",
};

/** The hero's one orchestrated moment: a proof lands on the passport as a stamp. */
export function LandingPassport() {
  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStamped(true), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="rotate-[1.5deg]">
      <PassportDoc
        holderName="Asha Verma"
        credential={demoCredential}
        signals={
          stamped
            ? { nullifier: "1840923315720041188273410", revocation_tag: "77310245991840", payment_challenge: "9021775310" }
            : undefined
        }
        stamp={stamped ? <Stamp kind="accepted">Proof accepted</Stamp> : null}
      />
    </div>
  );
}
