# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Architecture (2026-08-22+)
- `payoff-engine.js` — pure PayoffEngine.calculate + compareToMinimums
- `persistence.js` — storage seam (localStorage + memory for tests)
- `gamification.js` — pure reduce(state, event)
- `confetti.js` — near-debt-free celebration
- `app-inline.js` — full UI (restored 2026-08-24)
- `app-boot.js` — adapter wiring modules into UI
- `architecture.test.js` — Node seam tests
- `DESIGN.md` — operate-mode design contract (hero debt-free date)

## Implemented
- Side-by-side Snowball vs Avalanche comparison with winner banner and interest savings
- Dual-line charts (Chart.js) plus dashed minimums-only series
- Live extra-payment slider with real-time recalculation
- What-if +$25 / +$50 / +$100 / +$200 / +$500 buttons
- Progress % bar toward debt-free
- Month-by-month schedule
- Copy result summary + Share link + PDF export
- Shareable result image (canvas card 1200×630)
- LocalStorage for debts + extra payment (via Persistence when loaded)
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements
- Debt Kill Order timeline
- Near-debt-free celebration + confetti (≤18 / ≤12 / ≤3 months)
- Local calculation history (last 8, one-tap restore)
- Snowflake payments
- SEO supporting pages including debt-payoff-vs-minimums.html
- **Vs minimums-only** comparison (months + interest saved)
- JSON-LD WebApplication markup on the calculator
- Fixed Calculate / Copy / schedule wiring to match index.html IDs
- Post-results affiliate + AdSense placeholder grid
- Hero debt-free date as signature element (DESIGN.md)

## High-Priority Next
1. Real AdSense units + live affiliate links after approval
2. Apply design tokens to remaining SEO guide chrome
3. More long-tail SEO guides (student loans, balance transfer math)
4. Google Search Console + Analytics once custom domain is live
5. Soft launch posts for initial backlinks
6. Static og-card.png asset for social previews

## Why these features
Instant feedback, vs-minimums shock numbers, kill-order, celebration, history restore, shareable images, and SEO pages drive session depth and organic traffic — all 100% client-side.
