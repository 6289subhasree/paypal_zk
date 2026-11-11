# Devpost submission draft

Copy each section into the matching Devpost field.

## Project name
ZK Pass

## Tagline (elevator pitch)
Verify once, then pay with a zero-knowledge proof instead of your ID. Only a valid, payment-bound proof unlocks PayPal checkout.

## Inspiration
Every new app, marketplace or client asks for the same thing: upload your ID, take a selfie, wait. Each time, a full copy of your identity lands in one more database. In India that usually means Aadhaar or PAN scans sitting with companies that only needed one fact: did this person pass KYC?

We wanted to separate that fact from the documents behind it. Zero-knowledge proofs make that possible. We wanted to see whether a proof could be more than a "Verified ✓" badge and actually be the thing that decides whether a payment goes through.

## What it does
ZK Pass is an end-to-end privacy-preserving identity verification and payment authorization platform built across five core capabilities:

1. **ZK Verify AI:** An AI assistant guides the user through an identity check using a SPECIMEN test card. Tesseract OCR reads the card, deterministic checks validate field consistency, and an AI companion explains failed checks in plain language while compiling an evidence summary. An on-device active liveness check executes in the browser using MediaPipe face mesh landmarks (tracking blinks and rotational turns with zero video or frames uploaded). Human reviewers make final approval decisions.

2. **ZK Passport:** Upon KYC confirmation, the user's browser generates a 248-bit secret and submits only its Poseidon commitment hash. The issuer returns an EdDSA signature over the BabyJubJub curve certifying KYC approval and birthdate without storing the private key.

3. **ZK Pay:** A merchant creates a payment request. To pay, the user's browser compiles a Groth16 zero-knowledge proof (~2s via `snarkjs`) demonstrating valid issuer signatures, unrevoked status, holder binding, and optional 18+ age verification without disclosing date of birth. Each proof is cryptographically bound to that exact payment challenge and issues a single-use nullifier. The backend verifies the proof server-side before unlocking PayPal Sandbox Orders v2 checkout, PayPal Vault 1-click pay, and verified Payouts.

4. **Agentic Commerce & Channel3 Shopping Agent (`/agent`):** An autonomous AI purchasing assistant connects buyers to real-time product catalogs across 100M+ items via the **Channel3 API**. When the agent executes a purchase, it uses a delegated ZK Pass proof to authorize PayPal checkout without the merchant or AI ever seeing the user's real name, address, or credit card details.

5. **Enterprise Compliance & Audit with AG Grid & Bryntum (`/review`, `/history`):**
   - **AG Grid Cryptographic Audit Ledger:** Live financial audit trail displaying Groth16 public signals, nullifiers, revocation tags, and PayPal capture IDs with column pinning, sorting, filtering, and 1-click CSV/Excel export.
   - **Bryntum Compliance TaskBoard:** Visual drag-and-drop verification workflow board managing sessions from OCR ingestion to cryptographic passport issuance.

6. **Developer Portal & SDKs via APIMatic (`/developers`):** Complete OpenAPI 3.0 specification with multi-language client SDKs (TypeScript, Python, Go, PHP) enabling web2 merchants to integrate ZK-gated checkout in under five lines of code.

## How we built it
- **Circuit:** Circom 2 with `circomlib` (BabyJubJub EdDSA verifier, Poseidon hashing, numeric date comparators), ~11k constraints compiled via `snarkjs` for client-side Groth16 proving in ~2 seconds.
- **Backend:** FastAPI with SQLAlchemy, bcrypt password hashing, JWT tokens, and Node.js cryptographic bridge.
- **PayPal Integration:** Orders API v2 (create & capture), Payments API v2 (refunds), Payouts API v1, and PayPal Vault (`store_in_vault`, `vault_id`) with `PayPal-Request-Id` idempotency.
- **Agentic Commerce & Catalog:** Channel3 Product Search API supplying structured, normalized real-time e-commerce catalogs to autonomous AI shopping agents.
- **Enterprise UI Components:**
  - `@ag-grid-community/react` for high-performance virtualized cryptographic audit grids.
  - Bryntum TaskBoard for compliance reviewer lifecycle state visualization.
- **API Standards & SDKs:** APIMatic-validated OpenAPI 3.0 specification generating idiomatic client libraries across multiple languages.
- **Cloud Infrastructure:** Multi-service cloud deployment orchestrated through a unified `render.yaml` blueprint with health checks and environment secrets management.
- **Liveness & Computer Vision:** On-device MediaPipe Face Landmarker WASM model tracking eye-blink blendshapes and nose-to-cheek head turns.
- **AI Guidance:** Gemini 2.0 Flash / local Ollama (`llama3.2:3b`) for OCR parsing, failed-check explanations, and evidence summarization.
- **Frontend Architecture:** Next.js 16 (App Router, Turbopack), React 19, and Tailwind CSS v4 with authentic Cotool typography (`Moderat Serif` and `Suisse Intl`).

## Challenges we ran into
- **Binding Proofs to One-Time Payments:** Ensuring a valid proof cannot be intercepted and replayed on other payments. Solved by injecting `Poseidon(amount, currency, merchant_id, nonce)` as a public challenge constraint in Circom and enforcing deterministic nullifiers on the server.
- **Secret Separation:** Keeping the holder secret exclusively in browser local storage while enabling the issuer to sign an attested credential. Solved using Poseidon commitment hashing.
- **Cross-Service Deployment:** Synchronizing Python/Tesseract backend services with Next.js WASM and proving keys on Render using a single declarative `render.yaml` blueprint.

## Accomplishments that we're proud of
- Real cryptographic enforcement: four distinct malicious proof attacks (*tampered witness, mismatched payment challenge, stale timestamp, replay attempt*) are rejected server-side, keeping PayPal checkout strictly locked.
- Complete ecosystem integration: seamlessly unifying ZK proofs, PayPal Sandbox, Channel3 agentic commerce, AG Grid analytics, Bryntum workflow boards, and APIMatic SDKs.
- Zero raw document or PII storage: verifiers only ever receive 9 cryptographic numbers and zero identity data.

## What we learned
How domain separation, public inputs, and single-use nullifiers transform zero-knowledge proofs from passive credentials into active, tamper-proof payment authorization gates.

## What's next for ZK Pass
- Selective-disclosure credentials for geographic residency (e.g. proof of US/EU residency without disclosing street address).
- Production certified liveness SDK integration with accredited KYC authorities.
- On-chain smart contract verifier for decentralized cross-border settlements.

## Built with
circom, snarkjs, groth16, poseidon, eddsa, babyjubjub, paypal-orders-api, paypal-vault, paypal-payouts, paypal-javascript-sdk, channel3-api, ag-grid, bryntum, apimatic, render, mediapipe, gemini-ai, python, fastapi, sqlalchemy, nextjs, react, typescript, tailwindcss, tesseract-ocr

## Links
- Repository: https://github.com/6289subhasree/paypal_zk
- Personal Mirror: https://github.com/ayushkumar2601/zkpass
- Live Cloud Deployment: https://zkpass.onrender.com
- Sponsor Integration Guide: docs/TRACKS_AND_INTEGRATIONS.md

## Testing instructions for judges
1. Open the live app (or run locally via `npm run dev` in `frontend/` and `uvicorn backend.app.main:app` in `backend/`).
2. Log in using the 1-click demo accounts:
   - `payer@zkpass.dev` (Buyer with KYC and active ZK Passport)
   - `merchant@zkpass.dev` (Payment recipient)
   - `reviewer@zkpass.dev` (Compliance reviewer with AG Grid & Bryntum access)
   - Password for all accounts: `zkpass-demo-123`
3. Visit `/agent` to test the Channel3 autonomous shopping agent and delegated ZK checkout.
4. Visit `/pay` to test the "Try to break it" proof attack suite and unlock PayPal Sandbox checkout.
5. Visit `/history` to explore the AG Grid cryptographic audit ledger and export CSV records.
6. Visit `/review` to test the Bryntum compliance taskboard and approve pending KYC sessions.
7. Visit `/developers` to inspect the APIMatic OpenAPI specification and merchant SDK snippets.
