/**
 * Balance-transfer compare + repeating annual snowflakes.
 * Uses PayoffEngine.compareBalanceTransfer / repeatingSnowflakes.
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
    if (typeof PayoffEngine === 'undefined' || typeof getDebtsFromUI !== 'function') return;
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
    if (typeof PayoffEngine === 'undefined') return;
    var flakes = PayoffEngine.repeatingSnowflakes(amount, 12, years);
    var container = document.getElementById('snowflakes-container');
    if (!container || typeof createSnowflakeRow !== 'function') return;
    flakes.forEach(function (f) {
      container.appendChild(createSnowflakeRow(f));
    });
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('snowflake_added');
      window.dispatchGame('unlock', { id: 'annual_bonus' });
    }
    if (typeof showToast === 'function') showToast('Added ' + years + ' annual snowflake' + (years === 1 ? '' : 's'));
    if (typeof window.runCalc === 'function') window.runCalc(true);
  }

  function attach() {
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
