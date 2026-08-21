# Addictive & Viral Feature Roadmap

Goal: Maximize time-on-site, return visits, and shares so AdSense revenue grows. Everything stays client-side.

## Implemented
- Side-by-side Snowball vs Avalanche comparison with winner banner and interest savings
- Dual-line charts (Chart.js)
- Live extra-payment slider with real-time recalculation
- “What if +$50 / +$100 / +$200” quick scenario buttons
- Progress % bar toward debt-free
- Month-by-month schedule
- Copy result summary + Share button (Web Share API / clipboard)
- LocalStorage for debts + extra payment
- Dark mode with system preference + toggle
- Gamification: daily check-in streak, XP, levels, achievements (11 total)
- **Debt Kill Order timeline** — which debt dies in which month (visual sequence)
- **Near-debt-free celebration** + confetti when ≤18 months remaining
- **Local calculation history** (last 8 scenarios) — reload previous runs with one tap
- Clean monetization placeholder after results
- Open Graph / Twitter card meta + canonical
- **Snowflake payments** — one-time bonus payments on a specific future month (tax refund, bonus, gift). Live recalc on change; extra rolls across debts in order.
- **Shareable result image** — canvas-generated 1200×630 PNG with debt-free date, months, interest, strategy badge. One-click download for social/Reddit.
- **SEO supporting pages** — `snowball-vs-avalanche.html`, `how-extra-payments-work.html` with internal links and CTAs
- **JSON-LD** structured data (WebApplication) for richer search results
- New achievements: Snowflake, Time Traveler (5 history), Debt Slayer (multi-debt kill order)

## High-Priority Next
1. Faster perceived performance and more mobile polish / a11y
2. PDF export of plan (jsPDF CDN)
3. More long-tail SEO guides (debt consolidation vs payoff, credit card payoff tips, etc.)
4. Real AdSense units + affiliate links after results (once approved)
5. Structured FAQ schema on SEO pages

## Why these features
Research on top debt tools (Undebt.it, Debt Payoff Planner, Unbury.me, etc.) and retention patterns shows:
- Instant feedback loops (sliders, live recalculation, snowflakes) keep users playing with numbers
- Visual progress, kill-order timelines, and “wins” create emotional investment
- Scenario history increases return visits and session depth
- Celebration moments (confetti) make the tool feel rewarding → more shares
- Shareable artifacts (image + text) drive organic traffic
- SEO pages capture long-tail intent and feed the calculator

All features remain 100% client-side and free to host.
