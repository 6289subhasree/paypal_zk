# ZK PayPal --- Product Requirements Document (PRD)

**Version:** 1.0\
**Product tagline:** *Verify once. Prove anywhere. Pay faster.*\
**Document status:** Hackathon MVP specification

------------------------------------------------------------------------

## 1. Executive Summary

ZK PayPal is a privacy-preserving identity verification and payment
authorization platform. It combines AI-assisted Know Your Customer
(KYC), reusable cryptographically signed identity credentials,
Zero-Knowledge (ZK) proofs, and a PayPal Sandbox checkout flow.

The product is organized into three connected modules:

1.  **ZK Verify AI** --- guides users through an AI-assisted identity
    verification session, document checks, and liveness workflow.
2.  **ZK Passport** --- issues a reusable, signed credential after
    verification and lets users prove specific eligibility claims
    without exposing their underlying identity documents.
3.  **ZK Pay** --- uses verified eligibility as a payment gate and
    demonstrates a payment through the official PayPal Sandbox Orders
    API.

The hackathon demonstration will use controlled test data and a mock
credential issuer. It will demonstrate the complete technical flow from
verification to credential issuance, proof generation and verification,
payment authorization, and a captured PayPal Sandbox transaction.

> **Important scope distinction:** ZK proofs can reduce repeated
> identity disclosure and streamline eligibility checks. They do not, by
> themselves, accelerate bank settlement, foreign-exchange processing,
> remittance, or regulatory review. PayPal Sandbox checkout demonstrates
> a buyer-to-merchant payment flow; it does not demonstrate an
> international payout to an Indian recipient's bank account.

------------------------------------------------------------------------

## 2. Problem Statement

Users may be asked to repeat identity verification across services and
transactions. This can create friction, duplicate document handling,
unnecessary exposure of personal information, and delays while checks
are repeated.

For users receiving cross-border payments, identity verification and
payment settlement can also be confused as a single process. In
practice, identity checks, payment authorization, provider processing,
foreign exchange, and bank settlement are separate stages.

ZK PayPal addresses the identity and authorization part of this
experience:

-   Verify a user's identity through a guided KYC workflow.
-   Issue a reusable credential after the verification process.
-   Allow the user to prove a specific claim, such as meeting an
    eligibility requirement, without revealing the full underlying
    identity record.
-   Gate a payment action on successful proof verification.
-   Demonstrate the payment flow through PayPal Sandbox.

### 2.1 Product Goals

-   Reduce repeated identity-document disclosure.
-   Provide a reusable, cryptographically verifiable identity
    credential.
-   Demonstrate a genuine ZK proof rather than a UI-only verification
    flag.
-   Make the proof independently verifiable by a backend and/or smart
    contract.
-   Connect proof verification to payment authorization.
-   Complete a real PayPal Sandbox order capture and display the
    provider transaction identifier.

### 2.2 Non-Goals for the Hackathon MVP

-   Production Aadhaar authentication or live Aadhaar data access.
-   Production PAN verification unless an authorized integration is
    available.
-   Replacing a regulated entity's KYC or Video-based Customer
    Identification Process (V-CIP) obligations.
-   Replacing an authorized human official with an autonomous AI
    decision-maker.
-   Demonstrating actual international remittance or bank payout to
    India.
-   Claiming that ZK proofs remove regulatory, compliance, settlement,
    or provider processing time.

------------------------------------------------------------------------

## 3. Product Modules

### 3.1 ZK Verify AI --- AI-Assisted KYC

A guided identity-verification experience that helps the user complete a
verification session.

**Core capabilities**

-   Conversational onboarding and verification guidance.
-   Video-session interface for a guided KYC demonstration.
-   Document upload using controlled sample/test documents.
-   OCR and document-field extraction.
-   Consistency checks across submitted fields and extracted document
    data.
-   Liveness checks through a dedicated liveness subsystem or approved
    SDK.
-   Session summary and evidence packaging for review.
-   Human-review state for uncertain or failed checks.

**Role of AI**

AI may guide the user, explain the process, collect structured
responses, extract document fields, identify inconsistencies, summarize
evidence, and route cases for review.

AI must not independently make a legally binding KYC approval decision
where applicable rules require an authorized official or regulated
entity to conduct or supervise the process. An LLM must not infer
identity or liveness from conversational confidence, voice
characteristics, facial expression, or other unreliable proxies.

For the hackathon, the workflow should be explicitly labelled as a
demonstration using mock or test identity data.

### 3.2 ZK Passport --- Reusable Identity Credential

After the verification workflow is approved, the issuer creates a
cryptographically signed credential for the user.

**Core capabilities**

-   Issue a signed credential linked to the user's account or
    cryptographic holder key.
-   Store only the minimum information needed for the demonstration.
-   Generate a ZK proof for a specific claim.
-   Verify issuer authenticity, credential validity, expiry, and status.
-   Support revocation or invalidation in the planned architecture.
-   Bind proofs to a payment request or verifier challenge to prevent
    replay.

**Example claim**

Instead of sharing a PAN or Aadhaar number with a payment recipient, a
user could prove a statement such as:

-   `kyc_approved = true`
-   `age_over_threshold = true` (only if this claim is part of the
    implemented circuit and credential)
-   `credential_valid = true`

The exact claims exposed must be limited to what the circuit and
credential schema actually support.

**Critical implementation requirement**

A JSON object containing `panVerified: true` is not a Zero-Knowledge
proof. The MVP must generate a real proof using a ZK proving system and
verify it cryptographically. The proof must be tied to an authentic
issuer credential and the required public inputs.

### 3.3 ZK Pay --- Privacy-Preserving Payment Authorization

ZK Pay connects proof verification to a payment action.

**Core capabilities**

-   Display the user's verification and credential status.
-   Allow a verified user to create or accept a payment request.
-   Require a valid ZK proof before payment authorization.
-   Reject invalid, expired, revoked, incorrectly bound, or replayed
    proofs.
-   Create a PayPal Sandbox order after the authorization gate passes.
-   Capture the order through the backend.
-   Display the actual Sandbox transaction reference and payment status.

------------------------------------------------------------------------

## 4. Target Users and Roles

  -----------------------------------------------------------------------
  Role                    Description             Main actions
  ----------------------- ----------------------- -----------------------
  User / Payer            Person completing       Register, complete KYC
                          verification and        demo, hold credential,
                          initiating a payment    generate proof, pay

  Recipient / Merchant    Person or demo merchant Create payment request,
                          requesting a payment    view payment status

  Reviewer / Admin        Operator reviewing      Inspect evidence
                          verification sessions   summary, approve/reject
                                                  demo cases

  Credential Issuer       Trusted service issuing Sign and issue
                          credentials             credentials after
                                                  approval

  Verifier                Backend service or      Verify proof and
                          smart contract checking authorize or reject
                          proofs                  payment
  -----------------------------------------------------------------------

For the hackathon, one account may act as payer and another as
recipient/merchant. Issuer and reviewer functions can be represented by
separate admin views or controlled backend roles.

------------------------------------------------------------------------

## 5. End-to-End User Journey

1.  The user registers or signs in.
2.  The user opens the KYC dashboard.
3.  The user starts an AI-assisted verification session.
4.  The user follows the guided video/session flow.
5.  The user submits controlled sample identity data and test documents.
6.  OCR extracts relevant fields and consistency checks run.
7.  Liveness checks run through the selected liveness component or are
    clearly simulated for the demo.
8.  The system produces a verification result: approved, rejected, or
    needs human review.
9.  For an approved demo session, the credential issuer creates and
    signs a ZK Passport credential.
10. The user opens the Passport and requests a proof for a specific
    eligibility claim.
11. The proof is generated using the configured ZK circuit.
12. The verifier checks the proof, issuer signature, credential status,
    expiry, holder binding, and payment-specific challenge.
13. An invalid or replayed proof is rejected.
14. A valid proof unlocks the payment action.
15. The recipient creates or shares a payment request, for example USD
    10.
16. The payer selects PayPal Sandbox checkout.
17. The frontend uses the PayPal JavaScript SDK to approve the checkout.
18. The backend captures the approved order through the PayPal Orders
    API.
19. The application receives the provider response and displays the
    actual Sandbox transaction identifier and status.
20. The transaction appears in the payment history with a clear Sandbox
    label.

------------------------------------------------------------------------

## 6. High-Level Architecture

``` mermaid
flowchart TD
    U[User / Payer] --> FE[Next.js Web Application]
    FE --> KYC[ZK Verify AI]
    KYC --> DOC[Document OCR and Consistency Checks]
    KYC --> LIVE[Dedicated Liveness Component]
    KYC --> REVIEW[Reviewer / Admin Workflow]
    REVIEW --> ISSUER[Credential Issuer]
    ISSUER --> VC[Signed Credential]
    VC --> PASSPORT[ZK Passport]
    PASSPORT --> PROVER[ZK Proof Generator]
    PROVER --> VERIFY[Backend / Smart Contract Verifier]
    VERIFY --> GATE[Payment Authorization Gate]
    GATE --> PAYPAL[PayPal Sandbox Orders API]
    PAYPAL --> RECEIPT[Payment Receipt and History]
    DB[(PostgreSQL)] --- KYC
    DB --- VC
    DB --- VERIFY
    DB --- RECEIPT
    CHAIN[(Test EVM Network)] --- VERIFY
```

### 6.1 Main Components

-   **Frontend:** registration, KYC session, Passport, proof generation,
    payment request, checkout, receipt, and admin screens.
-   **Backend API:** authentication, KYC session orchestration,
    credential issuance, proof verification, payment authorization, and
    PayPal integration.
-   **AI/document services:** conversational assistance, OCR, document
    consistency checks, and session summaries.
-   **Credential issuer:** signs approved credentials.
-   **ZK prover:** generates proof artifacts from the credential and
    private witness.
-   **Verifier:** verifies the proof against the circuit's verification
    key and expected public inputs.
-   **Smart contracts (optional for MVP):** verifier and payment gate on
    a test EVM network.
-   **Database:** stores user/session metadata, credential status, proof
    metadata, payment records, and audit events. Sensitive source
    documents should be minimized and protected.

------------------------------------------------------------------------

## 7. Functional Requirements

### FR-01 --- User Registration and Authentication

-   Users can create an account and sign in.
-   The application assigns a stable internal user identifier.
-   The application supports at least two demo accounts for payer and
    recipient roles.
-   Authentication secrets must be securely hashed; passwords must never
    be stored in plaintext.

### FR-02 --- KYC Session Creation

-   An authenticated user can start a KYC session.
-   The system creates a unique session ID.
-   The interface explains the purpose of the session and what test data
    will be used.
-   The session records its status and timestamps.

### FR-03 --- AI-Assisted Video Verification

-   The interface provides a guided video/session experience.
-   The assistant explains each step and collects structured responses.
-   The system can capture session metadata and a verification summary.
-   The system routes uncertain cases to a reviewer.
-   Any simulated liveness or identity result must be clearly labelled
    as simulated.

### FR-04 --- Document Intelligence

-   The user can upload a permitted test document.
-   OCR extracts configured fields.
-   The backend performs basic format and consistency checks.
-   The system records check outcomes without unnecessarily retaining
    raw document content.
-   Extraction is not treated as proof that a document is genuine.

### FR-05 --- Verification Review

-   The system supports approved, rejected, and needs-review states.
-   A reviewer can inspect the evidence summary and record a decision.
-   The decision is associated with a reviewer or controlled demo issuer
    identity.
-   The system records an audit event for the decision.

### FR-06 --- Credential Issuance

-   An approved user can receive a signed credential.
-   The credential contains an issuer identifier, subject/holder
    binding, supported claims, issue time, expiry, and status reference.
-   The issuer signature can be verified.
-   The application displays credential status and expiry.
-   The system must not issue a valid credential for a rejected or
    pending session.

### FR-07 --- ZK Proof Generation

-   The user can request a proof for a supported claim.
-   The prover generates a proof using the selected circuit and private
    witness.
-   The proof is bound to the intended verifier and payment challenge.
-   Private identity attributes are not exposed as public inputs unless
    strictly necessary.
-   The application shows proof-generation success or a useful error.

### FR-08 --- Proof Verification and Replay Protection

-   The verifier checks the cryptographic proof.
-   The verifier checks the expected public inputs.
-   The verifier checks issuer authenticity and credential validity as
    required by the chosen design.
-   The verifier rejects expired or revoked credentials.
-   The verifier rejects a proof bound to a different payment request.
-   The verifier rejects reused nullifiers or nonces where the
    circuit/protocol uses them.
-   Verification outcomes are recorded without logging private witness
    data.

### FR-09 --- Payment Authorization

-   A payment action is available only after successful proof
    verification.
-   Invalid, expired, revoked, or replayed proofs cannot unlock
    checkout.
-   A payment request contains an ID, amount, currency,
    recipient/merchant reference, and expiry.
-   The proof is bound to the payment request or verifier challenge.
-   The payment gate records the authorization result.

### FR-10 --- PayPal Sandbox Checkout

-   The backend creates a PayPal Sandbox order after authorization
    succeeds.
-   The frontend launches the PayPal JavaScript SDK checkout flow.
-   The backend captures the approved order.
-   The backend validates the provider response before marking the
    payment as captured.
-   The receipt displays the actual provider order/capture reference and
    status.
-   Sandbox transactions are visibly labelled as test transactions.

------------------------------------------------------------------------

## 8. User Interface Requirements

### 8.1 Landing Page

-   Explain the product in one clear headline.
-   Show the three modules: Verify, Passport, Pay.
-   Explain the privacy benefit without claiming that all personal data
    is hidden in every flow.
-   Provide sign-in and registration actions.

### 8.2 Authentication

-   Registration and login screens.
-   Password and session handling.
-   Clear test/demo environment notice.

### 8.3 User Dashboard

-   KYC status.
-   Credential status.
-   Proof-generation entry point.
-   Recent payment activity.
-   Clear next action based on current state.

### 8.4 AI Video KYC

-   Video/session panel.
-   Guided instructions and progress indicator.
-   Document upload area.
-   Session status and error handling.
-   Consent and test-data notice.
-   Human-review status where applicable.

### 8.5 Verification Result

-   Approved, rejected, or needs-review status.
-   Summary of checks performed.
-   Explicit indication of simulated checks.
-   Credential issuance action only when approved.

### 8.6 ZK Passport

-   Credential issuer and status.
-   Supported claims.
-   Issue and expiry dates.
-   Generate-proof action.
-   No display of raw identity numbers unless essential to the
    controlled test flow.

### 8.7 Proof Verification

-   Proof status.
-   Verifier result.
-   Payment challenge/request binding status.
-   Failure reason for invalid, expired, revoked, or replayed proofs,
    without exposing private witness values.

### 8.8 Payment Dashboard

-   Create or view payment requests.
-   Payer and recipient details appropriate to the demo.
-   Amount and currency.
-   Proof verification status.
-   PayPal Sandbox checkout action.

### 8.9 Transaction Receipt

-   Sandbox environment label.
-   Amount and currency.
-   Provider order ID and capture/transaction ID, as returned.
-   Payment status.
-   Timestamp.
-   Link or reference to transaction history.

### 8.10 Admin / Reviewer Dashboard

-   Pending KYC sessions.
-   Evidence summary.
-   Approve, reject, or request further review.
-   Credential issuance status.
-   Audit history.

------------------------------------------------------------------------

## 9. Security, Privacy, and Compliance Requirements

### 9.1 Data Minimization

-   Do not store raw Aadhaar or PAN data unless a lawful, authorized
    integration and clear necessity exist.
-   Do not put identity documents, Aadhaar numbers, PAN numbers, or raw
    personal data on-chain.
-   Keep private witness data off-chain.
-   Avoid logging document contents, access tokens, secrets, or private
    witness values.
-   Use encryption in transit and appropriate encryption at rest.
-   Apply access controls and retention limits to uploaded documents and
    video data.

### 9.2 Credential Security

-   Protect issuer signing keys.
-   Use a secure key-management approach appropriate to the deployment.
-   Verify issuer signatures before accepting credentials.
-   Include expiry and credential status/revocation handling.
-   Bind credentials to the intended holder.
-   Prevent credential substitution and unauthorized issuance.

### 9.3 ZK Protocol Security

-   Use a reviewed ZK library and well-defined circuit.
-   Do not invent cryptographic primitives.
-   Constrain all values that influence the claim being proved.
-   Validate public inputs and domain separation.
-   Bind proofs to a verifier and transaction-specific challenge.
-   Use nullifiers/nonces to prevent replay where appropriate.
-   Test invalid witnesses, altered public inputs, expired credentials,
    revoked credentials, and replay attempts.
-   Keep proving and verification keys versioned with the circuit.

### 9.4 Payment Security

-   PayPal client secrets must remain on the backend.
-   The backend must create and capture orders.
-   Do not trust a frontend success callback as proof of payment.
-   Validate the PayPal response and capture status server-side.
-   Use idempotency and duplicate-capture protections where supported.
-   Never label a Sandbox transaction as a real-money payment.

### 9.5 AI and Video Verification Safety

-   AI is an assistant to the workflow, not a substitute for a legally
    required authorized official.
-   Liveness and face matching should use dedicated security components
    or approved SDKs, not an LLM's subjective interpretation.
-   Do not infer identity from accent, voice, emotion, expression, or
    conversational confidence.
-   Provide a human-review path for uncertain cases.
-   Obtain appropriate consent before collecting video or documents.
-   Clearly label simulated checks in the hackathon demo.

### 9.6 Regulatory Boundary

Production Aadhaar/PAN verification and V-CIP require appropriate
authorization, consent, process controls, and compliance with applicable
Indian rules. The hackathon MVP should use mock/test credentials and
should not imply that it is an authorized Aadhaar authentication or
production KYC service.

------------------------------------------------------------------------

## 10. Proposed Technology Stack

  -----------------------------------------------------------------------
  Layer                   Proposed technology     Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js 16, React 19,   Web application
                          TypeScript              

  Styling                 Tailwind CSS v4,        UI and interaction
                          shadcn/ui, Motion,      
                          Lucide                  

  Backend                 FastAPI, Python         API and orchestration

  Database                PostgreSQL, SQLAlchemy  Persistent application
                                                  data

  Cache / jobs            Redis (as needed)       Session state and
                                                  background tasks

  Video                   WebRTC                  Browser-based video
                                                  session

  AI                      LLM with speech-to-text Guided assistant and
                          and text-to-speech      summaries

  Document processing     OCR/document extraction Extract and validate
                          service                 document fields

  Liveness                Dedicated liveness      Liveness checks
                          SDK/component           

  Credentials             W3C Verifiable          Credential data model
                          Credentials concepts    

  ZK circuits             Circom                  Circuit definition

  ZK proving              snarkjs / Groth16       Proof generation and
                                                  verification

  Hashing                 Poseidon where          ZK-friendly hashing
                          appropriate             

  Smart contracts         Solidity                On-chain
                                                  verifier/payment gate
                                                  if used

  EVM tooling             Foundry, viem, wagmi    Contract development
                                                  and frontend
                                                  integration

  Payments                PayPal JavaScript SDK   Sandbox checkout and
                          and Orders API          capture
  -----------------------------------------------------------------------

The stack is a proposed implementation baseline. Exact library versions
and integration choices should be pinned during implementation.

------------------------------------------------------------------------

## 11. Smart Contract Design (If On-Chain Verification Is Included)

### 11.1 `ZKVerifier.sol`

Responsibilities:

-   Expose a verification function for the selected proof system.
-   Verify proof bytes against the configured verification key.
-   Validate expected public inputs.
-   Return or record verification outcome.

### 11.2 `KYCRegistry.sol`

Responsibilities:

-   Track issuer or credential status references where appropriate.
-   Support validity/revocation status checks.
-   Avoid storing raw identity attributes or documents.
-   Restrict registry updates to authorized issuer/admin roles.

### 11.3 `PaymentGate.sol`

Responsibilities:

-   Require successful proof verification before authorizing a
    payment-related action.
-   Bind authorization to a unique payment request/challenge.
-   Reject reused nullifiers or nonces.
-   Emit events for authorization outcomes.

### 11.4 `MockUSDC.sol` (Optional)

A test token can be used for an additional on-chain payment
demonstration. It is optional and must not be confused with the PayPal
Sandbox transaction.

**Design note:** Do not duplicate trust assumptions across backend and
contracts without documenting them. The MVP must specify whether the
backend verifier or on-chain verifier is authoritative for each payment
authorization.

------------------------------------------------------------------------

## 12. Proposed Database Schema

The following is a logical starting point; fields should be refined
during implementation.

### `users`

-   `id`
-   `email`
-   `password_hash`
-   `display_name`
-   `role`
-   `created_at`
-   `updated_at`

### `kyc_sessions`

-   `id`
-   `user_id`
-   `status`
-   `session_type`
-   `started_at`
-   `completed_at`
-   `reviewed_by`
-   `reviewed_at`
-   `decision_reason_code`

### `credentials`

-   `id`
-   `user_id`
-   `issuer_id`
-   `credential_type`
-   `credential_reference`
-   `issued_at`
-   `expires_at`
-   `status`
-   `signature_reference`
-   `circuit_version`

### `proofs`

-   `id`
-   `user_id`
-   `credential_id`
-   `payment_request_id`
-   `proof_reference`
-   `public_inputs`
-   `nullifier`
-   `verification_status`
-   `verified_at`

Do not store private witness data in this table.

### `payment_requests`

-   `id`
-   `recipient_user_id`
-   `payer_user_id` (nullable until accepted)
-   `amount`
-   `currency`
-   `status`
-   `expires_at`
-   `created_at`

### `transactions`

-   `id`
-   `payment_request_id`
-   `provider`
-   `provider_order_id`
-   `provider_capture_id`
-   `amount`
-   `currency`
-   `status`
-   `environment`
-   `created_at`
-   `captured_at`

### `audit_logs`

-   `id`
-   `actor_id`
-   `action`
-   `resource_type`
-   `resource_id`
-   `metadata`
-   `created_at`

Audit metadata must not contain secrets, raw identity documents, or
private witness values.

------------------------------------------------------------------------

## 13. Proposed API Routes

Routes are illustrative and may be adjusted to the final backend
structure.

### Authentication

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `POST /api/auth/logout`
-   `GET /api/auth/me`

### KYC

-   `POST /api/kyc/sessions`
-   `GET /api/kyc/sessions/{session_id}`
-   `POST /api/kyc/sessions/{session_id}/documents`
-   `POST /api/kyc/sessions/{session_id}/complete`
-   `GET /api/kyc/sessions/{session_id}/summary`

### Review and Verification

-   `GET /api/review/queue`
-   `POST /api/review/sessions/{session_id}/decision`
-   `GET /api/verification/status`

### Credentials

-   `POST /api/credentials/issue`
-   `GET /api/credentials/me`
-   `GET /api/credentials/{credential_id}/status`
-   `POST /api/credentials/{credential_id}/revoke`

### ZK

-   `POST /api/zk/proofs`
-   `POST /api/zk/verify`
-   `GET /api/zk/proofs/{proof_id}`

### Payments

-   `POST /api/payments/requests`
-   `GET /api/payments/requests/{request_id}`
-   `POST /api/payments/requests/{request_id}/authorize`
-   `GET /api/payments/history`

### PayPal

-   `POST /api/paypal/orders`
-   `POST /api/paypal/orders/{order_id}/capture`
-   `GET /api/paypal/orders/{order_id}`

All routes must enforce authentication and role-based authorization
where applicable. Request validation, rate limiting, error handling, and
audit logging should be added before a production deployment.

------------------------------------------------------------------------

## 14. PayPal Sandbox Integration

### 14.1 Purpose

The PayPal integration is the final payment demonstration. It proves
that a successfully authorized payment request can proceed to a provider
checkout and be captured in PayPal's Sandbox environment.

It is not a demonstration of real-money settlement or international
payout to an Indian bank account.

### 14.2 Setup

1.  Create a PayPal Developer account.
2.  Create a Sandbox application.
3.  Obtain the Sandbox Client ID and Client Secret.
4.  Create or use Sandbox buyer and business accounts.
5.  Configure the backend environment.
6.  Load the PayPal JavaScript SDK in the frontend using the Sandbox
    Client ID.
7.  Keep the Client Secret exclusively on the backend.

Example environment variables:

``` env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

Do not commit real credentials or secrets to source control. Use a local
`.env` file excluded from version control and provide a `.env.example`
with placeholder values.

### 14.3 Order Flow

1.  User passes the ZK proof verification gate.
2.  Frontend requests an order from `POST /api/paypal/orders`.
3.  Backend obtains an OAuth access token using the Sandbox credentials.
4.  Backend creates an order through `POST /v2/checkout/orders`.
5.  Backend returns the order ID and approval information needed by the
    frontend.
6.  User approves checkout through the PayPal JavaScript SDK.
7.  Frontend calls `POST /api/paypal/orders/{order_id}/capture`.
8.  Backend captures the order through
    `POST /v2/checkout/orders/{order_id}/capture`.
9.  Backend validates the response and stores the order/capture
    references and status.
10. Frontend displays the receipt.

### 14.4 Example Backend Configuration

``` python
import os

PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
PAYPAL_CLIENT_ID = os.environ["PAYPAL_CLIENT_ID"]
PAYPAL_CLIENT_SECRET = os.environ["PAYPAL_CLIENT_SECRET"]

PAYPAL_BASE_URL = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)
```

The actual implementation must also handle OAuth token acquisition, HTTP
errors, timeouts, order-state validation, capture response validation,
and duplicate requests.

### 14.5 Payment Data to Persist

-   Internal transaction ID.
-   Payment request ID.
-   PayPal order ID.
-   PayPal capture ID, when returned.
-   Amount and currency.
-   Provider status.
-   Environment (`sandbox` or `live`).
-   Creation and capture timestamps.

### 14.6 Important Product Limitation

PayPal Checkout's Orders API is a buyer-to-merchant checkout flow. It
should not be presented as a freelancer receiving an international
PayPal payout into an Indian bank account. A real cross-border
receiving/payout product would require a separate review of eligible
PayPal products, country availability, account configuration,
compliance, fees, foreign exchange, and settlement timelines.

------------------------------------------------------------------------

## 15. MVP Scope and Priorities

### P0 --- Required for the Hackathon Demo

-   [ ] Registration and login.
-   [ ] User dashboard.
-   [ ] Mock Aadhaar/PAN or controlled test-data verification flow.
-   [ ] AI-assisted video KYC interface.
-   [ ] Document extraction and basic consistency checks.
-   [ ] Verification approval workflow.
-   [ ] Signed credential issuance.
-   [ ] Actual ZK proof generation.
-   [ ] Cryptographic proof verification.
-   [ ] Credential expiry/status checks.
-   [ ] Payment-specific challenge binding and replay protection.
-   [ ] Payment eligibility gate.
-   [ ] PayPal Sandbox order creation.
-   [ ] PayPal Sandbox checkout and successful capture.
-   [ ] Receipt showing the actual Sandbox transaction reference.
-   [ ] Clear distinction between simulated KYC and provider Sandbox
    payment.

### P1 --- Valuable Enhancements

-   [ ] Admin/reviewer dashboard.
-   [ ] Credential revocation workflow.
-   [ ] QR-based payment requests.
-   [ ] Better liveness integration.
-   [ ] More selective-disclosure claims.
-   [ ] Optional test-token transfer on an EVM test network.
-   [ ] Improved audit log and event timeline.

### P2 --- Post-Hackathon / Production Exploration

-   [ ] Authorized live Aadhaar/PAN verification integrations.
-   [ ] Production V-CIP partnership and compliance controls.
-   [ ] Regulated payment-provider integrations.
-   [ ] Actual international payouts and settlement workflows.
-   [ ] Private payment amounts, if supported by a sound protocol
    design.
-   [ ] Cross-chain credential verification.
-   [ ] Institutional API/SDK.
-   [ ] Compliance reporting and enterprise integrations.

------------------------------------------------------------------------

## 16. Non-Functional Requirements

### Performance

-   Dashboard and standard API responses should feel responsive under
    demo load.
-   Proof-generation time should be measured and displayed where useful.
-   Long-running operations should expose progress and a recoverable
    status.

### Reliability

-   Payment creation and capture must handle retries safely.
-   Failed provider calls must not be recorded as successful payments.
-   KYC and proof workflows must preserve state across page refreshes.

### Security

-   Secrets remain server-side.
-   Passwords are securely hashed.
-   API endpoints enforce authentication and authorization.
-   Sensitive data is minimized and access-controlled.
-   Proof verification is performed cryptographically, not by trusting
    frontend state.

### Usability

-   The user can understand the current stage of the flow.
-   Each failure state explains the next available action.
-   Simulated checks and Sandbox payments are clearly labelled.

### Observability

-   Record workflow events and provider references.
-   Avoid sensitive payloads in logs.
-   Provide enough diagnostics to demonstrate why a proof or payment was
    accepted or rejected.

------------------------------------------------------------------------

## 17. Demo Script

The demo should tell one coherent story: a user verifies once, receives
a reusable credential, proves eligibility without sharing the underlying
identity data, and completes a payment.

### Demo Setup

-   Two Sandbox application users: payer and recipient/merchant.
-   PayPal Sandbox buyer and business accounts.
-   Controlled test identity data.
-   Working credential issuer and ZK circuit.
-   PayPal Sandbox credentials configured on the backend.
-   A payment request for USD 10.

### Demo Sequence

**Step 1 --- Register**

Show the user creating an account and opening the dashboard.

**Step 2 --- AI-Assisted KYC**

Start the guided video verification. Show document extraction and
consistency checks. Explain which components are real and which are
simulated for the hackathon.

**Step 3 --- Approve and Issue Passport**

Approve the controlled demo session through the issuer/reviewer
workflow. Show the signed credential and its status.

**Step 4 --- Generate a ZK Proof**

Generate a proof for the required eligibility claim. Explain that the
verifier receives the proof and required public inputs, not the user's
raw identity document.

**Step 5 --- Demonstrate Rejection**

Submit an invalid, altered, expired, or replayed proof. Show that
verification fails and the payment action remains locked.

**Step 6 --- Demonstrate Acceptance**

Generate a fresh proof bound to the actual payment request. Verify it
successfully and show the payment gate unlocking.

**Step 7 --- PayPal Sandbox Checkout**

Create a USD 10 order, approve it using the Sandbox buyer account, and
capture it through the backend.

**Step 8 --- Show the Receipt**

Display the actual provider response, Sandbox order/capture ID, amount,
currency, and status. Show the transaction in history.

### The Key Judging Moment

The strongest technical moment is the contrast:

-   Invalid or replayed proof → rejected; checkout remains locked.
-   Valid proof bound to the payment request → accepted; PayPal Sandbox
    checkout becomes available and the order is captured.

This demonstrates that the ZK proof is an enforced authorization
condition, not merely a decorative badge in the UI.

------------------------------------------------------------------------

## 18. Testing and Acceptance Criteria

### KYC Workflow

-   A user can create and complete a demo KYC session.
-   The system can represent approved, rejected, and needs-review
    outcomes.
-   A pending or rejected session cannot receive an approved credential.
-   Simulated checks are visibly identified.

### Credential Workflow

-   The issuer signs the credential.
-   The verifier rejects an invalid issuer signature.
-   Expired credentials are rejected.
-   Revoked credentials are rejected when revocation is implemented.
-   A credential cannot be silently substituted for another holder's
    credential.

### ZK Workflow

-   A valid proof verifies successfully.
-   A modified proof fails verification.
-   Altered public inputs fail verification.
-   A proof for another payment request fails binding checks.
-   Replayed proof/nullifier/nonce is rejected.
-   Private witness values are not returned in API responses or logs.

### Payment Workflow

-   Payment is locked before successful proof verification.
-   Payment remains locked after failed verification.
-   A valid proof authorizes the intended payment request.
-   PayPal order creation returns a valid Sandbox order ID.
-   A Sandbox buyer can approve checkout.
-   Backend capture returns a successful capture response.
-   The receipt displays the actual provider reference.
-   Failed or pending captures are not displayed as completed payments.

------------------------------------------------------------------------

## 19. Success Metrics

For the hackathon MVP, success is measured by observable end-to-end
behavior:

-   A user can complete the guided verification demonstration.
-   A credential can be issued and cryptographically validated.
-   A real ZK proof can be generated and verified.
-   An invalid or replayed proof is rejected.
-   A valid payment-bound proof unlocks the payment action.
-   A PayPal Sandbox order is successfully captured.
-   The receipt displays the actual provider transaction reference.
-   The demo clearly communicates the distinction between identity
    verification, payment authorization, and settlement.

------------------------------------------------------------------------

## 20. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  ZK implementation is    Core product claim is   Implement a real
  only simulated          not demonstrated        circuit and proof
                                                  verification; label any
                                                  mock clearly

  Credential is not bound Forged credentials may  Verify issuer
  to a trusted issuer     be accepted             signatures and define
                                                  trusted issuer keys

  Proof can be replayed   Unauthorized repeated   Bind proof to payment
                          actions                 challenge and use
                                                  nonce/nullifier
                                                  controls

  AI is presented as      Compliance and trust    Keep authorized human
  final KYC authority     risk                    review where required;
                                                  describe AI as
                                                  assistance

  Liveness is simulated   Misleading demo         Clearly label simulated
  but presented as real                           components

  Sensitive identity data Privacy and security    Use test data, minimize
  is exposed              risk                    storage, encrypt, and
                                                  keep data off-chain

  PayPal Sandbox is       Misleading product      Label Sandbox clearly
  confused with live      claim                   and explain checkout vs
  payout                                          payout distinction

  Provider capture is     False payment status    Capture and validate
  trusted from frontend                           server-side
  alone                                           

  Demo network or         Demo failure            Prepare a clearly
  provider is unavailable                         labelled fallback
                                                  recording/mock
                                                  response; do not
                                                  misrepresent it as a
                                                  live capture
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 21. Suggested Implementation Roadmap

### Phase 1 --- Foundation

-   Set up frontend and backend repositories.
-   Implement authentication and user roles.
-   Create database schema and migrations.
-   Build dashboard and basic navigation.

### Phase 2 --- KYC Demonstration

-   Implement KYC session lifecycle.
-   Add guided video-session UI.
-   Integrate document upload and OCR.
-   Add consistency checks and reviewer decision workflow.
-   Clearly distinguish simulated checks from actual integrations.

### Phase 3 --- Credential and ZK

-   Define credential schema and issuer keys.
-   Implement signed credential issuance and verification.
-   Design the smallest useful ZK circuit.
-   Generate and verify proofs.
-   Add expiry, holder binding, payment challenge, and replay
    protection.
-   Add negative tests before connecting payments.

### Phase 4 --- Payment Gate and PayPal

-   Implement payment request model.
-   Connect proof verification to authorization.
-   Implement PayPal Sandbox order creation.
-   Integrate JavaScript SDK checkout.
-   Implement backend capture and receipt.
-   Test retries and failure paths.

### Phase 5 --- Demo Polish

-   Refine dashboard and workflow status.
-   Add clear privacy explanations.
-   Add audit timeline.
-   Rehearse invalid-proof and valid-proof paths.
-   Verify the final Sandbox capture on the day of demonstration.

------------------------------------------------------------------------

## 22. Definition of Done

The hackathon MVP is considered complete when:

1.  A user can register and access the application.
2.  The user can complete the controlled AI-assisted KYC demonstration.
3.  An approved session receives a signed credential.
4.  The user can generate a real ZK proof for a supported claim.
5.  The verifier validates the proof and all required public inputs.
6.  Invalid, expired, or replayed proofs are rejected.
7.  A valid proof is bound to a specific payment request.
8.  The payment gate refuses checkout until verification succeeds.
9.  The backend creates a PayPal Sandbox order.
10. The user approves the Sandbox checkout.
11. The backend captures the order and validates the provider response.
12. The receipt displays the actual Sandbox transaction reference.
13. The UI clearly labels simulated identity checks and Sandbox payment
    activity.
14. No raw Aadhaar/PAN data, secrets, or private witness values are
    written on-chain or exposed in logs.

------------------------------------------------------------------------

## 23. Final Product Positioning

**ZK PayPal --- Verify once. Prove anywhere. Pay faster.**

ZK PayPal demonstrates how reusable credentials and Zero-Knowledge
proofs can reduce repeated identity disclosure while making payment
authorization conditional on cryptographically verifiable claims.

The product's central promise is not that ZK eliminates payment
settlement delays. It is that users can prove the specific eligibility a
service needs without repeatedly handing over their full identity
information. The PayPal Sandbox integration completes the demonstration
by connecting that privacy-preserving authorization flow to a real
provider checkout and capture in a test environment.
