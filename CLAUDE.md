# FlexPay — Project Instructions

FlexPay is a Naira-based digital wallet + rewards app (referrals, daily
check-in, spin & win, tasks, manual bank-transfer top-up, instant
withdrawal review). Frontend: React + Vite. Backend: plain PHP (no
framework) + MySQL/phpMyAdmin.

Read this file at the start of every session. Follow it without being
reminded. **If this file is ever missing, stop and ask for it to be
restored before proceeding — don't guess at conventions.**

## Verification standard (read this before saying anything is "done")

This project has caught real, serious bugs (a 100x balance overcredit, a
2x withdrawal-reversal overcredit, a missing withdrawal balance guard, a
CORS fix that was never actually confirmed in a browser) that all slipped
past an initial "done" report and were only caught because they were
pushed back on. Hold yourself to this standard without being asked:

- **A successful build (`npm run build`) or a passing syntax check
(`php -l`) is not verification of anything functional.** It confirms the
code compiles, nothing more.
- **A script that calls a controller/class directly is not proof the
real API works.** Verify money-moving or auth-moving endpoints with
real HTTP requests (`curl`/`fetch`) against the actual running server,
or by clicking through the real browser UI — never a shortcut that
skips routing, middleware, or auth.
- **For anything that touches money**, show the actual before-and-after
kobo values from the database, in one continuous sequence on one
account, with the arithmetic shown explicitly — not isolated snippets
from possibly-different test runs.
- **A CORS, auth, or config fix must be confirmed with the literal
header/response value** (e.g. the real `Access-Control-Allow-Origin`
string from a real preflight request), not a description of what it
should now do.
- If something is genuinely not yet verified, say so plainly rather than
rounding up to "done" — an honest "this part is unconfirmed" is always
the right answer over a confident claim that turns out wrong.

## Build discipline

- Build **one piece at a time**. Never scaffold a later piece unless
explicitly asked for in the current prompt, even if it seems
convenient to add while already in there.
- Always create real folders/files as you go — scaffold it, then
summarize what was created, don't wait for approval on structure.
- Confirm the dev server runs clean and the page renders at 375px,
768px, and 1440px before calling a frontend step done.

## Brand — Indigo Flex (locked; this superseded an earlier gold direction)

- Colors: deep violet backgrounds (`#0B0714` base, `#150F2E` panels,
`#1B1440` raised), electric lime accent (`#C6F135`, light variant
`#E1FF6B`), off-white text (`#F4F1FF`), violet secondary accent
(`#7C3AED`, used sparingly for depth/glow only, never primary CTAs).
Full token file: `src/assets/brand/flexpay-brand-tokens.css`.
- Logo: the coin-ring mark (ring + currency-bar), recolored to lime on
violet. Do not change the shape without being explicitly asked —
recolor only.
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numbers/
₦ amounts/codes).
- Currency is always ₦ (Naira), the source of truth. A display-only
USD toggle exists (live exchange rate, converts for display only —
never touches the real Naira-denominated backend).

## Money handling — non-negotiable rules

- All amounts stored as `BIGINT` kobo, never float/decimal. Format to ₦
only at the display layer.
- `transactions` is the source of truth; `wallets.balance_kobo` is a
cache. Every balance change writes a transaction row.
- A wallet is only ever credited after real, verified confirmation of
money actually arriving (admin approval for manual top-ups; a verified
webhook for any future automated gateway) — never from a frontend
action alone, never from a file upload alone.
- Withdrawals and top-ups must validate against real available balance
before creating any request.
- No investment/return language anywhere ("interest," "ROI," "%
return") — the Invest feature is a flat, pre-stated "Lock & Earn
Bonus," not a percentage yield, to stay clear of deposit-taking/
investment-licensing territory.
- No fabricated regulatory or trust claims ("Regulated," "CBN Aligned,
"Verified," "Bank-grade encryption") anywhere copy appears, unless
genuinely true.

## Decided reward numbers (real, not placeholders)

- Check-in: Day 1–7 = ₦500 each day.
- Claim-reward: ₦4,000 once per day.
- Referral bonus: ₦15,000 per **active** referral (first real task/
check-in completed by the referred user — not bare signup or email
verification alone).
- Referral milestones (10/25/50/100 active referrals): ₦2,000 / ₦6,000 /
₦15,000 / ₦35,000, one-time each, tracked in
`referral_milestone_claims` to prevent double-payment.
- Invest "Lock & Earn": e.g. lock ₦20,000/30 days → ₦1,000 bonus (see
`fund_locks` table) — flat bonus, never phrased as a %.
- Top-up fee: 2%, labeled honestly as FlexPay's own service fee.

## Folder structure

```
src/
  assets/brand/        # tokens, logo, icon
  components/           # landing/, auth/, dashboard/, ui/
  layouts/
  pages/                 # auth/, dashboard/, admin/
  hooks/
  lib/
    api/                 # auth.js, wallet.js, tasks.js, admin.js — real fetch calls
  styles/
backend/
  public/index.php       # front controller
  src/
    Config/ Http/ Controllers/ Repositories/ Services/
  database/schema.sql     # kept in sync with the live DB, always
  scripts/                # e.g. create-admin.php
  .env / .env.example
```

Auth: opaque bearer tokens hashed into `sessions` (users) and
`admin_sessions` (admins) — **fully separate systems**, a user token must
never work on an admin endpoint or vice versa.

## Mobile responsiveness (mandatory on every screen)

- Mobile-first Tailwind. Bottom nav fixed at every breakpoint (Home /
About / Invest / More — More opens the Quick Menu bottom sheet, not a
4th page).
- Minimum 44×44px tap targets. No horizontal scroll. No text under 13px.
- 3D/heavy animation degrades gracefully on mobile; respects
`prefers-reduced-motion`.
- Test breakpoints: 375px, 768px, 1440px.

## Stack

- Tailwind CSS (mapped to the tokens above — never a second parallel
color-variable system; if one is ever found, consolidate to one).
- `@react-three/fiber`/`three` for the real 3D hero coin, `gsap` for
scroll choreography, `framer-motion` for UI-level transitions and the
Quick Menu's spring entrance, `canvas-confetti` for the check-in
celebration, `react-router-dom` for routing.
- Backend: plain PHP 8.1+, PDO with prepared statements only, Composer
(`resend/resend-php` for email). **No Paystack or other automated
payment gateway** — top-up is a manual bank-transfer + receipt-upload
flow, reviewed through the admin panel, by deliberate choice.
