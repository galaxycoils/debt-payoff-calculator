/**
 * First-win fade card + kill-order calendar download.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
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
    if (document.getElementById('fade-card')) return document.getElementById('fade-card');
    var anchor = document.getElementById('roundup-card') || document.getElementById('hours-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'fade-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">If you quit extras after the first win</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Snowball feels done after the smallest card dies. This prices the habit of dropping extras then.</p>' +
      '<p id="fade-result" class="text-sm text-slate-600 dark:text-slate-300 mb-4">Calculate a plan with two or more debts and an extra payment.</p>' +
      '<button type="button" id="kill-ics-btn" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700">Download kill-order calendar</button>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="dont-stop-after-first-debt.html">Why the first win is the dangerous month</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var el = document.getElementById('fade-result');
    if (!el) return;
    if (!r.applicable) {
      el.textContent = 'Need two or more open debts and an extra payment to price the fade.';
      return;
    }
    var stayDate = r.stay.debtFreeDate
      ? new Date(r.stay.debtFreeDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
      : 'sooner';
    var fadeDate = r.fade.debtFreeDate
      ? new Date(r.fade.debtFreeDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
      : 'later';
    var interestBit = r.extraInterest > 0 ? ' and cost ' + fmtMoney(r.extraInterest) + ' extra interest' : '';
    el.innerHTML = 'Keep extras after month ' + r.firstKillMonth + ' and you are free in ' + stayDate +
      '. Drop extras after that first win and you finish in ' + fadeDate +
      ' — ' + r.extraMonths + ' extra month' + (r.extraMonths === 1 ? '' : 's') + interestBit + '.';
  }

  function downloadKillIcs() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.killOrderIcs) return;
    var input = inputFromUi();
    if (!input) return;
    var plan = PayoffEngine.calculate(input);
    var ics = PayoffEngine.killOrderIcs(plan);
    var blob = new Blob([ics], { type: 'text/calendar' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debt-kill-order.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof showToast === 'function') showToast('Kill-order calendar downloaded');
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'kill_cal' });
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareFirstWinFade) return;
    var input = inputFromUi();
    if (!input) return;
    card.classList.remove('hidden');
    var r = PayoffEngine.compareFirstWinFade(input);
    window._lastFade = r;
    paint(r);
    if (r.applicable && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'first_win_fade' });
    }
    bindInner();
  }

  function bindInner() {
    var btn = document.getElementById('kill-ics-btn');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', downloadKillIcs);
    }
  }

  function bind() {
    ensureCard();
    bindInner();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._fadeBound) {
      calc._fadeBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._fadeBound) {
      extra._fadeBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
