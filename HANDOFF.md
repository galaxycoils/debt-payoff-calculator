# Debt Payoff Calculator — Complete Handoff Document

**Last updated:** 2026-08-20  
**Repo:** https://github.com/galaxycoils/debt-payoff-calculator  
**Live (Vercel):** https://debt-payoff-calculator-six.vercel.app  
**Owner GitHub:** galaxycoils  
**License:** MIT  
**Business model:** Domain-only cost · Free hosting · AdSense + finance affiliates · Passive / AI-maintained

---

## 1. Project Description

A **100% client-side**, privacy-first **debt snowball / avalanche calculator** designed to:

1. Be highly useful and addictive (return visits, long sessions)
2. Rank for high-intent finance keywords
3. Monetize via AdSense + contextual finance affiliates
4. Cost nothing beyond a domain name
5. Improve itself daily via an automated Grok schedule

Users enter debts (name, balance, APR, minimum payment), set an extra monthly payment, and instantly see:
- Debt-free date
- Total interest paid
- Side-by-side Snowball vs Avalanche comparison
- Month-by-month schedule
- Which debt is paid off in which month (“Kill Order”)
- Progress toward freedom + celebration when close

All numbers stay in the browser. Nothing is sent to a server.

---

## 2. What Has Been Done (Chronological)

| Phase | What | How |
|-------|------|-----|
| **Repo bootstrap** | Created public GitHub repo `galaxycoils/debt-payoff-calculator` | `github___create_repository` |
| **MVP** | Single-file HTML calculator (debts, extra payment, snowball/avalanche, Chart.js, localStorage) | Written and committed as `index.html` |
| **Comparison upgrade** | Full side-by-side Snowball vs Avalanche, dual charts, winner banner with $ and months saved | Major rewrite of results rendering |
| **Engagement layer** | Live extra-payment slider, “What if +$50/+100/+200” buttons, progress % bar, copy summary, share | Client-side event handlers + live recalc |
| **Gamification** | Daily check-in streak, XP, levels, 8 achievements, toast notifications | `localStorage` key `debtPayoffGame` |
| **Dark mode** | Toggle + system preference + no-flash apply in `<head>` | Tailwind `darkMode: 'class'` + `localStorage` `debtPayoffTheme` |
| **Retention features** | Debt Kill Order timeline, near-debt-free celebration + confetti, calculation history (last 8 scenarios) | Extended `calculatePayoff` to track `payoffOrder`; history in `debtPayoffHistory` |
| **Code split** | Logic extracted into `app-core.js` + `app-ui.js` | Daily automation refactored single file into modules |
| **Hosting** | Linked GitHub repo → Vercel project, production deploy | `vercel___create_git_project` |
| **Daily automation** | Every day 09:00 America/New_York, Grok improves the repo | Automations task “Daily Debt Calculator – Addictive + Viral Features” |
| **Docs** | `README.md`, `FEATURES.md`, this `HANDOFF.md` | Written in-repo |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (no backend)                                        │
│                                                              │
│  index.html          → structure, CSS, CDN scripts, shells   │
│  app-core.js         → theme, gamification, calc engine,     │
│                        history, confetti, kill-order data    │
│  app-ui.js           → render results, charts, schedule,     │
│                        events, init                          │
│                                                              │
│  localStorage                                                │
│    debtPayoffDebts   → saved debt list                       │
│    debtPayoffExtra   → last extra payment                    │
│    debtPayoffTheme   → 'light' | 'dark'                      │
│    debtPayoffGame    → XP, level, streak, achievements       │
│    debtPayoffHistory → last 8 calculation scenarios          │
└─────────────────────────────────────────────────────────────┘
         │
         │ git push to main
         ▼
┌──────────────────────┐     ┌──────────────────────────────┐
│  GitHub              │────▶│  Vercel (auto deploy)        │
│  galaxycoils/        │     │  debt-payoff-calculator-six  │
│  debt-payoff-calculator    │  .vercel.app                 │
└──────────────────────┘     └──────────────────────────────┘
         ▲
         │ daily commits
┌──────────────────────┐
│  Grok Automation     │
│  09:00 ET daily      │
└──────────────────────┘
```

### Design principles
- **Zero server cost** — static files only (Cloudflare Pages or Vercel free tier)
- **Privacy** — no accounts, no network calls for core features
- **CDN-only dependencies** — Tailwind, Chart.js (no npm build required for current setup)
- **Progressive enhancement** — works without JS for shell; full power with JS
- **Mobile-first** — responsive grids and touch-friendly controls

---

## 4. File Map (Where Everything Is)

| Path | Responsibility |
|------|----------------|
| `index.html` | HTML structure, Tailwind + Chart.js CDN, dark-mode early script, CSS (cards, badges, timeline, confetti canvas), all DOM shells, loads `app-core.js` then `app-ui.js` |
| `app-core.js` | Theme toggle, gamification (XP/levels/streak/achievements), debt row factory, `getDebtsFromUI`, **`calculatePayoff`** (core amortization + payoffOrder), history load/save/render, confetti, celebration + kill-order data helpers |
| `app-ui.js` | `renderSingle`, `updateProgress`, `renderResults`, `drawChart`, `renderSchedule`, `runCalc`, all major event listeners, init (load debts, render game + history) |
| `README.md` | Short public description |
| `FEATURES.md` | Implemented vs next addictive/viral features |
| `HANDOFF.md` | This document |

### Key functions (mental index)

**Calculation (app-core.js)**  
- `calculatePayoff(debtList, extra, strategy)` → `{ months, totalInterest, history, payoffOrder, debtFreeDate, strategy, startingTotal }`  
- Strategies: `'snowball'` (lowest balance first) or `'avalanche'` (highest APR first)  
- Tracks when each debt hits zero → `payoffOrder` for Kill Order UI

**Gamification (app-core.js)**  
- `addXP`, `unlockAchievement`, `doCheckin`, `renderGameUI`, `renderAchievements`  
- Storage key: `debtPayoffGame`

**UI (app-ui.js)**  
- `renderResults(snow, aval, mode)` — orchestrates comparison, celebration, kill order, history save, XP  
- `runCalc()` — entry point from Calculate button / live slider

---

## 5. How the Core Math Works

1. Clone debts; sort by strategy.
2. Each month:
   - Accrue interest on each balance: `balance * (apr/100/12)`
   - Pay minimums
   - Apply remaining “extra” to the first debt still > 0 (classic snowball/avalanche)
   - If a debt drops below $0.005, record `paidOffMonth` and push to `payoffOrder`
3. Record monthly total remaining balance + interest for the chart
4. Stop when total remaining < $0.01 or 720 months (safety)

Interest and balances are rounded to cents for display stability.

---

## 6. How to Run / Deploy

### Local
1. Clone the repo
2. Open `index.html` in a browser (or use any static server)
3. No build step required

### Vercel (already set up)
- Project linked to `galaxycoils/debt-payoff-calculator`
- Every push to `main` triggers a production deploy
- Production URL: https://debt-payoff-calculator-six.vercel.app

### Custom domain (domain-only cost model)
1. Buy domain (~$8–15/year)
2. In Vercel project → Settings → Domains → add domain
3. Point DNS (A/CNAME) as Vercel instructs
4. Optional: also point to Cloudflare Pages if you prefer their free tier instead

### AdSense / affiliates
- Placeholder section already exists after results (“What to do with the money you free up”)
- Apply for AdSense on the live domain once traffic/policy requirements are met
- Add affiliate links (HYSA, consolidation, credit tools) only **after** the user sees results

---

## 7. Daily Automation

- **Name:** Daily Debt Calculator – Addictive + Viral Features  
- **Schedule:** Every day 09:00 America/New_York  
- **Behavior:** Grok opens the repo, picks 1–3 high-leverage items from the FEATURES roadmap, implements them, commits to `main`  
- **Constraint:** Stay 100% client-side; no paid APIs or backends  
- **Focus order:** Addiction/retention → share/viral → monetization/SEO

If the automation is paused or deleted, recreate it via the Automations UI using the prompt stored in the task (or the FEATURES.md list).

---

## 8. Implemented Feature Checklist

- [x] Multi-debt input (name, balance, APR, min payment)
- [x] Extra monthly payment (slider + what-if buttons)
- [x] Snowball / Avalanche / Compare both
- [x] Dual Chart.js payoff curves
- [x] Winner banner (interest + months saved)
- [x] Month-by-month schedule
- [x] Progress % bar
- [x] Debt Kill Order timeline
- [x] Near-debt-free celebration + confetti (≤18 / ≤12 / ≤3 months)
- [x] Local calculation history (8 scenarios, one-tap restore)
- [x] Save debts + extra to localStorage
- [x] Share link + copy summary text
- [x] Dark mode (toggle + system + persist)
- [x] Gamification: streak, XP, levels, 8 achievements, toasts
- [x] Monetization placeholder after results
- [x] Open Graph / Twitter meta
- [x] Vercel auto-deploy from GitHub
- [x] Daily improvement automation

---

## 9. Blueprint — What Needs to Be Done Next

### High priority (traffic + retention + revenue)
1. **Snowflake payments** — one-time extra payments on specific future months  
2. **Shareable result image** — canvas/html2canvas card with debt-free date + $ saved (for social)  
3. **SEO supporting pages** — e.g. `snowball-vs-avalanche.html`, `how-extra-payments-work.html`, long-tail guides (AI-writable, static)  
4. **AdSense integration** — real units after results once approved  
5. **Affiliate links** — HYSA / consolidation / credit monitoring in the post-result card  

### Medium priority
6. More achievements (kill-order depth, history depth, dark mode used, etc.)  
7. PDF export of plan (jsPDF CDN)  
8. Better mobile polish / a11y (ARIA, focus traps)  
9. Structured data (JSON-LD) for calculator rich results  

### Ops / growth
10. Register custom domain and point to Vercel  
11. Google Search Console + Analytics (free)  
12. Soft launch posts (r/personalfinance, IndieHackers, etc.) for initial backlinks  
13. Monitor daily automation commits; pause if it drifts  

### Explicit non-goals (keep domain-only)
- No paid backend, no auth required for core tool  
- No paid APIs  
- No inventory / shipping products  

---

## 10. How It’s Coded (Conventions)

- **No build step** — plain HTML/JS; Tailwind via CDN  
- **Dark mode** — `class` strategy on `<html>`; early script prevents FOUC  
- **State** — almost everything in `localStorage`; in-memory for chart instance and last results  
- **IDs** — stable DOM ids (`extra-slider`, `calculate`, `game-bar`, etc.) used by both JS files  
- **Script order** — `app-core.js` then `app-ui.js` (UI depends on core helpers)  
- **Commits** — descriptive messages; daily bot commits to `main`  
- **Safety** — calc capped at 720 months; tiny balances zeroed at $0.005  

### Adding a feature (recipe)
1. Prefer pure functions in `app-core.js` if logic-heavy  
2. DOM updates and event wiring in `app-ui.js`  
3. New UI chrome → `index.html`  
4. Update `FEATURES.md`  
5. Commit to `main` → Vercel deploys automatically  

---

## 11. Business Context (Original Spec)

- **Max capital:** Domain price only  
- **Target:** $50–100+/day via AdSense + affiliates after ranking  
- **Addictive / passive:** High session depth + return visits; AI daily improvements  
- **Chosen niche:** Personal finance debt tools (highest RPM among researched options)  

Stress-tested failure modes (algorithm hit, delayed AdSense, competition) are mitigated by utility depth, gamification, share loops, and multi-tool expansion on the same domain later.

---

## 12. Contacts / Accounts Touching This Project

| System | Identifier |
|--------|------------|
| GitHub repo | `galaxycoils/debt-payoff-calculator` |
| Vercel team | `tahamtandariush-4575s-projects` (`team_3vDUy532EnHmBuLrvlWMNIUD`) |
| Vercel project | `debt-payoff-calculator` (`prj_KNrtKCqcSOf664bqkjqLf8HK3VzN`) |
| Production URL | https://debt-payoff-calculator-six.vercel.app |
| Daily automation | Task “Daily Debt Calculator – Addictive + Viral Features” @ 09:00 America/New_York |

---

## 13. Quick Start for the Next Person

```bash
git clone https://github.com/galaxycoils/debt-payoff-calculator.git
cd debt-payoff-calculator
# open index.html in a browser — or
npx serve .
```

1. Read `FEATURES.md` for the live roadmap.  
2. Read this file for architecture.  
3. Ship one feature from section 9.  
4. Push to `main`.  
5. Confirm Vercel deploy and hard-refresh the live URL.  

That is the complete handoff.
