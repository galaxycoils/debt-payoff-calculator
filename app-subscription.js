/**
 * Subscription cut card — redirect a monthly bill into extras.
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

  function ensureCard() {
    if (document.getElementById('subscription-card')) return document.getElementById('subscription-card');
    var anchor = document.getElementById('windfall-card') || document.getElementById('hours-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'subscription-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Cancel one subscription</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Send that monthly bill to debt instead. Pick a preset or type your own.</p>' +
      '<div class="flex flex-wrap gap-2 mb-3" id="sub-presets">' +
        '<button type="button" class="sub-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="8">$8 streaming</button>' +
        '<button type="button" class="sub-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="12">$12 music</button>' +
        '<button type="button" class="sub-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="16">$16 delivery</button>' +
        '<button type="button" class="sub-preset px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-amount="25">$25 gym</button>' +
      '</div>' +
      '<label class="text-xs font-medium">Monthly amount<input id="sub-cut-amount" type="number" min="0" step="1" value="12" class="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
      '<p id="subscription-result" class="text-sm text-slate-600 dark:text-slate-300 mt-3">Calculate a plan, then pick a subscription.</p>' +
      '<button type="button" id="apply-sub-cut" class="mt-3 hidden px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent">Add this to extra</button>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="cancel-a-subscription-pay-debt.html">Why a small cut compounds</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var el = document.getElementById('subscription-result');
    var apply = document.getElementById('apply-sub-cut');
    if (!el) return;
    if (r.monthlyCut <= 0) {
      el.textContent = 'Enter a monthly amount to see months and interest saved.';
      if (apply) apply.classList.add('hidden');
      return;
    }
    el.innerHTML =
      '<span class="font-semibold text-accent">Redirect ' + fmtMoney(r.monthlyCut) + '/mo.</span> ' +
      'Debt-free ' + fmtDate(r.redirected.debtFreeDate) +
      (r.monthsSaved > 0 ? ' — ' + r.monthsSaved + ' month' + (r.monthsSaved === 1 ? '' : 's') + ' sooner' : '') +
      (r.interestSaved > 0 ? ', ' + fmtMoney(r.interestSaved) + ' interest saved' : '') +
      '. Extra becomes ' + fmtMoney(r.extraAfter) + '/mo.';
    if (apply) apply.classList.remove('hidden');
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareSubscriptionCut) return;
    var input = inputFromUi();
    var card = ensureCard();
    if (!input || !card) return;
    card.classList.remove('hidden');
    var amtEl = document.getElementById('sub-cut-amount');
    var cut = amtEl ? parseFloat(amtEl.value) || 0 : 12;
    var r = PayoffEngine.compareSubscriptionCut(input, cut);
    paint(r);
    if (typeof window.dispatchGame === 'function' && cut > 0) {
      window.dispatchGame('unlock', { id: 'cut_sub' });
    }
  }

  function bind() {
    ensureCard();
    var amt = document.getElementById('sub-cut-amount');
    if (amt && !amt._bound) {
      amt._bound = true;
      amt.addEventListener('input', run);
    }
    document.querySelectorAll('.sub-preset').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', function () {
        var n = parseFloat(btn.getAttribute('data-amount')) || 0;
        if (amt) amt.value = String(n);
        run();
      });
    });
    var apply = document.getElementById('apply-sub-cut');
    if (apply && !apply._bound) {
      apply._bound = true;
      apply.addEventListener('click', function () {
        var slider = document.getElementById('extra-slider');
        var display = document.getElementById('extra-display');
        var cutEl = document.getElementById('sub-cut-amount');
        var cut = cutEl ? parseFloat(cutEl.value) || 0 : 0;
        if (!slider || cut <= 0) return;
        var next = (parseFloat(slider.value) || 0) + cut;
        if (parseFloat(slider.max) < next) slider.max = String(Math.ceil(next / 100) * 100);
        slider.value = String(next);
        if (display) display.textContent = '$' + next;
        if (typeof runCalc === 'function') runCalc();
        else run();
      });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._subWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { bind(); run(); } catch (e) {}
      return out;
    };
    window.runCalc._subWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
  } else {
    setTimeout(bind, 0);
  }
})();
