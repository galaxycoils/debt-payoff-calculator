# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Architecture (2026-08-22+)
- `payoff-engine.js` — calculate, compareToMinimums, extraNeededForDate, cashFreedTimeline, compareConsolidation, cadence, compareAprShock, comparePaymentHoliday, compareRaise, compareIrregularIncome
- `payoff-engine-invest.js` / `app-invest.js` — pay extra vs invest extra + milestone map
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
- Achievements: Keep Rolling, Date on the Wall, Bonus Drop, Cut the Cord
- **Windfall allocator** (lump bonus this month vs drip over N months)
- SEO page: use-a-windfall-on-debt.html
- **Subscription cut** (redirect a monthly bill into extras; presets + apply)
- SEO page: cancel-a-subscription-pay-debt.html
- **Emergency-fund vs extra** (divert part of extra into a HYSA; months delayed vs cash on hand)
- **Daily leak redirect** ($/day habit → extra principal, apply to slider)
- SEO page: emergency-fund-vs-debt.html
- Achievements: Cash Cushion, Plug the Leak
- **Pay extra vs invest extra** (interest avoided vs future value of the extra at an assumed return)
- **Milestone map** (25% / halfway / 75% / debt-free dates on the results card)
- SEO page: pay-debt-vs-invest.html
- Achievement: Rate vs Market

## High-Priority Next
1. Real AdSense units + live affiliate links after approval
2. Google Search Console + Analytics once custom domain is live
3. Soft launch posts for initial backlinks
4. Binary og-card.png generated from the SVG for Twitter/Facebook crawlers
5. Soft-launch copy for r/personalfinance once custom domain is live

## Why these features
Pay-vs-invest is the argument people reopen every bonus and every bull market. The live return field keeps them on the results card. Milestone dates give a reason to come back. Everything stays client-side.
