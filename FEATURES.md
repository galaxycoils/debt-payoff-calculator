# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Architecture (2026-08-22)
- `payoff-engine.js` — pure PayoffEngine.calculate
- `persistence.js` — storage seam (localStorage + memory for tests)
- `gamification.js` — pure reduce(state, event)
- `app-boot.js` — adapter wiring modules into UI
- `architecture.test.js` — Node seam tests
- `DESIGN.md` — operate-mode design contract

## Implemented
- Side-by-side Snowball vs Avalanche comparison with winner banner and interest savings
- Dual-line charts (Chart.js)
- Live extra-payment slider with real-time recalculation
- What-if +$50 / +$100 / +$200 buttons
- Progress % bar toward debt-free
- Month-by-month schedule
- Copy result summary + Share link + PDF export
- **Shareable result image** (canvas card 1200×630 — download or native share)
- LocalStorage for debts + extra payment (via Persistence when loaded)
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements (incl. share_image)
- Debt Kill Order timeline
- Near-debt-free celebration
- Local calculation history (last 8, one-tap restore) — **now saves on every calc**
- Snowflake payments
- SEO supporting pages
- Pure engine + persistence + gamification modules with tests
- Module script tags wired: payoff-engine → persistence → gamification → inline → app-boot
- Stronger OG / Twitter card meta
- Post-results affiliate + AdSense placeholder grid (only after calculate)

## High-Priority Next
1. Real AdSense units + live affiliate links after approval
2. Static `og-card.png` (1200×630) for link previews
3. More long-tail SEO guides
4. Fuller visual restyle from DESIGN.md tokens across all chrome
5. Confetti polish when months ≤ 3

## Why these features
Instant feedback, visual progress, kill-order, celebration, history restore, shareable images, and SEO pages drive session depth and organic traffic — all 100% client-side.
