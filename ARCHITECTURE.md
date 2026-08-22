# Architecture (after #1–#6)

```
payoff-engine.js   pure calculate(plan) → result
persistence.js     storage seam (localStorage | memory backend)
gamification.js    pure reduce(state, event) → { state, effects }
app-boot.js        adapter: wires modules into existing UI
index.html         DOM + Chart + operate-mode shell
```

## Tests
```bash
node architecture.test.js
```

Covers PayoffEngine, Persistence (memory backend), Gamification transitions.

## Design
See DESIGN.md — operate mode, hero debt-free date, token palette.

## Index script order
1. Tailwind / Chart / jsPDF CDNs
2. payoff-engine.js
3. persistence.js
4. gamification.js
5. inline UI script
6. app-boot.js (last)

If script tags are missing from index.html, add them in that order.
