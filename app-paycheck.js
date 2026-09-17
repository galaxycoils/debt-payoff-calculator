/**
 * Paycheck-share card — live % of take-home applied as extra.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function extraFromUi() {
    var el = document.getElementById('extra-slider');
    return el ? parseFloat(el.value) || 0 : 0;
  }

  function ensureCard() {
    var results = document.getElementById('results');
    if (!results) return;
    if (document.getElementById('paycheck-card')) return;
    var anchor = document.getElementById('trap-card') || document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'paycheck-card';
    card.className = 'card hidden border-l-4';
    card.style.borderLeftColor = 'var(--accent)';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Paycheck share</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">What if this percent of take-home became extra principal?</p>' +
      '<div class="grid sm:grid-cols-2 gap-3 mb-3">' +
      '<label class="text-sm">Take-home / month' +
      '<input id="paycheck-income" type="number" min="0" step="50" value="4000" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" />' +
      '</label>' +
      '<label class="text-sm">Share of paycheck' +
      '<div class="flex items-center gap-2 mt-1">' +
      '<input id="paycheck-pct" type="range" min="0" max="30" step="1" value="10" class="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '<span id="paycheck-pct-label" class="text-sm font-semibold text-accent w-12">10%</span>' +
      '</div></label></div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">' +
      '<div><div id="paycheck-extra" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">extra from share</div></div>' +
      '<div><div id="paycheck-left" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">left after mins + extra</div></div>' +
      '<div><div id="paycheck-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-[11px] text-slate-500">months vs current extra</div></div>' +
      '<div><div id="paycheck-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">interest vs current extra</div></div>' +
      '</div>' +
      '<p id="paycheck-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<button type="button" id="paycheck-apply" class="mt-3 px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent">Apply this extra</button>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="paycheck-percent-to-debt.html">How much of a paycheck should go to debt?</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);

    ['paycheck-income', 'paycheck-pct'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._payBound) {
        el._payBound = true;
        el.addEventListener('input', run);
      }
    });
    var apply = document.getElementById('paycheck-apply');
    if (apply && !apply._payBound) {
      apply._payBound = true;
      apply.addEventListener('click', function () {
        var needed = parseFloat(apply.getAttribute('data-extra') || '0') || 0;
        var slider = document.getElementById('extra-slider');
        if (!slider) return;
        var next = Math.max(0, Math.round(needed / 10) * 10);
        if (parseFloat(slider.max) < next) slider.max = String(next);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof window.runCalc === 'function') window.runCalc();
      });
    }
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.comparePaycheckShare) return;
    if (typeof getDebtsFromUI !== 'function') return;
    ensureCard();
    var card = document.getElementById('paycheck-card');
    var debts = getDebtsFromUI();
    if (!card || !debts.length) return;
    var incomeEl = document.getElementById('paycheck-income');
    var pctEl = document.getElementById('paycheck-pct');
    var pctLabel = document.getElementById('paycheck-pct-label');
    var takeHome = incomeEl ? parseFloat(incomeEl.value) || 0 : 0;
    var percent = pctEl ? parseFloat(pctEl.value) || 0 : 0;
    if (pctLabel) pctLabel.textContent = percent + '%';
    var report = PayoffEngine.comparePaycheckShare({
      debts: debts,
      extra: extraFromUi(),
      strategy: (document.getElementById('strategy') || {}).value === 'avalanche' ? 'avalanche' : 'snowball'
    }, { takeHome: takeHome, percent: percent });
    card.classList.remove('hidden');
    var eEl = document.getElementById('paycheck-extra');
    var lEl = document.getElementById('paycheck-left');
    var mEl = document.getElementById('paycheck-months');
    var iEl = document.getElementById('paycheck-interest');
    var copy = document.getElementById('paycheck-copy');
    var apply = document.getElementById('paycheck-apply');
    if (eEl) eEl.textContent = fmtMoney(report.extraFromShare);
    if (lEl) lEl.textContent = fmtMoney(report.leftover);
    if (mEl) {
      var ms = report.monthsSaved;
      mEl.textContent = (ms > 0 ? '−' : ms < 0 ? '+' : '') + Math.abs(ms);
    }
    if (iEl) iEl.textContent = fmtMoney(report.interestSaved);
    if (copy) {
      if (report.leftoverTight) {
        copy.textContent = 'This share plus minimums is larger than take-home. Drop the percent or the plan is not livable.';
      } else if (report.moreAggressive) {
        copy.textContent = percent + '% of take-home is ' + fmtMoney(report.extraFromShare) +
          ' extra — ' + Math.abs(report.monthsSaved) + ' fewer months and ' +
          fmtMoney(report.interestSaved) + ' less interest than your current slider.';
      } else if (report.monthsSaved < 0) {
        copy.textContent = 'This share is smaller than the extra already on the slider. Raise the percent to beat the current plan.';
      } else {
        copy.textContent = 'Same extra as the slider. Leftover living money: ' + fmtMoney(report.leftover) + '.';
      }
    }
    if (apply) apply.setAttribute('data-extra', String(report.extraFromShare));
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'paycheck_share' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._paycheckWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._paycheckWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
