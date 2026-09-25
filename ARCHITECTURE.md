# Architecture (after #1–#6)

```
payoff-engine.js   pure calculate / compareConsolidation / cadence / compareHourValue / compareRoundUp (via ext)
payoff-engine-freedom.js  first-year cash after debt-free
payoff-engine-track.js     on-track check-in + utilization path
payoff-engine-paycheck.js  percent of take-home → extra
payoff-engine-fee.js       annual-fee drag vs no-fee plan
payoff-engine-ladder.js    extra ladder + partner chip-in
payoff-engine-cashflow.js  highest-min first vs snowball / avalanche
payoff-engine-promo.js     promo-first order + extra to clear before cliff
payoff-engine-thirteenth.js month-one split + yearly 13th payment
payoff-engine-yearone.js  debts killed in first 12 months
app-consolidation.js  loan vs stay UI
persistence.js     storage seam (localStorage | memory backend)
gamification.js    pure reduce(state, event) → { state, effects }
app-boot.js        adapter: wires modules into existing UI
index.html         DOM + Chart + operate-mode shell
```

## Tests
```bash
node architecture.test.js
node payoff-engine-roundup.test.js
node payoff-engine-clock.test.js
node payoff-engine-freedom.test.js
node payoff-engine-track.test.js
node payoff-engine-paycheck.test.js
node payoff-engine-fee.test.js
node payoff-engine-ladder.test.js
node payoff-engine-cashflow.test.js
node payoff-engine-promo.test.js
node payoff-engine-thirteenth.test.js
node payoff-engine-yearone.test.js
```

Covers PayoffEngine, Persistence (memory backend), Gamification transitions, round-up extras, payday reminders, daily interest burn, first-year freedom pile, on-track check-in, annual-fee drag, extra ladder, cash-flow first, 13th payment, year-one wins.

## Design
See DESIGN.md — operate mode, hero debt-free date, token palette.

## Index script order
1. Tailwind / Chart / jsPDF CDNs
2. payoff-engine.js
3. persistence.js
4. gamification.js
5. inline UI script
6. app-boot.js (last; loads scenario modules including app-thirteenth.js and app-yearone.js)

If script tags are missing from index.html, add them in that order.
