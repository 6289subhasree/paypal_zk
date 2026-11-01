#!/usr/bin/env node
// JSON-over-stdio bridge used by the FastAPI backend.
//   echo '{"cmd":"verify","proof":{...},"publicSignals":[...]}' | node cli.mjs
// Commands: issuer-pubkey, sign, verify-signature, verify, revocation-tag, prove
// Private keys and witness values are never written to stdout logs by this script.
import {
  issuerPublicKey, signCredential, verifyCredentialSignature, verifyProof,
  parsePublicSignals, revocationTag, prove, buildProofInput, holderCommitment,
  randomFieldElement, shutdown, CIRCUIT_VERSION,
} from "./lib/zkpass.mjs";

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data ? JSON.parse(data) : {};
}

const handlers = {
  async "issuer-pubkey"({ issuerPrivHex }) {
    return issuerPublicKey(issuerPrivHex);
  },
  async sign({ issuerPrivHex, credential }) {
    return { signature: await signCredential(issuerPrivHex, credential) };
  },
  async "verify-signature"({ issuerPub, credential, signature }) {
    return { valid: await verifyCredentialSignature(issuerPub, credential, signature) };
  },
  async verify({ proof, publicSignals }) {
    const valid = await verifyProof(proof, publicSignals);
    return { valid, circuitVersion: CIRCUIT_VERSION, signals: valid ? parsePublicSignals(publicSignals) : null };
  },
  async "revocation-tag"({ credentialIds, verifierId }) {
    return { tags: await Promise.all(credentialIds.map((id) => revocationTag(id, verifierId))) };
  },
  // Demo helpers: in the app, proving runs in the holder's browser.
  async "holder-commitment"({ holderSecret }) {
    return { commitment: await holderCommitment(holderSecret) };
  },
  async "random-field"() {
    return { value: randomFieldElement().toString() };
  },
  async prove(args) {
    return prove(buildProofInput(args));
  },
};

try {
  const req = await readStdin();
  const handler = handlers[req.cmd];
  if (!handler) throw new Error(`unknown command: ${req.cmd}`);
  process.stdout.write(JSON.stringify({ ok: true, result: await handler(req) }));
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(err.message ?? err).split("\n")[0] }));
} finally {
  await shutdown();
}
