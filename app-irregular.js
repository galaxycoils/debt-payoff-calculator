/**
 * Irregular / gig paycheck extras — lean months vs flush months.
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
    if (document.getElementById('irregular-card')) return document.getElementById('irregular-card');
    var anchor = document.getElementById('raise-card') || document.getElementById('stress-card') || document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'irregular-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Gig / irregular paychecks</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Lean months keep a floor extra. Flush months (commission, overtime, two paydays) dump more. Still 100% in the browser.</p>' +
      '<label class="block text-sm font-medium mb-1" for="lean-slider">Lean-month extra <span id="lean-label" class="text-accent">$50</span></label>' +
      '<input type="range" id="lean-slider" min="0" max="500" step="10" value="50" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '<label class="block text-sm font-medium mt-3 mb-1" for="flush-slider">Flush-month extra <span id="flush-label" class="text-accent">$200</span></label>' +
      '<input type="range" id="flush-slider" min="0" max="1000" step="10" value="200" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '<label class="block text-sm font-medium mt-3 mb-1" for="flush-every">Flush every</label>' +
      '<select id="flush-every" class="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] text-sm">' +
        '<option value="2" selected>2nd month</option>' +
        '<option value="3">3rd month</option>' +
        '<option value="4">4th month</option>' +
        '<option value="6">6th month</option>' +
      '</select>' +
      '<p id="irregular-result" class="text-sm mt-3 text-slate-600 dark:text-slate-300">Drag after you calculate.</p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var leanLab = document.getElementById('lean-label');
    var flushLab = document.getElementById('flush-label');
    var el = document.getElementById('irregular-result');
    if (leanLab) leanLab.textContent = fmtMoney(r.leanExtra);
    if (flushLab) flushLab.textContent = fmtMoney(r.flushExtra);
    if (!el) return;
    if (r.flushExtra <= r.leanExtra) {
      el.textContent = 'Flush months need to be larger than lean months to move the date. Floor plan finishes ' + fmtDate(r.steady.debtFreeDate) + '.';
      return;
    }
    var saved = r.monthsSaved;
    var verb = saved > 0 ? (' — ' + saved + ' month' + (saved === 1 ? '' : 's') + ' sooner than lean-only') : ' (same months as lean-only)';
    var int = r.interestSaved > 0 ? ', save ' + fmtMoney(r.interestSaved) + ' interest' : '';
    el.textContent = 'With flush every ' + r.flushEvery + ' months you finish ' + fmtDate(r.irregular.debtFreeDate) + verb + int + '.';
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareIrregularIncome) return;
    var input = inputFromUi();
    if (!input) return;
    var leanEl = document.getElementById('lean-slider');
    var flushEl = document.getElementById('flush-slider');
    var everyEl = document.getElementById('flush-every');
    var lean = leanEl ? parseFloat(leanEl.value) || 0 : 50;
    var flush = flushEl ? parseFloat(flushEl.value) || 0 : 200;
    var every = everyEl ? parseInt(everyEl.value, 10) || 2 : 2;
    var r = PayoffEngine.compareIrregularIncome(input, { leanExtra: lean, flushExtra: flush, flushEvery: every });
    window._lastIrregular = r;
    paint(r);
    if (flush > lean && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'gig_plan' });
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (!inputFromUi()) return;
    card.classList.remove('hidden');
    var extra = extraFromUi();
    var leanEl = document.getElementById('lean-slider');
    if (leanEl && !leanEl._touched) leanEl.value = String(Math.min(500, extra));
    run();
  }

  function bind() {
    ensureCard();
    ['lean-slider', 'flush-slider', 'flush-every'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._bound) {
        el._bound = true;
        el.addEventListener('input', function () {
          if (id !== 'flush-every') el._touched = true;
          run();
        });
        el.addEventListener('change', function () { run(); });
      }
    });
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._irregBound) {
      calc._irregBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._irregBound) {
      extra._irregBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
