/**
 * Focus extra vs split extra card.
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
    if (document.getElementById('focus-card')) return document.getElementById('focus-card');
    var anchor = document.getElementById('ladder-card') || document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'focus-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Focus extra or split it?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Same extra. Focus piles it on one debt. Split sprinkles it across every open balance.</p>' +
      '<div class="grid grid-cols-2 gap-3 text-sm" id="focus-grid">' +
      '<div class="rounded-2xl bg-accent-soft/50 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Focus</p><p id="focus-date" class="font-semibold">—</p><p id="focus-meta" class="text-xs text-slate-500 mt-1"></p></div>' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Split</p><p id="split-date" class="font-semibold">—</p><p id="split-meta" class="text-xs text-slate-500 mt-1"></p></div>' +
      '</div>' +
      '<p id="focus-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<p class="text-xs mt-2"><a href="focus-vs-split-extra.html" class="text-accent underline">Why focusing usually wins</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(c) {
    var fd = document.getElementById('focus-date');
    var sd = document.getElementById('split-date');
    var fm = document.getElementById('focus-meta');
    var sm = document.getElementById('split-meta');
    var v = document.getElementById('focus-verdict');
    if (!c || !fd) return;
    fd.textContent = fmtDate(c.focus.debtFreeDate);
    sd.textContent = fmtDate(c.split.debtFreeDate);
    fm.textContent = c.focus.months + ' mo · first kill m' + c.firstKillFocus + ' · ' + fmtMoney(c.focus.totalInterest) + ' interest';
    sm.textContent = c.split.months + ' mo · first kill m' + c.firstKillSplit + ' · ' + fmtMoney(c.split.totalInterest) + ' interest';
    if (!v) return;
    if (c.winner === 'tie') {
      v.textContent = 'Same finish line. Focus still usually gets the first win sooner.';
    } else if (c.winner === 'focus') {
      v.textContent = 'Focus finishes ' + Math.max(0, c.monthsSavedByFocus) + ' month' +
        (c.monthsSavedByFocus === 1 ? '' : 's') + ' sooner' +
        (c.interestSavedByFocus > 0 ? ' and avoids ' + fmtMoney(c.interestSavedByFocus) + ' interest' : '') +
        '. First debt dies ' + Math.max(0, c.firstKillFasterBy) + ' month' +
        (c.firstKillFasterBy === 1 ? '' : 's') + ' earlier — the motivation hit.';
    } else {
      v.textContent = 'Split edges the calendar on this stack. Unusual — check APRs before you sprinkle.';
    }
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareFocusVsSplit) return;
    var input = inputFromUi();
    if (!input || input.debts.length < 2 || input.extra <= 0) return;
    var c = PayoffEngine.compareFocusVsSplit(input);
    window._lastFocusSplit = c;
    paint(c);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'focus_split' });
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
    if (calc && !calc._focusBound) {
      calc._focusBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._focusBound) {
      extra._focusBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
