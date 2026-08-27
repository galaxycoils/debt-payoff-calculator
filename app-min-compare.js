/**
 * app-min-compare.js — wires compareToMinimums + control IDs after app-inline.js.
 */
(function () {
  'use strict';

  function ensureVsCard() {
    if (document.getElementById('vs-minimums-card')) return;
    var results = document.getElementById('results');
    if (!results) return;
    var hero = document.getElementById('hero-card');
    var card = document.createElement('div');
    card.id = 'vs-minimums-card';
    card.className = 'card hidden border-l-4';
    card.style.borderLeftColor = 'var(--accent)';
    card.innerHTML =
      '<p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Vs paying only minimums</p>' +
      '<div class="grid grid-cols-2 gap-4 mb-3">' +
      '<div><div id="vs-min-months" class="text-3xl font-extrabold text-accent">0</div><div class="text-xs text-slate-500 dark:text-slate-400">months saved</div></div>' +
      '<div><div id="vs-min-interest" class="text-3xl font-extrabold text-accent">$0</div><div class="text-xs text-slate-500 dark:text-slate-400">interest saved</div></div>' +
      '</div>' +
      '<p class="text-sm text-slate-600 dark:text-slate-300">Plan frees you <span id="vs-plan-date">—</span>. Minimums alone: <span id="vs-min-date">—</span>.</p>' +
      '<p id="vs-min-note" class="text-xs text-slate-500 dark:text-slate-400 mt-2"></p>';
    if (hero && hero.nextSibling) results.insertBefore(card, hero.nextSibling);
    else results.insertBefore(card, results.firstChild);
  }

  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function paintVs(cmp) {
    ensureVsCard();
    var card = document.getElementById('vs-minimums-card');
    if (!card || !cmp) return;
    card.classList.remove('hidden');
    var monthsEl = document.getElementById('vs-min-months');
    var interestEl = document.getElementById('vs-min-interest');
    var minDateEl = document.getElementById('vs-min-date');
    var planDateEl = document.getElementById('vs-plan-date');
    var noteEl = document.getElementById('vs-min-note');
    if (monthsEl) monthsEl.textContent = (cmp.monthsSaved || 0).toLocaleString();
    if (interestEl) interestEl.textContent = fmtMoney(Math.max(0, cmp.interestSaved || 0));
    if (minDateEl && cmp.minimums) minDateEl.textContent = fmtDate(cmp.minimums.debtFreeDate);
    if (planDateEl && cmp.plan) planDateEl.textContent = fmtDate(cmp.plan.debtFreeDate);
    if (noteEl) {
      if (cmp.minimums && cmp.minimums.hitCap) noteEl.textContent = 'Minimums alone may never finish. Extra payments are the difference.';
      else if ((cmp.monthsSaved || 0) <= 0 && (cmp.interestSaved || 0) <= 0) noteEl.textContent = 'You are already on minimums. Drag the extra slider to see savings.';
      else noteEl.textContent = 'Time and interest you keep by paying extra — the stat people share.';
    }
  }

  function applyCompare() {
    if (typeof PayoffEngine === 'undefined' || typeof PayoffEngine.compareToMinimums !== 'function') return;
    if (typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    if (!debts.length) return;
    var extraEl = document.getElementById('extra-slider');
    var extra = extraEl ? parseFloat(extraEl.value) || 0 : 0;
    var modeEl = document.getElementById('strategy');
    var mode = modeEl ? modeEl.value : 'compare';
    var snowflakes = [];
    document.querySelectorAll('.snowflake-row').forEach(function (row) {
      var month = parseInt((row.querySelector('.sf-month') || {}).value, 10) || 0;
      var amount = parseFloat((row.querySelector('.sf-amount') || {}).value) || 0;
      if (month > 0 && amount > 0) snowflakes.push({ month: month, amount: amount });
    });
    var strat = mode === 'avalanche' ? 'avalanche' : 'snowball';
    var cmp = PayoffEngine.compareToMinimums({ debts: debts, extra: extra, strategy: strat, snowflakes: snowflakes });
    window._lastMinCmp = cmp;
    paintVs(cmp);
    var hero = document.getElementById('hero-date');
    var sub = document.getElementById('hero-sub');
    if (cmp.plan && hero && (!hero.textContent || hero.textContent === '—')) {
      hero.textContent = fmtDate(cmp.plan.debtFreeDate);
    }
    if (cmp.plan && sub && !sub.textContent) {
      sub.textContent = cmp.plan.months + ' months · ' + fmtMoney(cmp.plan.totalInterest) + ' interest';
    }
  }

  function attach() {
    ensureVsCard();
    var calcBtn = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calcBtn && !calcBtn._minBound) {
      calcBtn._minBound = true;
      calcBtn.addEventListener('click', function () {
        if (typeof window.runCalc === 'function') window.runCalc(false);
        setTimeout(applyCompare, 0);
      });
    }
    var copyBtn = document.getElementById('copy-summary-btn') || document.getElementById('copy-summary');
    if (copyBtn && !copyBtn._minBound) {
      copyBtn._minBound = true;
      copyBtn.addEventListener('click', function () {
        var cmp = window._lastMinCmp;
        if (!cmp || !navigator.clipboard) return;
        if ((cmp.monthsSaved || 0) <= 0 && (cmp.interestSaved || 0) <= 0) return;
        var extra = 'Vs minimums only: save ' + cmp.monthsSaved + ' months and ' + fmtMoney(Math.max(0, cmp.interestSaved)) + ' interest';
        navigator.clipboard.readText().then(function (t) {
          if (t && t.indexOf('Vs minimums') === -1) navigator.clipboard.writeText(t + '\n' + extra);
        }).catch(function () {});
      });
    }
    var slider = document.getElementById('extra-slider');
    if (slider && !slider._minBound) {
      slider._minBound = true;
      slider.addEventListener('input', function () { setTimeout(applyCompare, 0); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
