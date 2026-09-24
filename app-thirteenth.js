/**
 * 13th-paycheck card + this-month bank-vs-you split.
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
    if (document.getElementById('thirteenth-card')) return document.getElementById('thirteenth-card');
    var anchor = document.getElementById('promo-card') || document.getElementById('cashflow-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'thirteenth-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">This month · 13th paycheck</p>' +
      '<h2 class="text-lg font-semibold text-accent mb-1">Who gets this payment?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">See how much of month one goes to the bank, then price one extra full payment each year.</p>' +
      '<div class="mb-4">' +
      '<div class="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 mb-1"><span>You (principal)</span><span>Bank (interest)</span></div>' +
      '<div class="h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex">' +
      '<div id="split-you-bar" class="bg-[#0d6e6e] h-full transition-all duration-700" style="width:50%"></div>' +
      '<div id="split-bank-bar" class="bg-[#c45c26] h-full transition-all duration-700" style="width:50%"></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 mt-2 text-sm">' +
      '<p id="split-you" class="font-semibold">—</p>' +
      '<p id="split-bank" class="font-semibold text-right">—</p>' +
      '</div></div>' +
      '<div class="grid grid-cols-2 gap-2 text-sm">' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">13th payment</p><p id="thirteenth-amt" class="font-semibold text-sm">—</p></div>' +
      '<div class="rounded-2xl bg-accent-soft/50 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">If you add it yearly</p><p id="thirteenth-save" class="font-semibold text-sm">—</p></div>' +
      '</div>' +
      '<p id="thirteenth-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<p class="text-xs mt-2"><a href="thirteenth-payment-debt.html" class="text-accent underline">How a 13th payment works</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(split, cmp) {
    var you = document.getElementById('split-you');
    var bank = document.getElementById('split-bank');
    var youBar = document.getElementById('split-you-bar');
    var bankBar = document.getElementById('split-bank-bar');
    var amt = document.getElementById('thirteenth-amt');
    var save = document.getElementById('thirteenth-save');
    var verdict = document.getElementById('thirteenth-verdict');
    if (!split) return;
    var youPct = split.payment > 0 ? Math.round((split.principalPaid / split.payment) * 100) : 100;
    var bankPct = 100 - youPct;
    if (you) you.textContent = fmtMoney(split.principalPaid) + ' · ' + youPct + '%';
    if (bank) bank.textContent = fmtMoney(split.interest) + ' · ' + bankPct + '%';
    if (youBar) youBar.style.width = youPct + '%';
    if (bankBar) bankBar.style.width = bankPct + '%';
    if (amt) amt.textContent = fmtMoney(cmp.thirteenthAmount);
    if (save) {
      save.textContent = cmp.monthsSaved
        ? cmp.monthsSaved + ' mo · ' + fmtMoney(cmp.interestSaved) + ' interest'
        : 'Same calendar';
    }
    if (verdict) {
      if (cmp.monthsSaved > 0 || cmp.interestSaved > 0) {
        verdict.textContent = 'One extra full payment each year (a 13th paycheck) knocks ' +
          cmp.monthsSaved + ' month' + (cmp.monthsSaved === 1 ? '' : 's') +
          ' off and keeps about ' + fmtMoney(cmp.interestSaved) + ' from the bank.';
      } else {
        verdict.textContent = 'This stack is already short. A 13th payment still shows the month-one split so you can watch the bank share shrink as extras rise.';
      }
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareThirteenth) return;
    var input = inputFromUi();
    if (!input) return;
    var split = PayoffEngine.monthOneSplit(input);
    var cmp = PayoffEngine.compareThirteenth(input);
    window._lastThirteenth = { split: split, compare: cmp };
    card.classList.remove('hidden');
    paint(split, cmp);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'thirteenth_pay' });
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._thirteenthBound) {
      calc._thirteenthBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._thirteenthBound) {
      extra._thirteenthBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
