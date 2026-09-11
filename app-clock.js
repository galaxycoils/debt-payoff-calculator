/**
 * Daily interest burn + debt-free age card.
 */
(function () {
  'use strict';

  function fmtMoney(n, digits) {
    var d = digits == null ? 2 : digits;
    var v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: d,
      maximumFractionDigits: d
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
    if (document.getElementById('clock-card')) return;
    var anchor = document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'clock-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Interest burn clock</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">What waiting costs today, and how old you will be when it stops.</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">' +
      '<div><div id="clock-day" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">per day now</div></div>' +
      '<div><div id="clock-hour" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">per hour</div></div>' +
      '<div><div id="clock-days-left" class="text-2xl font-extrabold text-accent">0</div><div class="text-[11px] text-slate-500">days on the plan</div></div>' +
      '<div><div id="clock-age" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">debt-free age</div></div>' +
      '</div>' +
      '<label class="text-xs font-medium">Your age now' +
      '<input id="clock-age-input" type="number" min="16" max="90" step="1" value="32" class="mt-1 w-full max-w-[8rem] rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
      '<p id="clock-copy" class="text-sm text-slate-600 dark:text-slate-300 mt-3"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="how-much-interest-per-day.html">Why daily interest feels expensive</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.dailyInterestBurn) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('clock-card');
    if (!input || !card) return;
    var burn = PayoffEngine.dailyInterestBurn(input.debts);
    var plan = PayoffEngine.calculate(input);
    var ageEl = document.getElementById('clock-age-input');
    var age = ageEl ? parseFloat(ageEl.value) : 32;
    var clock = PayoffEngine.freedomClock({ months: plan.months, ageYears: age });
    card.classList.remove('hidden');
    var dayEl = document.getElementById('clock-day');
    var hourEl = document.getElementById('clock-hour');
    var leftEl = document.getElementById('clock-days-left');
    var ageOut = document.getElementById('clock-age');
    var copy = document.getElementById('clock-copy');
    if (dayEl) dayEl.textContent = fmtMoney(burn.perDay, 2);
    if (hourEl) hourEl.textContent = fmtMoney(burn.perHour, 3);
    if (leftEl) leftEl.textContent = String(clock.daysRemaining);
    if (ageOut) ageOut.textContent = clock.debtFreeAge == null ? '—' : String(clock.debtFreeAge);
    if (copy) {
      copy.textContent = 'Right now interest is charging about ' +
        fmtMoney(burn.perDay, 2) + '/day. On this extra-payment plan that meter stops in ' +
        clock.daysRemaining + ' days' +
        (clock.debtFreeAge != null ? ' — age ' + clock.debtFreeAge + '.' : '.');
    }
    if (typeof window.dispatchGame === 'function' && burn.perDay > 0) {
      window.dispatchGame('unlock', { id: 'burn_clock' });
    }
  }

  function bind() {
    ensureCard();
    var el = document.getElementById('clock-age-input');
    if (el && !el._bound) {
      el._bound = true;
      el.addEventListener('input', run);
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._clockWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { bind(); run(); } catch (e) {}
      return out;
    };
    window.runCalc._clockWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
  } else {
    setTimeout(bind, 0);
  }
})();
