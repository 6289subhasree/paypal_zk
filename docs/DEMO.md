# Demo video script (target 2:45, hard limit under 3:00)

Record at 1440p or 1080p with three browser profiles signed in beforehand: payer, reviewer
and merchant. Before recording, start the backend and frontend and confirm one Sandbox capture
works the same day. Use no copyrighted music and no third-party logos beyond PayPal's own checkout
popup.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:15 | Landing page, the stamp lands on the passport | "Every app asks you to verify again and hand over your ID. ZK Pass lets you verify once, then prove you passed KYC with a zero-knowledge proof, and that proof is what unlocks PayPal checkout." |
| 0:15–0:45 | Payer: Verify. Consent, upload `specimen_pan_card.png`, show extracted fields with the masked number, simulated liveness badge, submit | "An AI assistant guides the session. OCR reads a test card, and only masked fields are kept. Liveness is clearly simulated. The AI explains and summarizes, but it never approves anyone." |
| 0:45–1:00 | Reviewer: queue with 7/7 checks and the AI evidence summary, then Approve | "A human reviewer sees the checks and a neutral AI summary, and makes the decision." |
| 1:00–1:20 | Payer: Passport, Issue | "The browser creates a secret and sends only its hash. The issuer signs a credential bound to that secret. The verifier will never see my name, document number or credential ID." |
| 1:20–1:30 | Merchant: create a USD 10 request, copy link | "A merchant requests ten dollars." |
| 1:30–2:05 | Payer: open link. Click "Use a proof for another payment" (red stamp), "Alter the proof" (red), then "Generate proof and unlock" (green stamp, 2 s proving time, public signals panel) | "Here's the key moment. A real proof bound to a different payment: rejected. An altered proof: rejected. A fresh proof for this exact payment, generated right here in the browser: accepted. This is all the verifier received: seven numbers, no identity." |
| 2:05–2:15 | Click "Replay the accepted proof" (red, replayed) | "Replaying the same proof fails, because each proof has a one-time nullifier." |
| 2:15–2:40 | PayPal Sandbox buttons, log in as the Sandbox buyer, approve, receipt with order and capture IDs | "Now checkout opens. The backend creates the order, captures it server-side, checks the amount and status, and shows PayPal's real Sandbox capture ID." |
| 2:40–2:50 | History page | "Verify once, prove anywhere, pay without handing over your identity again. Built with Circom, snarkjs, FastAPI, Next.js, a local LLM, and the PayPal Orders API." |

## Fallback
If PayPal Sandbox is unavailable on recording day, record everything up to "Checkout unlocked",
then show a previously captured receipt and say on screen that it was recorded earlier. Never
present a mocked capture as live.
