// ZK Pass — credential + proof helpers shared by the issuer, prover and verifier.
import { buildEddsa, buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KEYS_DIR = path.join(HERE, "..", "keys");
export const WASM_PATH = path.join(KEYS_DIR, "kyc_payment.wasm");
export const ZKEY_PATH = path.join(KEYS_DIR, "kyc_payment.zkey");
export const VKEY_PATH = path.join(KEYS_DIR, "verification_key.json");
export const CIRCUIT_VERSION = "kyc_payment@1";
export const SCHEMA_VERSION = 1n;

// BN254 scalar field
export const FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

let _eddsa, _poseidon;
async function crypto() {
  if (!_eddsa) {
    _eddsa = await buildEddsa();
    _poseidon = await buildPoseidon();
  }
  return { eddsa: _eddsa, poseidon: _poseidon, F: _poseidon.F };
}

/** Random field element (248 bits keeps it safely below the field modulus). */
export function randomFieldElement() {
  return BigInt("0x" + randomBytes(31).toString("hex"));
}

export async function poseidonHash(inputs) {
  const { poseidon, F } = await crypto();
  return F.toObject(poseidon(inputs.map(BigInt)));
}

// ---------- issuer ----------

export async function issuerPublicKey(issuerPrivHex) {
  const { eddsa, F } = await crypto();
  const pub = eddsa.prv2pub(Buffer.from(issuerPrivHex, "hex"));
  return { ax: F.toObject(pub[0]).toString(), ay: F.toObject(pub[1]).toString() };
}

export function newIssuerPrivateKey() {
  return randomBytes(32).toString("hex");
}

export async function credentialMessage({ credentialId, holderCommitment, kycApproved, expiresAt }) {
  return poseidonHash([
    SCHEMA_VERSION,
    BigInt(credentialId),
    BigInt(holderCommitment),
    BigInt(kycApproved),
    BigInt(expiresAt),
  ]);
}

/** Sign a credential. Only call after the KYC session was approved. */
export async function signCredential(issuerPrivHex, fields) {
  const { eddsa, F } = await crypto();
  const msg = await credentialMessage(fields);
  const sig = eddsa.signPoseidon(Buffer.from(issuerPrivHex, "hex"), F.e(msg));
  return {
    s: sig.S.toString(),
    r8x: F.toObject(sig.R8[0]).toString(),
    r8y: F.toObject(sig.R8[1]).toString(),
  };
}

/** Check an issuer signature outside the circuit (used when issuing / on import). */
export async function verifyCredentialSignature(issuerPub, fields, signature) {
  const { eddsa, F } = await crypto();
  const msg = await credentialMessage(fields);
  return eddsa.verifyPoseidon(
    F.e(msg),
    { R8: [F.e(BigInt(signature.r8x)), F.e(BigInt(signature.r8y))], S: BigInt(signature.s) },
    [F.e(BigInt(issuerPub.ax)), F.e(BigInt(issuerPub.ay))],
  );
}

// ---------- holder ----------

export async function holderCommitment(holderSecret) {
  return (await poseidonHash([BigInt(holderSecret)])).toString();
}

export async function revocationTag(credentialId, verifierId) {
  return (await poseidonHash([BigInt(credentialId), BigInt(verifierId)])).toString();
}

export function buildProofInput({ issuerPub, now, paymentChallenge, verifierId, holderSecret, credential }) {
  return {
    issuer_ax: issuerPub.ax,
    issuer_ay: issuerPub.ay,
    now: String(now),
    payment_challenge: String(paymentChallenge),
    verifier_id: String(verifierId),
    holder_secret: String(holderSecret),
    credential_id: String(credential.credentialId),
    kyc_approved: String(credential.kycApproved),
    expires_at: String(credential.expiresAt),
    sig_s: credential.signature.s,
    sig_r8x: credential.signature.r8x,
    sig_r8y: credential.signature.r8y,
  };
}

export async function prove(input, { wasm = WASM_PATH, zkey = ZKEY_PATH } = {}) {
  const started = Date.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  return { proof, publicSignals, provingMs: Date.now() - started };
}

// Public signal order: outputs first, then public inputs in declaration order.
export function parsePublicSignals(ps) {
  const [nullifier, revocation_tag, issuer_ax, issuer_ay, now, payment_challenge, verifier_id] = ps;
  return { nullifier, revocation_tag, issuer_ax, issuer_ay, now, payment_challenge, verifier_id };
}

let _vkey;
export async function verifyProof(proof, publicSignals) {
  _vkey ??= JSON.parse(readFileSync(VKEY_PATH, "utf8"));
  try {
    return await snarkjs.groth16.verify(_vkey, publicSignals, proof);
  } catch {
    return false;
  }
}

/** Stop snarkjs/ffjavascript worker threads so short-lived processes can exit. */
export async function shutdown() {
  if (globalThis.curve_bn128) await globalThis.curve_bn128.terminate();
}
