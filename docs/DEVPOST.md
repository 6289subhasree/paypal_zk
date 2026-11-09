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
ZK Pass has three connected parts.

**ZK Verify AI.** An AI assistant guides the user through a demo identity check using a SPECIMEN test card. Tesseract OCR reads the card, rule-based checks compare it with what the user typed, and the AI explains failed checks in plain language and writes a neutral evidence summary. A human reviewer approves or rejects. The AI never makes the decision, and liveness is clearly labelled as simulated.

**ZK Passport.** After approval, the user's browser generates a secret and sends only its Poseidon hash. The issuer signs a credential (EdDSA on BabyJubJub) that contains the `kyc_approved` claim, an expiry date and that holder commitment. The user's name, date of birth and document number are not in it.

**ZK Pay.** A merchant creates a payment request. To pay, the user's browser generates a Groth16 proof that the credential is signed by the trusted issuer, belongs to them, says KYC approved and hasn't expired. The proof is bound to that exact payment request and outputs a one-time nullifier. The backend verifies it and only then lets PayPal Sandbox checkout open. It creates and captures the order server-side and shows PayPal's real order and capture IDs on the receipt.

The verifier receives seven numbers and no identity data.

The payment page has a "Try to break it" panel. An altered proof, a real proof for a different payment, an old proof and a replayed proof are each rejected with a reason, and checkout stays locked.

## How we built it
- **Circuit:** Circom 2 with circomlib (EdDSA-Poseidon verifier, Poseidon, comparators), about 10.8k constraints, Groth16 via snarkjs. Proofs are generated in the browser in about 2 seconds.
- **Backend:** FastAPI and SQLAlchemy (SQLite, PostgreSQL-ready), bcrypt and JWT auth. A Node bridge handles issuer signing and proof verification.
- **Payment gate:** checks the proof, the issuer key, the verifier ID, the payment challenge, proof freshness, a verifier-scoped revocation tag, and that the nullifier hasn't been used.
- **PayPal:** REST Orders API v2 (OAuth2, create, capture) with `PayPal-Request-Id` idempotency keys. The capture is validated against status, reference ID, amount and currency before a payment is marked paid. The PayPal JavaScript SDK handles buyer approval.
- **AI:** a local LLM through Ollama (`llama3.2:3b`) or the Gemini API free tier, with an offline template fallback. It's used for guidance, OCR field extraction, failed-check explanations and reviewer summaries.
- **Frontend:** Next.js 16, React 19 and Tailwind v4. The passport is drawn as a security-printed document, and proof results land on it as stamps.
- **Tests:** 9 circuit tests and 32 backend tests covering tampered proofs, altered public inputs, wrong-payment binding, replay, expiry, revocation, rogue issuers and holder substitution.

No paid APIs. Everything except PayPal Sandbox can run offline.

## Challenges we ran into
- Making the proof actually enforce something. Binding it to one payment challenge and adding a deterministic nullifier is what turns a valid proof into a one-time authorization.
- Keeping the holder secret in the browser while still letting the issuer sign something bound to it. The answer was a Poseidon commitment, which needed the browser hash to match the circuit's hash exactly.
- An expiry check inside a circuit can only compare against a time that someone supplies. The circuit proves `expires_at > now`, and the server separately checks that `now` is actually current.
- Being honest about what the AI should and shouldn't do in KYC. We kept it in a guiding and summarizing role and left the decision to a person.
- Small real-world things: Windows Tesseract paths, timezone handling of stored expiry dates, and Sandbox account setup in India.

## Accomplishments that we're proud of
- A real ZK circuit and a real payment gate, not a UI badge.
- The rejected-versus-accepted moment: four kinds of bad proof bounce, and one fresh proof opens PayPal checkout.
- No raw document or witness data is stored or logged, and every simulated part is labelled as simulated.

## What we learned
How Groth16 public inputs, nullifiers and domain separation fit together. Why "verify the proof" is never enough on its own (you also have to check who issued it, for what and when). How to put an LLM into a compliance-sensitive flow without letting it make the decision.

## What's next for ZK Pass
- More selective-disclosure claims, such as "over 18" or "resident of country X", from the same credential.
- On-chain verification and revocation registries as an alternative to the backend verifier.
- A certified liveness SDK and an authorized KYC partner instead of the demo flow.
- Letting AI shopping agents carry a ZK Pass, so an agent can prove its user is verified and authorized for one specific purchase without seeing the user's identity.

## Built with
circom, snarkjs, groth16, poseidon, eddsa, python, fastapi, sqlalchemy, sqlite, node.js, next.js, react, typescript, tailwindcss, tesseract, ollama, llama, gemini, paypal-orders-api, paypal-javascript-sdk

## AI tools and models used
Ollama running `llama3.2:3b` locally (default), or Google Gemini `gemini-2.0-flash` (free tier). Used for the KYC assistant, OCR field extraction, failed-check explanations and the reviewer evidence summary.

## Links
- Repo: https://github.com/6289subhasree/paypal_zk
- Demo video: (paste YouTube link)

## Testing instructions for judges
Follow "Run it locally" in the README. Demo accounts: payer@zkpass.dev, merchant@zkpass.dev and reviewer@zkpass.dev, password `zkpass-demo-123`. Pay with a PayPal Sandbox personal account.
