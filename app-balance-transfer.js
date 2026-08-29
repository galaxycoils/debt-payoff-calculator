/**
 * Balance-transfer compare + repeating annual snowflakes.
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
    var flakeSec = document.getElementById('snowflake-section');
    if (flakeSec && !document.getElementById('add-annual-bonus')) {
      var wrap = document.createElement('div');
      wrap.className = 'mt-3 flex flex-wrap gap-2 items-end';
      wrap.innerHTML =
        '<div><label class="block text-xs text-slate-500 mb-1" for="annual-bonus-amount">Annual bonus $</label>' +
        '<input id="annual-bonus-amount" type="number" min="0" step="50" value="1000" class="w-28 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="annual-bonus-years">Years</label>' +
        '<input id="annual-bonus-years" type="number" min="1" max="20" value="3" class="w-20 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<button type="button" id="add-annual-bonus" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-accent-soft text-accent">Add yearly snowflakes</button>';
      flakeSec.appendChild(wrap);
    }
    if (!document.getElementById('balance-transfer-section') && flakeSec && flakeSec.parentNode) {
      var sec = document.createElement('div');
      sec.id = 'balance-transfer-section';
      sec.className = 'mt-6 pt-6 border-t';
      sec.style.borderColor = 'var(--line)';
      sec.innerHTML =
        '<p class="text-sm font-medium mb-2">Balance-transfer offer</p>' +
        '<p class="text-xs text-slate-400 mb-3">Compare a promo APR plus fee against staying put. Private math.</p>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="bt-fee">Fee %</label><input id="bt-fee" type="number" min="0" step="0.1" value="3" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="bt-promo-apr">Promo APR %</label><input id="bt-promo-apr" type="number" min="0" step="0.1" value="0" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="bt-promo-months">Promo months</label><input id="bt-promo-months" type="number" min="1" step="1" value="15" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '<div><label class="block text-xs text-slate-500 mb-1" for="bt-post-apr">After promo APR %</label><input id="bt-post-apr" type="number" min="0" step="0.1" value="21.99" class="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm" /></div>' +
        '</div>' +
        '<button type="button" id="compare-balance-transfer" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-accent-soft text-accent">Compare transfer vs stay</button>';
      flakeSec.parentNode.insertBefore(sec, flakeSec.nextSibling);
    }
    if (!document.getElementById('balance-transfer-card')) {
      var results = document.getElementById('results');
      var cash = document.getElementById('cash-freed-card');
      var card = document.createElement('div');
      card.id = 'balance-transfer-card';
      card.className = 'card hidden';
      card.innerHTML =
        '<p class="text-xs uppercase tracking-wide text-slate-500 mb-1">Balance transfer vs stay</p>' +
        '<p id="bt-verdict" class="font-semibold text-accent mb-3"></p>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">' +
        '<div><div id="bt-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-xs text-slate-500">months saved</div></div>' +
        '<div><div id="bt-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-xs text-slate-500">interest saved</div></div>' +
        '<div><div id="bt-fee-paid" class="text-2xl font-extrabold">$0</div><div class="text-xs text-slate-500">transfer fee</div></div>' +
        '<div><div id="bt-net" class="text-2xl font-extrabold text-accent">$0</div><div class="text-xs text-slate-500">net after fee</div></div>' +
        '</div><p id="bt-note" class="text-sm"></p>';
      if (cash && cash.parentNode) cash.parentNode.insertBefore(card, cash);
      else if (results) results.appendChild(card);
    }
    var foot = document.querySelector('footer p.mt-2');
    if (foot && !foot.querySelector('a[href="balance-transfer-vs-payoff.html"]')) {
      var a = document.createElement('a');
      a.className = 'underline hover:text-accent';
      a.href = 'balance-transfer-vs-payoff.html';
      a.textContent = 'Balance transfer math';
      foot.appendChild(document.createTextNode(' '));
      foot.appendChild(a);
    }
  }

  function readOffer() {
    function num(id, fallback) {
      var el = document.getElementById(id);
      var n = el ? parseFloat(el.value) : NaN;
      return isNaN(n) ? fallback : n;
    }
    return {
      feePercent: num('bt-fee', 3),
      promoApr: num('bt-promo-apr', 0),
      promoMonths: num('bt-promo-months', 15),
      postPromoApr: num('bt-post-apr', 21.99)
    };
  }

  function paint(result) {
    var card = document.getElementById('balance-transfer-card');
    if (!card) return;
    card.classList.remove('hidden');
    var verdict = document.getElementById('bt-verdict');
    var monthsEl = document.getElementById('bt-months');
    var interestEl = document.getElementById('bt-interest');
    var feeEl = document.getElementById('bt-fee-paid');
    var netEl = document.getElementById('bt-net');
    var note = document.getElementById('bt-note');
    if (monthsEl) monthsEl.textContent = String(result.monthsSaved);
    if (interestEl) interestEl.textContent = fmtMoney(result.interestSaved);
    if (feeEl) feeEl.textContent = fmtMoney(result.feePaid);
    if (netEl) netEl.textContent = fmtMoney(result.netSaved);
    if (verdict) {
      verdict.textContent = result.worthIt
        ? 'The transfer wins after the fee'
        : 'Staying put looks cheaper or faster';
    }
    if (note) {
      note.textContent =
        'Stay: ' + result.stay.months + ' mo / ' + fmtMoney(result.stay.totalInterest) + ' interest · ' +
        'Transfer: ' + result.transfer.months + ' mo / ' + fmtMoney(result.transfer.totalInterest) +
        ' interest, debt-free ' + fmtDate(result.transfer.debtFreeDate) + '.';
    }
  }

  function runCompare() {
    if (typeof PayoffEngine === 'undefined' || typeof PayoffEngine.compareBalanceTransfer !== 'function') {
      if (typeof showToast === 'function') showToast('Update the calculator engine and retry');
      return;
    }
    if (typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    var out = document.getElementById('bt-note');
    if (!debts.length) {
      if (out) out.textContent = 'Add a debt first.';
      return;
    }
    var slider = document.getElementById('extra-slider');
    var extra = slider ? parseFloat(slider.value) || 0 : 0;
    var modeEl = document.getElementById('strategy');
    var mode = modeEl ? modeEl.value : 'compare';
    var strat = mode === 'avalanche' ? 'avalanche' : 'snowball';
    var snowflakes = typeof getSnowflakesFromUI === 'function' ? getSnowflakesFromUI() : [];
    var r = PayoffEngine.compareBalanceTransfer({
      debts: debts,
      extra: extra,
      strategy: strat,
      snowflakes: snowflakes,
      asOf: new Date()
    }, readOffer());
    window._lastBalanceTransfer = r;
    paint(r);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'balance_transfer' });
  }

  function addAnnualBonus() {
    var amtEl = document.getElementById('annual-bonus-amount');
    var yearsEl = document.getElementById('annual-bonus-years');
    var amount = amtEl ? parseFloat(amtEl.value) || 0 : 0;
    var years = yearsEl ? parseInt(yearsEl.value, 10) || 0 : 0;
    if (amount <= 0 || years <= 0) {
      if (typeof showToast === 'function') showToast('Enter a bonus amount and years');
      return;
    }
    if (typeof PayoffEngine === 'undefined' || typeof PayoffEngine.repeatingSnowflakes !== 'function') return;
    var flakes = PayoffEngine.repeatingSnowflakes(amount, 12, years);
    var container = document.getElementById('snowflakes-container');
    if (!container) return;
    flakes.forEach(function (f) {
      if (typeof createSnowflakeRow === 'function') {
        container.appendChild(createSnowflakeRow(f));
      } else {
        var row = document.createElement('div');
        row.className = 'snowflake-row flex flex-wrap gap-2 items-center';
        row.innerHTML =
          '<input type="number" min="1" class="sf-month w-20 border rounded-lg px-2 py-2 text-sm" value="' + f.month + '" />' +
          '<input type="number" min="0" class="sf-amount w-28 border rounded-lg px-2 py-2 text-sm" value="' + f.amount + '" />';
        container.appendChild(row);
      }
    });
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('snowflake_added');
      window.dispatchGame('unlock', { id: 'annual_bonus' });
    }
    if (typeof showToast === 'function') showToast('Added ' + years + ' annual snowflake' + (years === 1 ? '' : 's'));
    if (typeof window.runCalc === 'function') window.runCalc(true);
  }

  function attach() {
    injectUi();
    var btn = document.getElementById('compare-balance-transfer');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', runCompare);
    }
    var annual = document.getElementById('add-annual-bonus');
    if (annual && !annual._bound) {
      annual._bound = true;
      annual.addEventListener('click', addAnnualBonus);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
