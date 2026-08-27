/**
 * app-min-compare.js — wires compareToMinimums + control IDs after app-inline.js.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function paintVs(cmp) {
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
  }

  function copyPlan() {
    var snow = window._lastSnow;
    var aval = window._lastAval;
    var mode = window._lastMode || 'compare';
    var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
    var cmp = window._lastMinCmp;
    if (!primary && cmp) primary = cmp.plan;
    if (!primary) {
      if (typeof showToast === 'function') showToast('Run a calculation first');
      return;
    }
    var lines = [
      'Debt Payoff Plan',
      'Debt-free date: ' + fmtDate(primary.debtFreeDate),
      'Months: ' + primary.months,
      'Total interest: ' + fmtMoney(primary.totalInterest),
      'Strategy: ' + (primary.strategy || mode)
    ];
    if (cmp && (cmp.monthsSaved > 0 || cmp.interestSaved > 0)) {
      lines.push('Vs minimums only: save ' + cmp.monthsSaved + ' months and ' + fmtMoney(Math.max(0, cmp.interestSaved)) + ' interest');
    }
    lines.push('Calculated privately at debt-payoff-calculator');
    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (typeof showToast === 'function') showToast('Summary copied');
      });
    }
  }

  function attach() {
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
      copyBtn.addEventListener('click', copyPlan);
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
