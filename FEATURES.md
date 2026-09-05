# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Architecture (2026-08-22+)
- `payoff-engine.js` — calculate, compareToMinimums, extraNeededForDate, cashFreedTimeline, compareConsolidation, cadence, compareAprShock, comparePaymentHoliday, compareRaise, compareIrregularIncome
- `app-target-date.js` — target-date solver + cash-freed UI
- `app-balance-transfer.js` — transfer vs stay + annual snowflakes
- `app-consolidation.js` — consolidation loan vs stay UI
- `app-stress.js` — APR shock + payment holiday + .ics download
- `app-raise.js` — annual raise on extras
- `app-irregular.js` — lean vs flush extras for gig / irregular pay
- `app-hours.js` — overtime vs side-hustle hour-value
- `payoff-engine-fade.js` / `app-fade.js` — first-win fade + kill-order .ics
- `payoff-engine-ext.js` — also compareHourValue
- `plan-share.js` / `app-plan-share.js` — hash-encoded scenario links
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
- Shareable result image (canvas card 1200x630)
- LocalStorage for debts + extra payment (via Persistence when loaded)
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements
- Debt Kill Order timeline
- Near-debt-free celebration + confetti
- Local calculation history (last 8, one-tap restore)
- Snowflake payments
- SEO supporting pages including debt-payoff-vs-minimums.html
- **Vs minimums-only** comparison (months + interest saved)
- JSON-LD WebApplication markup on the calculator
- Post-results affiliate + AdSense placeholder grid
- Hero debt-free date as signature element (DESIGN.md)
- **Target debt-free date solver** (smallest extra that hits a chosen month)
- **Cash-freed timeline** (minimums that roll off as each debt dies)
- **Balance-transfer compare** (fee + promo APR + post-promo APR vs stay)
- **Repeating annual snowflakes** (bonus / tax-refund every 12 months)
- **Biweekly cadence** (26 half-payments = one extra monthly payment, live toggle)
- **Consolidation-loan compare** (APR + term + origination/flat fee, keep-budget default)
- **APR shock stress test** (live slider: extra months + interest if every rate rises)
- **Payment-holiday cost** (skip extras 1-3 months)
- **Debt-free .ics calendar download**
- **Annual raise slider** (put each year's raise into extras; live recalc)
- **Shareable scenario links** (`#p=` encoded plan)
- `sitemap.xml` + `robots.txt` for crawlers
- **Irregular / gig paycheck planner** (lean extra vs flush extra every N months)
- **Overtime vs side-hustle hour-value** (interest saved per hour worked)
- **First-win fade** (cost of dropping extras after the first debt dies)
- **Kill-order calendar download** (.ics of each payoff date + debt-free day)
- SEO page: dont-stop-after-first-debt.html
- Achievements: Keep Rolling, Date on the Wall

## High-Priority Next
1. Real AdSense units + live affiliate links after approval
2. Google Search Console + Analytics once custom domain is live
3. Soft launch posts for initial backlinks
4. Binary og-card.png generated from the SVG for Twitter/Facebook crawlers
5. Soft-launch copy for r/personalfinance once custom domain is live

## Why these features
First-win fade keeps people on the results card after they already have a date. Kill-order calendars create return visits on each payoff month. Long-tail SEO pages feed the calculator.
