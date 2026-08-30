/**
 * Consolidation loan compare UI.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  function injectUi() {
    var host = document.getElementById('balance-transfer-section') || document.getElementById('target-date-section');
    if (!document.getElementById('consolidation-section') && host && host.parentNode) {
      var sec = document.createElement('div');
      sec.id = 'consolidation-section';
      sec.className = 'mt-6 pt-6 border-t';
      sec.style.borderColor = 'var(--line)';
      sec.innerHTML =
        '<p class="text-sm font-medium mb-2">Consolidation loan</p>' +
        '<p class="text-xs text-slate-400 mb-3">Roll every balance into one loan. We keep your current monthly budget unless you turn that off.</p>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="consol-apr">Loan APR %</label><input id="consol-apr" type="number" min="0" step="0.1" value="8.99" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="consol-term">Term (months)</label><input id="consol-term" type="number" min="6" step="6" value="36" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="consol-fee">Origination %</label><input id="consol-fee" type="number" min="0" step="0.1" value="3" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="consol-flat">Flat fee $</label><input id="consol-flat" type="number" min="0" step="25" value="0" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '</div>' +
        '<label class="flex items-center gap-2 text-sm mb-3"><input id="consol-keep-budget" type="checkbox" checked class="h-4 w-4" /> Keep paying what I pay now</label>' +
        '<button type="button" id="compare-consolidation" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-accent-soft text-accent">Compare loan vs stay</button>';
      host.parentNode.insertBefore(sec, host.nextSibling);
    }
    if (!document.getElementById('consolidation-card')) {
      var results = document.getElementById('results');
      var cash = document.getElementById('cash-freed-card');
      var card = document.createElement('div');
      card.id = 'consolidation-card';
      card.className = 'card hidden';
      card.innerHTML =
        '<p class="text-xs uppercase tracking-wide text-slate-500 mb-1">Consolidation vs stay</p>' +
        '<p id="consol-verdict" class="font-semibold text-accent mb-3"></p>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">' +
        '<div><div id="consol-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-xs text-slate-500">months saved</div></div>' +
        '<div><div id="consol-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-xs text-slate-500">interest saved</div></div>' +
        '<div><div id="consol-fee-paid" class="text-2xl font-extrabold">$0</div><div class="text-xs text-slate-500">loan fees</div></div>' +
        '<div><div id="consol-net" class="text-2xl font-extrabold text-accent">$0</div><div class="text-xs text-slate-500">net after fees</div></div>' +
        '</div><p id="consol-note" class="text-sm"></p>';
      if (cash && cash.parentNode) cash.parentNode.insertBefore(card, cash);
      else if (results) results.appendChild(card);
    }
  }

  function readLoan() {
    function num(id, fallback) {
      var el = document.getElementById(id);
      var n = el ? parseFloat(el.value) : NaN;
      return isNaN(n) ? fallback : n;
    }
    var keep = document.getElementById('consol-keep-budget');
    return {
      apr: num('consol-apr', 8.99),
      termMonths: num('consol-term', 36),
      feePercent: num('consol-fee', 3),
      feeFlat: num('consol-flat', 0),
      keepBudget: !keep || keep.checked
    };
  }

  function paint(result) {
    var card = document.getElementById('consolidation-card');
    if (!card) return;
    card.classList.remove('hidden');
    var results = document.getElementById('results');
    if (results) results.classList.remove('hidden');
    var set = function (id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('consol-months', String(result.monthsSaved));
    set('consol-interest', fmtMoney(result.interestSaved));
    set('consol-fee-paid', fmtMoney(result.feePaid));
    set('consol-net', fmtMoney(result.netSaved));
    var verdict = document.getElementById('consol-verdict');
    if (verdict) {
      verdict.textContent = result.worthIt
        ? 'The loan wins after fees'
        : 'Staying on your current debts looks cheaper';
    }
    var note = document.getElementById('consol-note');
    if (note) {
      note.textContent =
        'Stay: ' + result.stay.months + ' mo / ' + fmtMoney(result.stay.totalInterest) + ' interest · ' +
        'Loan: ' + result.loan.months + ' mo / ' + fmtMoney(result.loan.totalInterest) +
        ' interest, debt-free ' + fmtDate(result.loan.debtFreeDate) +
        '. New scheduled payment ' + fmtMoney(result.scheduledPayment) + '/mo.';
    }
  }

  function runCompare() {
    if (typeof PayoffEngine === 'undefined' || typeof PayoffEngine.compareConsolidation !== 'function') {
      if (typeof showToast === 'function') showToast('Update the calculator engine and retry');
      return;
    }
    if (typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    if (!debts.length) {
      if (typeof showToast === 'function') showToast('Add a debt first');
      return;
    }
    var slider = document.getElementById('extra-slider');
    var extra = slider ? parseFloat(slider.value) || 0 : 0;
    var modeEl = document.getElementById('strategy');
    var mode = modeEl ? modeEl.value : 'compare';
    var strat = mode === 'avalanche' ? 'avalanche' : 'snowball';
    var snowflakes = typeof getSnowflakesFromUI === 'function' ? getSnowflakesFromUI() : [];
    var cadenceEl = document.getElementById('cadence');
    var cadence = cadenceEl && cadenceEl.checked ? 'biweekly' : 'monthly';
    var r = PayoffEngine.compareConsolidation({
      debts: debts,
      extra: extra,
      strategy: strat,
      snowflakes: snowflakes,
      asOf: new Date(),
      cadence: cadence
    }, readLoan());
    window._lastConsolidation = r;
    paint(r);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'consolidator' });
  }

  function attach() {
    injectUi();
    var btn = document.getElementById('compare-consolidation');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', runCompare);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
