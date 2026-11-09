# Demo video script (target 2:50, hard limit under 3:00)

Record at 1440p or 1080p with three browser profiles signed in beforehand: payer, reviewer
and merchant. Before recording, start the backend and frontend, and confirm one Sandbox capture,
one saved-wallet payment and one payout work the same day. Use no copyrighted music and no
third-party logos beyond PayPal's own checkout popup.

Prepare these before you hit record, so the video doesn't wait on anything:
- An approved KYC session is fine to show live, but have the payer's Passport already issued.
- A paid request (for the refund shot) and a payout link created by the merchant.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Landing page, the stamp lands on the passport | "Every app makes you upload your ID again. ZK Pass lets you verify once, then prove what a payment needs with a zero-knowledge proof, and that proof is what unlocks PayPal." |
| 0:12–0:40 | Payer: Verify. Upload `specimen_pan_card.png`, show fields with the masked number, run the liveness prompts (blink, turn), submit | "An AI assistant guides the check. OCR reads a test card and only masked fields are kept. Liveness runs on my device: blink, turn, and no video leaves the browser. The AI explains and summarizes, but it never approves anyone." |
| 0:40–0:50 | Reviewer: queue with checks and the AI summary, Approve | "A human reviewer makes the call." |
| 0:50–1:02 | Payer: Passport, Issue | "My browser keeps a secret and sends only its hash. The issuer signs a credential bound to it. A verifier will never see my name, birth date or document number." |
| 1:02–1:40 | Merchant creates an **18+** USD 10 request. Payer opens it: "Use a proof for another payment" (red), "Alter the proof" (red), then "Generate proof and unlock" (green, about 2 s), public signals panel | "This merchant needs me to be 18 or older. A real proof for another payment: rejected. An altered proof: rejected. A fresh proof for this payment, made in my browser, proves I'm over 18 without revealing my birthday: accepted. Nine numbers, no identity." |
| 1:40–2:05 | Tick "Save PayPal", PayPal popup with the US Sandbox buyer, receipt with order and capture IDs | "Checkout opens. The backend captures and checks the payment with PayPal, and I've saved PayPal with Vault." |
| 2:05–2:20 | New request, proof, "Pay with saved PayPal", instant receipt | "Next time: a fresh proof, then one click. No popup, but never without a proof." |
| 2:20–2:40 | Payer opens the merchant's payout link, enters a Sandbox email, "Prove and receive payout", payout sent | "It works the other way too. A platform pays a freelancer through PayPal Payouts, and the money only moves after the freelancer proves they're verified." |
| 2:40–2:50 | Merchant: Refund on a paid request, then History | "Refunds, payouts and repeat payments, all behind one proof gate. Verify once, prove anywhere." |

## If time runs long
Cut the reviewer shot to three seconds and drop the refund; the 18+ proof, Vault payment and payout
carry the story.

## Fallback
If PayPal Sandbox is unavailable on recording day, record everything up to "Checkout unlocked",
then show a previously captured receipt and say on screen that it was recorded earlier. Never
present a mocked capture as live.
