/**
 * Emergency-fund vs extra + daily leak cards.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
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

  function ensureCards() {
    var anchor = document.getElementById('subscription-card') || document.getElementById('windfall-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    if (!document.getElementById('cushion-card')) {
      var card = document.createElement('div');
      card.id = 'cushion-card';
      card.className = 'card hidden';
      card.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Starter emergency fund vs extra</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Park part of extra in savings. See months delayed vs cash on hand.</p>' +
        '<div class="grid sm:grid-cols-2 gap-3 mb-3">' +
          '<label class="text-xs font-medium">Monthly to savings<input id="cushion-amount" type="number" min="0" step="10" value="50" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
          '<label class="text-xs font-medium">Savings APY %<input id="cushion-apy" type="number" min="0" step="0.1" value="4" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '</div>' +
        '<p id="cushion-result" class="text-sm text-slate-600 dark:text-slate-300">Calculate a plan, then set a cushion.</p>' +
        '<p class="mt-2 text-xs"><a class="underline text-accent" href="emergency-fund-vs-debt.html">How to split extra and cash</a></p>';
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
    }
    if (!document.getElementById('leak-card')) {
      var leak = document.createElement('div');
      leak.id = 'leak-card';
      leak.className = 'card hidden';
      leak.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Daily leak → extra</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">A $5 coffee habit is $152/month. Send it to principal instead.</p>' +
        '<div class="flex flex-wrap gap-2 mb-3" id="leak-presets">' +
          '<button type="button" class="leak-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="3">$3 snack</button>' +
          '<button type="button" class="leak-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="5">$5 coffee</button>' +
          '<button type="button" class="leak-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="8">$8 delivery</button>' +
          '<button type="button" class="leak-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="12">$12 lunch</button>' +
        '</div>' +
        '<label class="text-xs font-medium">Daily spend<input id="leak-daily" type="number" min="0" step="0.5" value="5" class="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<p id="leak-result" class="text-sm text-slate-600 dark:text-slate-300 mt-3">Calculate a plan, then pick a daily leak.</p>' +
        '<button type="button" id="apply-leak" class="mt-3 hidden px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent">Add this to extra</button>';
      var cushion = document.getElementById('cushion-card');
      cushion.parentNode.insertBefore(leak, cushion.nextSibling);
    }
  }

  function paintCushion(r) {
    var el = document.getElementById('cushion-result');
    if (!el) return;
    if (r.monthlyCushion <= 0) {
      el.textContent = 'Set a monthly cushion smaller than or equal to extra.';
      return;
    }
    el.innerHTML =
      '<span class="font-semibold text-accent">' + fmtMoney(r.monthlyCushion) + '/mo parked.</span> ' +
      'Debt-free slips to ' + fmtDate(r.cushion.debtFreeDate) +
      (r.monthsDelayed ? ' (' + r.monthsDelayed + ' month' + (r.monthsDelayed === 1 ? '' : 's') + ' later)' : '') +
      '. Cash on hand ' + fmtMoney(r.savingsBalance) +
      (r.savingsInterest ? ' including ' + fmtMoney(r.savingsInterest) + ' HYSA interest' : '') +
      '. Extra interest paid ' + fmtMoney(r.extraInterest) +
      (r.debtWins ? ' — high-APR debt still costs more than the savings yield.' : ' — the cash cushion is cheap at this APR.');
  }

  function paintLeak(r) {
    var el = document.getElementById('leak-result');
    var apply = document.getElementById('apply-leak');
    if (!el) return;
    if (r.dailySpend <= 0) {
      el.textContent = 'Enter a daily amount.';
      if (apply) apply.classList.add('hidden');
      return;
    }
    el.innerHTML =
      '<span class="font-semibold text-accent">' + fmtMoney(r.dailySpend) + '/day → ' + fmtMoney(r.monthlyCut) + '/mo.</span> ' +
      'Debt-free ' + fmtDate(r.redirected.debtFreeDate) +
      (r.monthsSaved > 0 ? ' — ' + r.monthsSaved + ' month' + (r.monthsSaved === 1 ? '' : 's') + ' sooner' : '') +
      (r.interestSaved > 0 ? ', ' + fmtMoney(r.interestSaved) + ' interest saved' : '') +
      '. Extra becomes ' + fmtMoney(r.extraAfter) + '/mo.';
    if (apply) apply.classList.remove('hidden');
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareEmergencyFund) return;
    var input = inputFromUi();
    ensureCards();
    var card = document.getElementById('cushion-card');
    var leak = document.getElementById('leak-card');
    if (!input || !card) return;
    card.classList.remove('hidden');
    if (leak) leak.classList.remove('hidden');
    var amt = document.getElementById('cushion-amount');
    var apy = document.getElementById('cushion-apy');
    var cr = PayoffEngine.compareEmergencyFund(input, {
      monthlyCushion: amt ? parseFloat(amt.value) || 0 : 0,
      apy: apy ? parseFloat(apy.value) || 0 : 0
    });
    paintCushion(cr);
    if (typeof window.dispatchGame === 'function' && cr.monthlyCushion > 0) {
      window.dispatchGame('unlock', { id: 'cushion' });
    }
    var dailyEl = document.getElementById('leak-daily');
    var lr = PayoffEngine.compareDailyLeak(input, dailyEl ? parseFloat(dailyEl.value) || 0 : 0);
    paintLeak(lr);
    if (typeof window.dispatchGame === 'function' && lr.dailySpend > 0) {
      window.dispatchGame('unlock', { id: 'daily_leak' });
    }
  }

  function bind() {
    ensureCards();
    ['cushion-amount', 'cushion-apy', 'leak-daily'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._bound) {
        el._bound = true;
        el.addEventListener('input', run);
      }
    });
    document.querySelectorAll('.leak-preset').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', function () {
        var daily = document.getElementById('leak-daily');
        if (daily) daily.value = btn.getAttribute('data-amount') || '0';
        run();
      });
    });
    var apply = document.getElementById('apply-leak');
    if (apply && !apply._bound) {
      apply._bound = true;
      apply.addEventListener('click', function () {
        var slider = document.getElementById('extra-slider');
        var display = document.getElementById('extra-display');
        var dailyEl = document.getElementById('leak-daily');
        var monthly = typeof PayoffEngine !== 'undefined' && PayoffEngine.dailyToMonthly
          ? PayoffEngine.dailyToMonthly(dailyEl ? parseFloat(dailyEl.value) || 0 : 0)
          : 0;
        if (!slider || monthly <= 0) return;
        var next = (parseFloat(slider.value) || 0) + monthly;
        if (parseFloat(slider.max) < next) slider.max = String(Math.ceil(next / 100) * 100);
        slider.value = String(Math.round(next));
        if (display) display.textContent = '$' + Math.round(next);
        if (typeof runCalc === 'function') runCalc();
        else run();
      });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._cushionWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { bind(); run(); } catch (e) {}
      return out;
    };
    window.runCalc._cushionWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
  } else {
    setTimeout(bind, 0);
  }
})();
