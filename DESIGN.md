# Design contract — Debt Payoff Calculator

**Mode:** Operate (complete a payoff plan task)

**Single job:** Show the user’s debt-free date and strategy comparison for *this* debt list.

## Hierarchy
1. Debts + extra payment + strategy (input)
2. **Hero debt-free date** (signature — the one memorable element)
3. Comparison / winner / kill order
4. Schedule + history

## Tokens
| Name | Light | Dark | Role |
|------|-------|------|------|
| paper | `#f7f5f0` | `#0f1419` | page ground |
| ink | `#1a1f2e` | `#e8eaed` | primary text |
| muted | `#5c6578` | `#9aa3b2` | secondary text |
| accent | `#0d6e6e` | `#3dbdbd` | teal action / hero date |
| accent-soft | `#e6f3f3` | `#143232` | soft fills |
| success | `#1b7f4e` | `#34d399` | wins / savings |
| warn | `#b45309` | `#fbbf24` | urgency |
| card | `#ffffff` | `#1a222d` | surfaces |
| line | `#e5e2da` | `#2a3340` | borders |

## Signature
Large **debt-free date** (`.hero-date`) — not a KPI grid of filler metrics.

## Required states
- Empty debts (prompt to add)
- Invalid / zero balance
- First-run
- Results shown
- History empty
- Already checked in today

## Explicitly rejected
- Dashboard metric card grids
- Decorative gradients as primary identity
- Novelty that fights the operate workflow
- Missing empty / disabled / success feedback

## Responsive
Mobile-first; controls min 44px touch target; dark mode via `class` on `<html>`.
