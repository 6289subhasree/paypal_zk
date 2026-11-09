pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// ZK Pass — payment-bound KYC credential proof (circuit v2)
//
// Proves, without revealing the credential or the holder's secret:
//   1. The issuer (public key Ax, Ay) signed this credential.
//   2. The credential belongs to the prover (knows holder_secret behind holder_commitment).
//   3. The credential says kyc_approved = 1.
//   4. The credential has not expired at time `now`.
//   5. The proof is bound to one payment challenge, producing a one-time nullifier.
//   6. A verifier-scoped revocation tag lets the verifier check revocation
//      without learning the credential id itself.
//   7. The holder is at least `min_age` years old on `today`, without revealing
//      the date of birth. With min_age = 0 this check always passes.
//
// Signed message:
//   M = Poseidon(SCHEMA_VERSION, credential_id, holder_commitment, kyc_approved, expires_at, birth_date)
//   Dates for the age check are YYYYMMDD integers, so "born on or before
//   today minus N years" is simply birth_date <= today - N * 10000.
//   holder_commitment = Poseidon(holder_secret)
template KycPaymentProof() {
    var SCHEMA_VERSION = 2;

    // ---- public inputs ----
    signal input issuer_ax;
    signal input issuer_ay;
    signal input now;                // unix seconds, supplied by the verifier
    signal input payment_challenge;  // random value issued per payment request
    signal input verifier_id;        // domain separator for the verifier
    signal input today;              // YYYYMMDD, supplied by the verifier
    signal input min_age;            // required age in years, 0 = no age check

    // ---- private inputs (witness) ----
    signal input holder_secret;
    signal input credential_id;
    signal input kyc_approved;
    signal input expires_at;
    signal input birth_date;         // YYYYMMDD
    signal input sig_s;
    signal input sig_r8x;
    signal input sig_r8y;

    // ---- public outputs ----
    signal output nullifier;
    signal output revocation_tag;

    // Holder binding
    component holderHash = Poseidon(1);
    holderHash.inputs[0] <== holder_secret;

    // Credential message
    component msgHash = Poseidon(6);
    msgHash.inputs[0] <== SCHEMA_VERSION;
    msgHash.inputs[1] <== credential_id;
    msgHash.inputs[2] <== holderHash.out;
    msgHash.inputs[3] <== kyc_approved;
    msgHash.inputs[4] <== expires_at;
    msgHash.inputs[5] <== birth_date;

    // Issuer signature
    component sig = EdDSAPoseidonVerifier();
    sig.enabled <== 1;
    sig.Ax <== issuer_ax;
    sig.Ay <== issuer_ay;
    sig.S <== sig_s;
    sig.R8x <== sig_r8x;
    sig.R8y <== sig_r8y;
    sig.M <== msgHash.out;

    // Claim: KYC approved
    kyc_approved === 1;

    // Claim: not expired (now < expires_at), both range-checked to 64 bits
    component nowBits = Num2Bits(64);
    nowBits.in <== now;
    component expBits = Num2Bits(64);
    expBits.in <== expires_at;
    component notExpired = LessThan(64);
    notExpired.in[0] <== now;
    notExpired.in[1] <== expires_at;
    notExpired.out === 1;

    // Claim: at least min_age years old on `today` (all values range-checked)
    component todayBits = Num2Bits(32);
    todayBits.in <== today;
    component birthBits = Num2Bits(32);
    birthBits.in <== birth_date;
    component minAgeBits = Num2Bits(8);
    minAgeBits.in <== min_age;
    signal age_threshold;
    age_threshold <== today - min_age * 10000;
    component thresholdBits = Num2Bits(32);
    thresholdBits.in <== age_threshold;
    component oldEnough = LessEqThan(32);
    oldEnough.in[0] <== birth_date;
    oldEnough.in[1] <== age_threshold;
    oldEnough.out === 1;

    // One-time nullifier, bound to this payment and verifier
    component nul = Poseidon(4);
    nul.inputs[0] <== holder_secret;
    nul.inputs[1] <== credential_id;
    nul.inputs[2] <== payment_challenge;
    nul.inputs[3] <== verifier_id;
    nullifier <== nul.out;

    // Verifier-scoped revocation tag
    component rev = Poseidon(2);
    rev.inputs[0] <== credential_id;
    rev.inputs[1] <== verifier_id;
    revocation_tag <== rev.out;
}

component main { public [issuer_ax, issuer_ay, now, payment_challenge, verifier_id, today, min_age] } = KycPaymentProof();
