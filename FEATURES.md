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
- Copy result summary + Share + PDF export
- LocalStorage for debts + extra payment (via Persistence when loaded)
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements
- Debt Kill Order timeline
- Near-debt-free celebration
- Local calculation history
- Snowflake payments
- SEO supporting pages
- Pure engine + persistence + gamification modules with tests

## High-Priority Next
1. Ensure index.html script tags load persistence.js, gamification.js, app-boot.js (see ARCHITECTURE.md)
2. Real AdSense units + affiliate links after results
3. More long-tail SEO guides
4. Fuller visual restyle from DESIGN.md tokens across all chrome

## Why these features
Instant feedback, visual progress, kill-order, celebration, history, shareable artifacts, and SEO pages drive session depth and organic traffic — all 100% client-side.
