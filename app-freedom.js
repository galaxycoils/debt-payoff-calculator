/**
 * First year after debt-free — cash pile card.
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
    if (document.getElementById('freedom-card')) return;
    var anchor = document.getElementById('delay-card') || document.getElementById('clock-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'freedom-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">First year after debt-free</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Keep sending the same money to yourself. That is the pile sitting in a savings account twelve months later.</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      '<div><div id="freedom-monthly" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">freed each month</div></div>' +
      '<div><div id="freedom-year1" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">year-one pile</div></div>' +
      '<div><div id="freedom-year5" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">five-year pile</div></div>' +
      '</div>' +
      '<p id="freedom-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="life-after-debt-free.html">What to do with the payment that used to leave</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.freedomYear) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('freedom-card');
    if (!input || !card) return;
    var fy = PayoffEngine.freedomYear(input);
    if (!(fy.monthlyFreed > 0)) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    var mEl = document.getElementById('freedom-monthly');
    var y1 = document.getElementById('freedom-year1');
    var y5 = document.getElementById('freedom-year5');
    var copy = document.getElementById('freedom-copy');
    if (mEl) mEl.textContent = fmtMoney(fy.monthlyFreed);
    if (y1) y1.textContent = fmtMoney(fy.year1);
    if (y5) y5.textContent = fmtMoney(fy.year5);
    if (copy) {
      copy.textContent = 'When the last balance dies, ' + fmtMoney(fy.monthlyMinimums) +
        ' in old minimums' + (fy.extra ? ' plus ' + fmtMoney(fy.extra) + ' extra' : '') +
        ' can stay in your account. That is ' + fmtMoney(fy.year1) +
        ' in year one if you keep the habit.';
    }
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'freedom_year' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._freedomWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._freedomWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
