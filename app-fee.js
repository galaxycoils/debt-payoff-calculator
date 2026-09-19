/**
 * Annual-fee drag card — live slider after results.
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
  function snowflakesFromUi() {
    var out = [];
    document.querySelectorAll('.snowflake-row').forEach(function (row) {
      var month = parseInt((row.querySelector('.sf-month') || {}).value, 10) || 0;
      var amount = parseFloat((row.querySelector('.sf-amount') || {}).value) || 0;
      if (month > 0 && amount > 0) out.push({ month: month, amount: amount });
    });
    return out;
  }
  function feeFromUi() {
    var el = document.getElementById('fee-slider');
    return el ? parseFloat(el.value) || 0 : 95;
  }

  function inputFromUi() {
    if (typeof getDebtsFromUI !== 'function') return null;
    var debts = getDebtsFromUI();
    if (!debts.length) return null;
    return {
      debts: debts,
      extra: extraFromUi(),
      snowflakes: snowflakesFromUi(),
      annualFee: feeFromUi(),
      strategy: 'avalanche'
    };
  }

  function ensureCard() {
    var results = document.getElementById('results');
    if (!results) return;
    if (document.getElementById('fee-card')) return;
    var anchor = document.getElementById('hybrid-card')
      || document.getElementById('winner-banner')
      || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'fee-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Hidden leak</p>' +
      '<h2 class="text-lg font-semibold text-accent mb-1">Annual-fee drag</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Club cards and travel cards bill $95–$695 once a year while the balance is still open. Drag the fee and watch months slip.</p>' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<input id="fee-slider" type="range" min="0" max="695" step="5" value="95" class="flex-1 accent-teal-700" />' +
      '<div id="fee-display" class="text-sm font-semibold tabular-nums w-16 text-right">$95</div>' +
      '</div>' +
      '<div class="grid grid-cols-3 gap-3 mb-3">' +
      '<div><div id="fee-months" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">extra months</div></div>' +
      '<div><div id="fee-paid" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">fees billed</div></div>' +
      '<div><div id="fee-drag" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">total drag</div></div>' +
      '</div>' +
      '<p id="fee-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="credit-card-annual-fee-vs-payoff.html">Should you keep a fee card while paying it off?</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);

    var slider = document.getElementById('fee-slider');
    if (slider && !slider._bound) {
      slider._bound = true;
      slider.addEventListener('input', function () {
        var disp = document.getElementById('fee-display');
        if (disp) disp.textContent = '$' + String(slider.value);
        run();
      });
    }
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareAnnualFee) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('fee-card');
    if (!input || !card) {
      if (card) card.classList.add('hidden');
      return;
    }
    var c = PayoffEngine.compareAnnualFee(input);
    card.classList.remove('hidden');
    var mEl = document.getElementById('fee-months');
    var pEl = document.getElementById('fee-paid');
    var dEl = document.getElementById('fee-drag');
    var copy = document.getElementById('fee-copy');
    if (mEl) mEl.textContent = String(Math.max(0, c.extraMonths));
    if (pEl) pEl.textContent = fmtMoney(c.feesPaid);
    if (dEl) dEl.textContent = fmtMoney(c.totalDrag);
    if (copy) {
      if (c.annualFee <= 0 || c.withFees.months < 12) {
        copy.textContent = 'This plan finishes before the next annual-fee cycle. The card is not billing you extra on the way out.';
      } else {
        copy.textContent = 'A $' + c.annualFee + ' fee on each still-open debt adds ' +
          Math.max(0, c.extraMonths) + ' month' + (c.extraMonths === 1 ? '' : 's') +
          ' and ' + fmtMoney(c.totalDrag) + ' in fees plus extra interest. Product-change or product-cancel after the last purchase cycle if the perks are not worth that drag.';
      }
    }
    if (c.annualFee > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'fee_drag' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._feeWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._feeWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
