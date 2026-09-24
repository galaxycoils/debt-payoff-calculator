# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Architecture (2026-08-22+)
- `payoff-engine.js` — calculate, compareToMinimums, extraNeededForDate, cashFreedTimeline, compareConsolidation, cadence, compareAprShock, comparePaymentHoliday, compareRaise, compareIrregularIncome, compareDelay
- `payoff-engine-thirteenth.js` / `app-thirteenth.js` — month-one principal vs interest + yearly 13th payment
- `app-boot.js` — adapter wiring modules into UI
- `architecture.test.js` — Node seam tests

## Implemented
- Side-by-side Snowball vs Avalanche comparison with winner banner and interest savings
- Dual-line charts (Chart.js) plus dashed minimums-only series
- Live extra-payment slider with real-time recalculation
- What-if +$25 / +$50 / +$100 / +$200 / +$500 buttons
- Progress % bar toward debt-free
- Month-by-month schedule
- Copy result summary + Share link + PDF export
- Shareable result image (canvas card 1200x630)
- LocalStorage for debts + extra payment (via Persistence when loaded)
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements
- Debt Kill Order timeline
- Near-debt-free celebration + confetti
- Local calculation history (last 8, one-tap restore)
- Snowflake payments
- SEO supporting pages including debt-payoff-vs-minimums.html
- **13th payment + month-one split** (principal vs interest this month; extra full payment each year)
- SEO page: thirteenth-payment-debt.html
- Achievement: Lucky 13

## High-Priority Next
1. Real AdSense units + live affiliate links after approval
2. Google Search Console + Analytics once custom domain is live
3. Soft launch posts for initial backlinks
4. Binary og-card.png generated from the SVG for Twitter/Facebook crawlers
5. Soft-launch copy for r/personalfinance once custom domain is live

## Why these features
The month-one split bar is the slot machine: drag extra and watch the bank’s slice shrink. The 13th-payment number is the shareable hook (“one extra paycheck a year saves N months”). The SEO page ranks for mortgage-style “13th payment” searches that convert to the calculator. Everything stays client-side.
