#!/usr/bin/env bash
# Compile the circuit and run a LOCAL Groth16 trusted setup.
#
# This setup is for the hackathon demo only. A production deployment would use a
# public multi-party Powers of Tau ceremony and a multi-contributor phase 2.
set -euo pipefail
cd "$(dirname "$0")/.."

CIRCUIT=kyc_payment
POWER=14   # 2^14 = 16384 constraints; the circuit has ~10.8k
BUILD=build
KEYS=keys
mkdir -p "$BUILD" "$KEYS"

echo "==> Compiling circuit"
npx circom2 "src/$CIRCUIT.circom" --r1cs --wasm --sym -o "$BUILD"

PTAU="$BUILD/pot${POWER}_final.ptau"
if [ ! -f "$PTAU" ]; then
  echo "==> Powers of Tau (phase 1, local)"
  npx snarkjs powersoftau new bn128 $POWER "$BUILD/pot_0000.ptau"
  npx snarkjs powersoftau contribute "$BUILD/pot_0000.ptau" "$BUILD/pot_0001.ptau" \
    --name="zkpass-local" -e="$(head -c 64 /dev/urandom | base64)"
  npx snarkjs powersoftau prepare phase2 "$BUILD/pot_0001.ptau" "$PTAU"
fi

echo "==> Groth16 phase 2"
npx snarkjs groth16 setup "$BUILD/$CIRCUIT.r1cs" "$PTAU" "$BUILD/${CIRCUIT}_0000.zkey"
npx snarkjs zkey contribute "$BUILD/${CIRCUIT}_0000.zkey" "$KEYS/$CIRCUIT.zkey" \
  --name="zkpass-local-phase2" -e="$(head -c 64 /dev/urandom | base64)"
npx snarkjs zkey export verificationkey "$KEYS/$CIRCUIT.zkey" "$KEYS/verification_key.json"
cp "$BUILD/${CIRCUIT}_js/$CIRCUIT.wasm" "$KEYS/$CIRCUIT.wasm"

echo "==> Done. Artifacts in $KEYS/"
ls -lh "$KEYS"
