/**
 * Highest-minimum-first (cash-flow) comparison card.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }
  function extraFromUi() {
    var el = document.getElementById('extra-slider');
    return el ? parseFloat(el.value) || 0 : 0;
  }
  function strategyFromUi() {
    var el = document.getElementById('strategy');
    return el && el.value === 'avalanche' ? 'avalanche' : 'snowball';
  }
  function snowflakesFromUi() {
    var out = [];
    document.querySelectorAll('.snowflake-row').forEach(function (row) {
      var month = parseInt((row.querySelector('.sf-month') || {}).value, 10) || 0;
      var amount = parseFloat((row.querySelector('.sf-amount') || {}).value) || 0;
      if (month > 0 && amount > 0) out.push({ month: month, amount: amount });
    });
    return out;
  }
  function inputFromUi() {
    if (typeof getDebtsFromUI !== 'function') return null;
    var debts = getDebtsFromUI();
    if (!debts.length) return null;
    return { debts: debts, extra: extraFromUi(), strategy: strategyFromUi(), snowflakes: snowflakesFromUi() };
  }

  function ensureCard() {
    if (document.getElementById('cashflow-card')) return document.getElementById('cashflow-card');
    var anchor = document.getElementById('focus-card') || document.getElementById('ladder-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'cashflow-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Kill the biggest bill first?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Cash-flow first aims extra at the highest minimum. Snowball aims small balances. Avalanche aims high APR.</p>' +
      '<div class="grid grid-cols-3 gap-2 text-sm" id="cashflow-grid">' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Snowball</p><p id="cf-snow-date" class="font-semibold text-sm">—</p><p id="cf-snow-meta" class="text-[11px] text-slate-500 mt-1"></p></div>' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Avalanche</p><p id="cf-aval-date" class="font-semibold text-sm">—</p><p id="cf-aval-meta" class="text-[11px] text-slate-500 mt-1"></p></div>' +
      '<div class="rounded-2xl bg-accent-soft/50 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Highest min</p><p id="cf-cash-date" class="font-semibold text-sm">—</p><p id="cf-cash-meta" class="text-[11px] text-slate-500 mt-1"></p></div>' +
      '</div>' +
      '<p id="cashflow-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<p class="text-xs mt-2"><a href="highest-minimum-first.html" class="text-accent underline">When freeing cash-flow beats APR math</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(c) {
    if (!c) return;
    var sd = document.getElementById('cf-snow-date');
    var ad = document.getElementById('cf-aval-date');
    var cd = document.getElementById('cf-cash-date');
    var sm = document.getElementById('cf-snow-meta');
    var am = document.getElementById('cf-aval-meta');
    var cm = document.getElementById('cf-cash-meta');
    var v = document.getElementById('cashflow-verdict');
    if (sd) sd.textContent = fmtDate(c.snowball.debtFreeDate);
    if (ad) ad.textContent = fmtDate(c.avalanche.debtFreeDate);
    if (cd) cd.textContent = fmtDate(c.cashflow.debtFreeDate);
    if (sm) sm.textContent = c.snowball.months + ' mo · first ' + (c.firstKillSnowball.name || '—') + ' m' + c.firstKillSnowball.month;
    if (am) am.textContent = c.avalanche.months + ' mo · ' + fmtMoney(c.avalanche.totalInterest) + ' interest';
    if (cm) cm.textContent = c.cashflow.months + ' mo · frees ' + fmtMoney(c.firstKillCashflow.freedMonthly) + '/mo at m' + c.firstKillCashflow.month;
    if (!v) return;
    var fastestLabel = c.fastestKey === 'cashflow' ? 'highest-min' : c.fastestKey;
    var parts = ['Fastest finish: ' + fastestLabel + '.'];
    if (c.firstCashWins) {
      parts.push('Highest-min still lands the first cash-flow win sooner — ' +
        (c.firstKillCashflow.name || 'that bill') + ' dies month ' + c.firstKillCashflow.month +
        ' and frees ' + fmtMoney(c.firstKillCashflow.freedMonthly) + '/mo.');
    } else if (c.interestDeltaVsAvalanche > 1) {
      parts.push('Hunting the biggest bill costs about ' + fmtMoney(c.interestDeltaVsAvalanche) + ' more interest than avalanche.');
    } else {
      parts.push('On this stack the calendars are close. Use the first-kill date if motivation is the scarce resource.');
    }
    v.textContent = parts.join(' ');
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareCashflowFirst) return;
    var input = inputFromUi();
    if (!input || input.debts.length < 2) return;
    var c = PayoffEngine.compareCashflowFirst(input);
    window._lastCashflow = c;
    paint(c);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'cashflow_first' });
    return c;
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    var input = inputFromUi();
    if (!input || input.debts.length < 2) return;
    card.classList.remove('hidden');
    run();
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._cashflowBound) {
      calc._cashflowBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._cashflowBound) {
      extra._cashflowBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
