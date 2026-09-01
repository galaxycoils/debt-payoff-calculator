/**
 * Annual raise slider — put next year's raise toward debt.
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
    if (document.getElementById('raise-card')) return document.getElementById('raise-card');
    var anchor = document.getElementById('stress-card') || document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'raise-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">What if I get a raise?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Put each year’s raise into extra payments. Drag to see the new debt-free date.</p>' +
      '<label class="block text-sm font-medium mb-1" for="raise-slider">Annual raise on extras <span id="raise-label" class="text-accent">+3%</span></label>' +
      '<input type="range" id="raise-slider" min="0" max="20" step="1" value="3" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '<div class="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span>10%</span><span>20%</span></div>' +
      '<p id="raise-result" class="text-sm mt-3 text-slate-600 dark:text-slate-300">Drag after you calculate.</p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var el = document.getElementById('raise-result');
    var lab = document.getElementById('raise-label');
    if (lab) lab.textContent = '+' + (r.raisePercent || 0) + '% / year';
    if (!el) return;
    if (!r.raisePercent) {
      el.textContent = 'Hold extras flat and finish ' + fmtDate(r.stay.debtFreeDate) + '.';
      return;
    }
    el.textContent = 'Finish ' + fmtDate(r.raised.debtFreeDate) +
      (r.monthsSaved > 0 ? ' — ' + r.monthsSaved + ' month' + (r.monthsSaved === 1 ? '' : 's') + ' sooner' : '') +
      (r.interestSaved > 0 ? ', save ' + fmtMoney(r.interestSaved) + ' interest.' : '.');
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareRaise) return;
    var input = inputFromUi();
    if (!input) return;
    var slider = document.getElementById('raise-slider');
    var pct = slider ? parseFloat(slider.value) || 0 : 3;
    var r = PayoffEngine.compareRaise(input, pct);
    window._lastRaise = r;
    paint(r);
    if (pct > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'raise_plan' });
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (!inputFromUi()) return;
    card.classList.remove('hidden');
    run();
  }

  function bind() {
    ensureCard();
    var slider = document.getElementById('raise-slider');
    if (slider && !slider._bound) {
      slider._bound = true;
      slider.addEventListener('input', function () { run(); });
    }
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._raiseBound) {
      calc._raiseBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._raiseBound) {
      extra._raiseBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
