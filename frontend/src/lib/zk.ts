"use client";
// Browser-side holder wallet and prover. The holder secret is created and kept in
// this browser only; the server sees a Poseidon commitment to it, never the secret.
import { poseidon1 } from "poseidon-lite";
import type { PaymentRequest, ProofMaterial } from "./api";

const secretKey = (userId: string) => `zkpass.holder_secret.${userId}`;

export function getHolderSecret(userId: string): string | null {
  try {
    return localStorage.getItem(secretKey(userId));
  } catch {
    return null;
  }
}

export function ensureHolderSecret(userId: string): string {
  const existing = getHolderSecret(userId);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(31)); // < field modulus
  const secret = BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")).toString();
  try {
    localStorage.setItem(secretKey(userId), secret);
  } catch {
    /* if storage is blocked the credential only works in this tab */
  }
  return secret;
}

export function holderCommitment(secret: string): string {
  return poseidon1([BigInt(secret)]).toString();
}

export type ProofBundle = {
  proof: Record<string, unknown>;
  public_signals: string[];
  provingMs: number;
};

export async function provePayment(opts: {
  secret: string;
  material: ProofMaterial;
  request: PaymentRequest;
  now?: number;
}): Promise<ProofBundle> {
  const { secret, material, request } = opts;
  const snarkjs = await import("snarkjs");
  const input = {
    issuer_ax: request.issuer_public_key.ax,
    issuer_ay: request.issuer_public_key.ay,
    now: String(opts.now ?? Math.floor(Date.now() / 1000)),
    payment_challenge: request.challenge,
    verifier_id: request.verifier_id,
    holder_secret: secret,
    credential_id: material.credentialId,
    kyc_approved: String(material.kycApproved),
    expires_at: String(material.expiresAt),
    sig_s: material.signature.s,
    sig_r8x: material.signature.r8x,
    sig_r8y: material.signature.r8y,
  };
  const started = performance.now();
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      "/zk/kyc_payment.wasm",
      "/zk/kyc_payment.zkey",
    );
    return { proof, public_signals: publicSignals, provingMs: Math.round(performance.now() - started) };
  } catch {
    throw new Error(
      "This credential can't produce a valid proof. It may have expired, or it was issued to a different browser.",
    );
  }
}

/** Public signals in circuit order, labelled for display. */
export function labelSignals(ps: string[]) {
  const names = ["nullifier", "revocation_tag", "issuer_ax", "issuer_ay", "now", "payment_challenge", "verifier_id"];
  return names.map((name, i) => ({ name, value: ps[i] }));
}

export function short(v: string | undefined, n = 6) {
  if (!v) return "";
  return v.length > n * 2 + 1 ? `${v.slice(0, n)}…${v.slice(-n)}` : v;
}
