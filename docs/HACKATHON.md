# PayPal AI Hackathon — Compliance Checklist

Hackathon: **Build What's Next with PayPal and AI** (Devpost)
Submission deadline: **Nov 12, 2026**. Recheck the official rules page for the exact time zone.

## Core requirement
The project must meaningfully use **both PayPal and AI**.

| Requirement | How this project meets it | Status |
|---|---|---|
| PayPal developer platform (Sandbox) | Orders v2 checkout, Vault one-click payments, Payments v2 refunds and Payouts v1, all gated by a ZK proof | ✅ built and verified with a live Sandbox capture |
| AI tool / model | KYC assistant, OCR field extraction, plain-language explanation of failed checks, neutral reviewer evidence summary (Ollama local or Gemini free tier) | ✅ built |

## Submission requirements
- [x] Functional demo with full setup and run instructions in README (mockups don't count)
- [x] Public repo with an open-source license (MIT, see `LICENSE`)
- [x] AI tools and models disclosed (README → *AI tools & models*)
- [x] Add PayPal Sandbox credentials to `backend/.env`
- [x] Full local run: KYC, review, Passport, all four bad proofs rejected, valid proof accepted, real Sandbox order created
- [x] Complete one Sandbox capture with a **United States** Sandbox personal (buyer) account (order 01T5204941594114R, capture 3E074252280547144)
- [ ] Try the new features once on a real setup (blocked from the build workspace, mocked in tests):
  - [ ] On-device liveness with a real camera
  - [ ] Refund of a captured Sandbox payment
  - [ ] Save PayPal on a payment, then a one-click saved-wallet payment (needs a US Sandbox business app with Vault)
  - [ ] A payout claimed by a Sandbox personal account (needs Payouts enabled on the app)
- [ ] Optional but strong: deploy a hosted demo URL
- [ ] Record the demo video, **under 3 minutes**, following `docs/DEMO.md`
- [ ] Upload it to YouTube as **public** and paste the link into Devpost
- [ ] Video uses no third-party trademarks, copyrighted music or protected material without permission
- [x] Write the Devpost project description in English (draft in `docs/DEVPOST.md`)
- [ ] Fill in every Devpost field and recheck the official rules for amendments before submitting

## Branding note
The product is named **ZK Pass**, not "ZK PayPal", so it doesn't use PayPal's trademark as its
own brand. "PayPal" appears only to describe the integration, and the app states that it is an
independent prototype, not an official PayPal product.

## Prize categories worth targeting
- Best Overall
- Best Use of PayPal + AI
- Most Impactful
- Best Demo Delivery
