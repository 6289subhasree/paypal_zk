# PayPal AI Hackathon — Compliance Checklist

Hackathon: **Build What's Next with PayPal and AI** (Devpost)
Submission deadline: **Nov 12, 2026**. Recheck the official rules page for the exact time zone.

## Core requirement
The project must meaningfully use **both PayPal and AI**.

| Requirement | How this project meets it | Status |
|---|---|---|
| PayPal developer platform (Sandbox) | Orders API v2 create, server-side capture with idempotency and response validation, JS SDK buyer approval, all gated by a ZK proof | ✅ built, needs a live Sandbox run |
| AI tool / model | KYC assistant, OCR field extraction, plain-language explanation of failed checks, neutral reviewer evidence summary (Ollama local or Gemini free tier) | ✅ built |

## Submission requirements
- [x] Functional demo with full setup and run instructions in README (mockups don't count)
- [x] Public repo with an open-source license (MIT, see `LICENSE`)
- [x] AI tools and models disclosed (README → *AI tools & models*)
- [ ] Add PayPal Sandbox credentials to `backend/.env` and do one real capture
- [ ] Optional but strong: deploy a hosted demo URL
- [ ] Record the demo video, **under 3 minutes**, following `docs/DEMO.md`
- [ ] Upload it to YouTube as **public** and paste the link into Devpost
- [ ] Video uses no third-party trademarks, copyrighted music or protected material without permission
- [ ] Write the Devpost project description in English
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
