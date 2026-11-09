import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  newIssuerPrivateKey, issuerPublicKey, signCredential, verifyCredentialSignature,
  holderCommitment, randomFieldElement, buildProofInput, prove, verifyProof,
  parsePublicSignals, revocationTag, shutdown, todayYmd,
} from "../lib/zkpass.mjs";

const NOW = 1_800_000_000;
const VERIFIER_ID = 42n;
const TODAY = todayYmd(new Date(NOW * 1000)); // 20270115
const BIRTH_DATE = 19990814;
let issuerPriv, issuerPub, holderSecret, credential;

async function makeCredential({ kycApproved = 1, expiresAt = NOW + 86_400, priv = issuerPriv, birthDate = BIRTH_DATE } = {}) {
  const credentialId = randomFieldElement();
  const fields = {
    credentialId,
    holderCommitment: await holderCommitment(holderSecret),
    kycApproved,
    expiresAt,
    birthDate,
  };
  return { ...fields, signature: await signCredential(priv, fields) };
}

function input(overrides = {}) {
  return buildProofInput({
    issuerPub, now: NOW, today: TODAY, paymentChallenge: 777n, verifierId: VERIFIER_ID,
    holderSecret, credential, ...overrides,
  });
}

before(async () => {
  issuerPriv = newIssuerPrivateKey();
  issuerPub = await issuerPublicKey(issuerPriv);
  holderSecret = randomFieldElement();
  credential = await makeCredential();
});

test("issuer signature verifies outside the circuit", async () => {
  assert.equal(await verifyCredentialSignature(issuerPub, credential, credential.signature), true);
  const forged = { ...credential, kycApproved: 0 };
  assert.equal(await verifyCredentialSignature(issuerPub, forged, credential.signature), false);
});

test("valid proof verifies and exposes only expected public signals", async () => {
  const { proof, publicSignals } = await prove(input());
  assert.equal(await verifyProof(proof, publicSignals), true);
  const p = parsePublicSignals(publicSignals);
  assert.equal(p.payment_challenge, "777");
  assert.equal(p.issuer_ax, issuerPub.ax);
  assert.equal(p.revocation_tag, await revocationTag(credential.credentialId, VERIFIER_ID));
  assert.ok(!publicSignals.includes(String(holderSecret)));
  assert.ok(!publicSignals.includes(String(credential.credentialId)));
});

test("modified proof fails verification", async () => {
  const { proof, publicSignals } = await prove(input());
  const tampered = structuredClone(proof);
  tampered.pi_a[0] = (BigInt(tampered.pi_a[0]) + 1n).toString();
  assert.equal(await verifyProof(tampered, publicSignals), false);
});

test("altered public inputs fail verification (proof for another payment)", async () => {
  const { proof, publicSignals } = await prove(input());
  const moved = [...publicSignals];
  moved[5] = "778"; // payment_challenge
  assert.equal(await verifyProof(proof, moved), false);
  const otherIssuer = [...publicSignals];
  otherIssuer[2] = "1";
  assert.equal(await verifyProof(proof, otherIssuer), false);
});

test("same credential + same payment gives the same nullifier (replay detectable)", async () => {
  const a = parsePublicSignals((await prove(input())).publicSignals);
  const b = parsePublicSignals((await prove(input())).publicSignals);
  const c = parsePublicSignals((await prove(input({ paymentChallenge: 999n }))).publicSignals);
  assert.equal(a.nullifier, b.nullifier);
  assert.notEqual(a.nullifier, c.nullifier);
});

test("expired credential cannot produce a proof", async () => {
  const expired = await makeCredential({ expiresAt: NOW - 1 });
  await assert.rejects(prove(input({ credential: expired })));
});

test("credential without kyc_approved cannot produce a proof", async () => {
  const pending = await makeCredential({ kycApproved: 0 });
  await assert.rejects(prove(input({ credential: pending })));
});

test("credential signed by an untrusted issuer cannot produce a proof for the trusted issuer", async () => {
  const rogue = await makeCredential({ priv: newIssuerPrivateKey() });
  await assert.rejects(prove(input({ credential: rogue })));
});

test("another holder cannot use the credential", async () => {
  await assert.rejects(prove(input({ holderSecret: randomFieldElement() })));
});

test("adult passes an 18+ check without revealing the birth date", async () => {
  const { proof, publicSignals } = await prove(input({ minAge: 18 }));
  assert.equal(await verifyProof(proof, publicSignals), true);
  const p = parsePublicSignals(publicSignals);
  assert.equal(p.min_age, "18");
  assert.equal(p.today, String(TODAY));
  assert.ok(!publicSignals.includes(String(BIRTH_DATE)));
});

test("turning 18 exactly today passes, one day short fails", async () => {
  const birthday18 = await makeCredential({ birthDate: TODAY - 180000 });
  const { proof, publicSignals } = await prove(input({ credential: birthday18, minAge: 18 }));
  assert.equal(await verifyProof(proof, publicSignals), true);
  const dayShort = await makeCredential({ birthDate: TODAY - 180000 + 1 });
  await assert.rejects(prove(input({ credential: dayShort, minAge: 18 })));
});

test("minor cannot prove 18+, but can still pay where no age is required", async () => {
  const minor = await makeCredential({ birthDate: 20150101 });
  await assert.rejects(prove(input({ credential: minor, minAge: 18 })));
  const { proof, publicSignals } = await prove(input({ credential: minor, minAge: 0 }));
  assert.equal(await verifyProof(proof, publicSignals), true);
});

test("age requirement and date cannot be changed after proving", async () => {
  const { proof, publicSignals } = await prove(input({ minAge: 0 }));
  const claimed18 = [...publicSignals];
  claimed18[8] = "18"; // min_age
  assert.equal(await verifyProof(proof, claimed18), false);
  const otherDay = [...publicSignals];
  otherDay[7] = String(TODAY + 1); // today
  assert.equal(await verifyProof(proof, otherDay), false);
});

test("birth date is part of the signed credential", async () => {
  const forged = { ...credential, birthDate: 19500101 };
  assert.equal(await verifyCredentialSignature(issuerPub, forged, credential.signature), false);
  await assert.rejects(prove(input({ credential: forged, minAge: 18 })));
});

after(shutdown);
