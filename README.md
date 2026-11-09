# ZK Pass

**Verify once. Prove anywhere. Pay faster.**

ZK Pass is a privacy-preserving identity verification and payment authorization
prototype built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

A user completes an AI-assisted KYC check once and receives an issuer-signed credential
bound to a secret that only their browser holds. When a payment needs proof that they
passed KYC, the browser generates a real **Groth16 zero-knowledge proof** instead of
sharing documents. Only a valid, payment-bound proof unlocks **PayPal Sandbox** checkout,
and the backend captures and validates the order server-side.

> Independent hackathon prototype, not an official PayPal product.
> All identity data is mock/test data and all payments run in **PayPal Sandbox**. No real money moves.

**Demo video:** _link coming soon_

![ZK Pass landing page](docs/screenshots/landing.png)

## What it does

| Module | What happens |
|---|---|
| **ZK Verify AI** | An AI assistant guides a KYC session. Tesseract OCR reads a SPECIMEN test card, rule-based checks compare it with what the user typed, liveness is **simulated and labelled**, and the AI writes a neutral evidence summary. A **human reviewer** approves or rejects. |
| **ZK Passport** | The browser creates a holder secret and sends only `Poseidon(secret)`. The issuer signs the credential (EdDSA on BabyJubJub over a Poseidon hash) with the `kyc_approved` claim and an expiry date. |
| **ZK Pay** | For each payment request, the browser proves in-circuit: valid issuer signature, holder binding, `kyc_approved = 1`, not expired. It outputs a one-time **nullifier** bound to that payment and a verifier-scoped **revocation tag**. |

The backend rejects proofs that are **altered**, **bound to another payment**, **stale**,
from an **untrusted issuer**, **revoked**, or **replayed**. Checkout stays locked until a
proof passes. The payment page has a *Try to break it* panel that demonstrates each case.

| A proof bound to another payment is rejected | A valid proof unlocks a real PayPal Sandbox capture |
|---|---|
| ![Rejected proof](docs/screenshots/rejected.png) | ![PayPal Sandbox receipt](docs/screenshots/receipt.png) |

| AI-guided document check | Human review with an AI evidence summary |
|---|---|
| ![KYC document step](docs/screenshots/verify.png) | ![Reviewer queue](docs/screenshots/review.png) |

### The privacy property

The verifier receives seven public values: the nullifier, revocation tag, issuer public key,
timestamp, payment challenge and verifier ID. It never sees the user's name, date of birth,
document number, credential ID or holder secret. Raw document images are processed in memory
and discarded; only masked fields and check outcomes are stored.

## Architecture

```mermaid
flowchart LR
    subgraph Browser
      UI[Next.js app] --> W[Holder secret<br/>localStorage]
      UI --> P[snarkjs prover<br/>Groth16]
    end
    UI -->|REST| API[FastAPI]
    API --> KYC[KYC: OCR + rules]
    API --> AI[AI: Ollama / Gemini / offline]
    API --> ZK[circuits/cli.mjs<br/>issuer + verifier]
    API --> DB[(SQLite / PostgreSQL)]
    API -->|Orders v2| PP[PayPal Sandbox]
    UI -->|JS SDK approval| PP
```

| Path | Contents |
|---|---|
| `circuits/` | Circom circuit `kyc_payment.circom`, Groth16 keys, signing/proving library, CLI bridge, tests |
| `backend/` | FastAPI app: auth, KYC, review, credentials, payment gate, PayPal, tests |
| `frontend/` | Next.js 16 app with in-browser proving |
| `samples/` | Fictional SPECIMEN test cards for the KYC demo |
| `docs/` | Product requirements, demo script, hackathon checklist, screenshots |

## External APIs used

| API | Used for | Cost |
|---|---|---|
| PayPal REST API, Sandbox: OAuth2 + Orders v2 (create, capture, get) | Checkout after the proof gate | Free |
| PayPal JavaScript SDK (Sandbox client ID) | Buyer approval popup | Free |
| Ollama (local) **or** Google Gemini API free tier | KYC assistant, field extraction, explanations, reviewer summary | Free |

Everything else runs locally: Circom and snarkjs (ZK), Tesseract (OCR), SQLite (database).
With `LLM_PROVIDER=none`, the app runs fully offline apart from PayPal.

## AI tools & models

- **Ollama with `llama3.2:3b`** (default, runs locally) or **Google Gemini `gemini-2.0-flash`** (free tier), selected by `LLM_PROVIDER`.
- Used to guide the user step by step, extract structured fields from noisy OCR text, explain failed checks in plain language, and write a neutral evidence summary for the reviewer.
- Guardrails: the model never approves or rejects a session and never judges identity or liveness from a face, voice or tone. Approval is a human decision backed by deterministic checks. If no model is reachable, deterministic templates take over so the flow never breaks.

## Run it locally

Setup takes about 20 minutes. Commands are shown for macOS/Linux, with the Windows
PowerShell version where it differs.

### Prerequisites
- [Node.js](https://nodejs.org) 20+ and npm
- [Python](https://www.python.org) 3.11+
- Tesseract OCR
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt install tesseract-ocr`
  - Windows: the UB Mannheim installer from the [Tesseract docs](https://tesseract-ocr.github.io/tessdoc/Installation.html); keep the default install folder
- A free [PayPal Developer](https://developer.paypal.com) account (see [PayPal Sandbox setup](#paypal-sandbox-setup))
- Optional: [Ollama](https://ollama.com) with `ollama pull llama3.2:3b`

### 1. ZK circuit tools (required: the backend uses them)
```bash
cd circuits
npm install
npm test            # 9 proof tests: valid, tampered, wrong payment, replay, expired, rogue issuer...
```
The proving and verification keys are committed in `circuits/keys/`. To regenerate them,
run `npm run setup` (macOS/Linux, about 7 minutes). It's a local, demo-only ceremony.

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate               # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                    # Windows: copy .env.example .env
python -m app.cli new-issuer-key        # prints a 64-character key for .env
```

Open `backend/.env` in a text editor (not the terminal) and fill in:

```
JWT_SECRET=any-long-random-string
ISSUER_PRIVATE_KEY_HEX=<the key printed by new-issuer-key>
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=<Sandbox client ID>
PAYPAL_CLIENT_SECRET=<Sandbox secret>
LLM_PROVIDER=none                       # or ollama / gemini
# Windows only, if tesseract isn't on PATH:
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Then seed the demo accounts and start the API:
```bash
python -m app.cli seed
uvicorn app.main:app --reload --port 8000
```
To check it's running, open http://localhost:8000/api/health; it should return `{"ok":true,...}`.
Run the tests with `python -m pytest -q tests` (32 tests; the PayPal tests mock the provider).

### 3. Frontend (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env.local              # Windows: copy .env.example .env.local
npm run dev
```
Open **http://localhost:3000**.

### Demo accounts
After `python -m app.cli seed`, every account uses the password `zkpass-demo-123`:

| Email | Role |
|---|---|
| `payer@zkpass.dev` | Completes KYC, holds the Passport, pays |
| `merchant@zkpass.dev` | Creates the payment request |
| `reviewer@zkpass.dev` | Approves or rejects KYC sessions |

## PayPal Sandbox setup

1. Sign in at [developer.paypal.com](https://developer.paypal.com) with any PayPal account, then open **Dashboard**.
2. Make sure the toggle at the top says **Sandbox**. Under **Apps & Credentials**, open the default app
   (or **Create App** with type *Merchant*) and copy the **Client ID** and **Secret** into `backend/.env`.
3. Under **Testing Tools → Sandbox Accounts**, find or create a **Personal** account to pay with,
   and view its email and password with **⋯ → View/Edit account**.

> **Developers in India:** PayPal doesn't support India-to-India payments, so if both the default
> business and personal Sandbox accounts are Indian, the buyer can't approve the order.
> Use **Create account** to add a **Personal** account with country **United States**, and pay with that.

This flow was verified end to end with a live Sandbox capture (see the receipt screenshot above).

## Walkthrough
1. Sign in as **payer**, open **Verify**, agree, keep the prefilled details, and upload
   `samples/specimen_pan_card.png`. Try `mismatch_name_card.png` to see checks fail.
2. Complete the simulated liveness step and submit.
3. In an incognito window, sign in as **reviewer**, open **Review queue** and approve.
4. As payer, open **Passport** and select **Issue Passport**.
5. In another browser or profile, sign in as **merchant**, open **Pay**, select **Create payment request**,
   and copy the link.
6. As payer, open the link. Use **Try to break it** to watch each bad proof get rejected, then select
   **Generate proof and unlock**. Pay with the Sandbox personal account, and the receipt shows the
   real PayPal order and capture IDs.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Can't reach the API at http://localhost:8000" | The backend isn't running. Start it (step 2) and keep its terminal open. |
| "OCR engine is not installed on the server" on document upload | Install Tesseract, or set `TESSERACT_CMD` in `backend/.env` to the full path of `tesseract.exe`. |
| Windows: "running scripts is disabled" on `activate` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| Typing `KEY=value` lines in PowerShell gives "not recognized" errors | Those lines belong inside `backend/.env`; open the file with `notepad .env`. |
| "PayPal Sandbox isn't configured" on the payment page | Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to `backend/.env` and restart the backend. |
| The PayPal popup won't let the buyer pay | Pay with a **United States** Sandbox personal account (see the India note above). The app shows PayPal's own error reason if a capture fails. |
| "This browser doesn't hold your Passport's secret" | The holder secret lives in the browser that issued the Passport. Use that browser, or reissue the Passport from the **Passport** page. |

## Security notes and limits
- The Groth16 setup is a local, single-contributor ceremony suitable for a demo only.
- The issuer key lives in `.env`; production would use a KMS or HSM.
- Liveness is simulated. Production KYC (Aadhaar/PAN, V-CIP) needs authorized integrations and a regulated entity.
- PayPal Checkout is a buyer-to-merchant flow. This is not a cross-border payout product, and zero-knowledge proofs don't speed up settlement; they remove repeated identity disclosure.

See [`docs/PRD.md`](docs/PRD.md) for the full specification.

## License

[MIT](LICENSE)
