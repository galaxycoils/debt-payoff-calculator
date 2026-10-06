/**
 * Days-bought-back card + missed-payment shock.
 * Double-bezel result surface. Copy lines are the share loop.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function extraFromUi() {
    var el = document.getElementById('extra-slider');
    return el ? parseFloat(el.value) || 0 : 0;
  }
  function strategyFromUi() {
    var el = document.getElementById('strategy');
    return el && el.value === 'avalanche' ? 'avalanche' : 'snowball';
  }
  function inputFromUi() {
    if (typeof getDebtsFromUI !== 'function') return null;
    var debts = getDebtsFromUI();
    if (!debts.length) return null;
    return { debts: debts, extra: extraFromUi(), strategy: strategyFromUi() };
  }

  function ensureCard() {
    if (document.getElementById('calendar-card')) return;
    var anchor = document.getElementById('hero-card') || document.getElementById('results');
    if (!anchor || !anchor.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'calendar-card';
    wrap.className = 'hidden rounded-[2rem] bg-black/5 dark:bg-white/5 p-1.5 mt-4';
    wrap.innerHTML =
      '<div class="rounded-[1.6rem] bg-[var(--card)] p-5 md:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Calendar</p>' +
      '<h2 class="text-lg font-semibold mb-1">Days this plan buys back</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Versus paying minimums only. A missed payment puts days back on the calendar.</p>' +
      '<p id="calendar-days" class="text-4xl md:text-5xl font-semibold tracking-tight mb-1">—</p>' +
      '<p id="calendar-sub" class="text-sm text-slate-600 dark:text-slate-300 mb-4"></p>' +
      '<div class="flex flex-wrap gap-2 mb-4">' +
      '<button type="button" data-miss="1" class="calendar-miss rounded-full px-4 py-2 text-sm font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">Miss 1 month</button>' +
      '<button type="button" data-miss="2" class="calendar-miss rounded-full px-4 py-2 text-sm font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">Miss 2</button>' +
      '<label class="inline-flex items-center gap-2 text-sm rounded-full px-4 py-2 bg-black/5 dark:bg-white/5 min-h-[44px]">Fee <input id="calendar-fee" type="number" min="0" step="5" value="40" class="w-16 bg-transparent text-right font-semibold outline-none" /></label>' +
      '</div>' +
      '<p id="calendar-shock" class="text-sm text-slate-700 dark:text-slate-200 mb-4"></p>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button type="button" id="calendar-copy" class="rounded-full pl-5 pr-2 py-2 text-sm font-semibold bg-accent text-white min-h-[44px] inline-flex items-center gap-2">Copy the line <span class="w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center">↗</span></button>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="days-bought-back.html">Days bought back</a>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="what-a-missed-payment-costs.html">Missed payment cost</a>' +
      '</div></div>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    wrap.querySelectorAll('.calendar-miss').forEach(function (btn) {
      btn.addEventListener('click', function () {
        wrap.setAttribute('data-miss', btn.getAttribute('data-miss'));
        run();
      });
    });
    var fee = document.getElementById('calendar-fee');
    if (fee) fee.addEventListener('input', function () { run(); });
    var copy = document.getElementById('calendar-copy');
    if (copy) copy.addEventListener('click', function () {
      var line = document.getElementById('calendar-sub');
      var shock = document.getElementById('calendar-shock');
      var text = ((line && line.textContent) || '') + ' ' + ((shock && shock.textContent) || '');
      if (navigator.clipboard && text.trim()) navigator.clipboard.writeText(text.trim());
      if (typeof showToast === 'function') showToast('Calendar line copied');
      if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'days_back' });
    });
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareToMinimums || !PayoffEngine.daysBoughtBack) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('calendar-card');
    if (!input || !card) return;
    var cmp = PayoffEngine.compareToMinimums(input);
    var bought = PayoffEngine.daysBoughtBack(cmp.plan.months, cmp.minimums.months);
    card.classList.remove('hidden');
    var days = document.getElementById('calendar-days');
    var sub = document.getElementById('calendar-sub');
    if (days) days.textContent = bought.days.toLocaleString() + ' days';
    if (sub) {
      sub.textContent = bought.monthsSaved > 0
        ? 'This plan buys back ' + bought.days + ' days — about ' + bought.weekends + ' weekends' + (bought.birthdays ? ' and ' + bought.birthdays + (bought.birthdays === 1 ? ' birthday' : ' birthdays') : '') + ' versus minimums.'
        : 'Minimums already match this plan. Extra payments are what buy days back.';
    }
    var miss = parseInt(card.getAttribute('data-miss') || '1', 10);
    var feeEl = document.getElementById('calendar-fee');
    var fee = feeEl ? parseFloat(feeEl.value) || 0 : 40;
    var shock = PayoffEngine.missedPaymentShock(input.debts, input.extra, input.strategy, { monthsMissed: miss, fee: fee });
    var shockEl = document.getElementById('calendar-shock');
    if (shockEl) {
      shockEl.textContent = 'Miss ' + miss + ' month' + (miss === 1 ? '' : 's') + ' on ' + shock.target + ' plus a ' + fmtMoney(fee) + ' fee: ' + shock.monthsAdded + ' months longer and ' + fmtMoney(shock.interestAdded) + ' more interest.';
    }
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'missed_shock' });
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._calendarWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { run(); } catch (e) {}
      return out;
    };
    window.runCalc._calendarWrapped = true;
  }
})();
