# ZK Pass

**Verify once. Prove anywhere. Pay faster.**

ZK Pass is a privacy-preserving identity verification and payment authorization
prototype built for the PayPal AI Hackathon. A user completes an AI-assisted KYC
demo once, receives a signed reusable credential, and then proves eligibility with a
real zero-knowledge proof. A valid, payment-bound proof is the only thing that unlocks
a PayPal Sandbox checkout.

> Independent hackathon prototype — not an official PayPal product.
> All identity data is mock/test data. All payments run in **PayPal Sandbox** (no real money).

## Modules

| Module | What it does |
|---|---|
| **ZK Verify AI** | Guided, AI-assisted KYC demo: document upload, OCR, consistency checks, simulated liveness, human review |
| **ZK Passport** | Issuer-signed credential (EdDSA over BabyJubJub, Poseidon) and Groth16 proofs of `kyc_approved` + validity |
| **ZK Pay** | Payment gate that accepts only fresh, payment-bound proofs, then creates and captures a PayPal Sandbox order |

## External APIs used

| API | Used for | Cost |
|---|---|---|
| PayPal REST API (Sandbox) — OAuth2 + Orders v2 | Create and capture checkout orders | Free (Sandbox) |
| PayPal JavaScript SDK (Sandbox client ID) | Buyer approval popup | Free (Sandbox) |
| LLM (Ollama, local) — optional Gemini API free tier | KYC assistant, summaries, explanations | Free |

Everything else runs locally: Circom + snarkjs (ZK), Tesseract (OCR), SQLite/PostgreSQL.

## AI Tools & Models

_Filled in as the build progresses — required by the hackathon rules._

## Repository layout

```
circuits/   Circom circuit, trusted-setup scripts, proof tests
backend/    FastAPI API: auth, KYC, credentials, ZK verification, payment gate, PayPal
frontend/   Next.js web app
docs/       PRD and hackathon compliance checklist
```

## Status

Work in progress. See [`docs/PRD.md`](docs/PRD.md) for the full specification and
[`docs/HACKATHON.md`](docs/HACKATHON.md) for the submission checklist.

## License

[MIT](LICENSE)
