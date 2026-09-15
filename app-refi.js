/**
 * Refinance / rate-cut card — live after results.
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
    var results = document.getElementById('results');
    if (!results) return;
    if (document.getElementById('refi-card')) return;
    var anchor = document.getElementById('delay-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'refi-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Refinance vs stay</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Roll every debt into one lower APR after a fee. Same extra. Net of the fee.</p>' +
      '<div class="grid sm:grid-cols-3 gap-3 mb-4">' +
      '<label class="text-xs">New APR %<input id="refi-apr" type="number" min="0" step="0.1" value="8" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></label>' +
      '<label class="text-xs">Fee %<input id="refi-fee-pct" type="number" min="0" step="0.1" value="3" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></label>' +
      '<label class="text-xs">Flat fee $<input id="refi-fee-flat" type="number" min="0" step="10" value="0" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></label>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      '<div><div id="refi-net" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">net saved after fee</div></div>' +
      '<div><div id="refi-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-[11px] text-slate-500">months saved</div></div>' +
      '<div><div id="refi-fee" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">closing fee</div></div>' +
      '</div>' +
      '<p id="refi-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="refinance-vs-payoff.html">When a rate cut is worth the fee</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    ['refi-apr', 'refi-fee-pct', 'refi-fee-flat'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._refiBound) {
        el._refiBound = true;
        el.addEventListener('input', run);
        el.addEventListener('change', run);
      }
    });
  }

  function offerFromUi() {
    var aprEl = document.getElementById('refi-apr');
    var pctEl = document.getElementById('refi-fee-pct');
    var flatEl = document.getElementById('refi-fee-flat');
    return {
      apr: aprEl ? parseFloat(aprEl.value) : 8,
      feePercent: pctEl ? parseFloat(pctEl.value) : 3,
      feeFlat: flatEl ? parseFloat(flatEl.value) : 0
    };
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareRefinance) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('refi-card');
    if (!input || !card) return;
    var cmp = PayoffEngine.compareRefinance(input, offerFromUi());
    card.classList.remove('hidden');
    var nEl = document.getElementById('refi-net');
    var mEl = document.getElementById('refi-months');
    var fEl = document.getElementById('refi-fee');
    var copy = document.getElementById('refi-copy');
    if (nEl) nEl.textContent = fmtMoney(cmp.netSaved);
    if (mEl) mEl.textContent = String(cmp.monthsSaved);
    if (fEl) fEl.textContent = fmtMoney(cmp.feePaid);
    if (copy) {
      copy.textContent = cmp.worthIt
        ? ('The cut pays for the fee. You keep ' + fmtMoney(cmp.netSaved) + ' and finish ' + cmp.monthsSaved + ' month' + (cmp.monthsSaved === 1 ? '' : 's') + ' sooner.')
        : ('Fee eats the savings. Stay unless the new APR is lower or the fee shrinks. Gap: ' + fmtMoney(cmp.netSaved) + '.');
    }
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'refi_cut' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._refiWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._refiWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
