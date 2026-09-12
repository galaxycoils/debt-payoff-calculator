/**
 * Cost of waiting to start extras — FOMO card after results.
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
    if (document.getElementById('delay-card')) return;
    var anchor = document.getElementById('clock-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'delay-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Cost of waiting</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Minimums only for a few months, then the same extra. The tax is interest you cannot get back.</p>' +
      '<div class="flex flex-wrap gap-2 mb-4" id="delay-pills">' +
      [1, 2, 3, 6].map(function (n) {
        return '<button type="button" class="delay-pill px-3 py-2 min-h-[44px] text-xs rounded-full bg-slate-100 dark:bg-slate-700" data-delay="' + n + '">Wait ' + n + ' mo</button>';
      }).join('') +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      '<div><div id="delay-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">extra interest</div></div>' +
      '<div><div id="delay-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-[11px] text-slate-500">extra months</div></div>' +
      '<div><div id="delay-coffees" class="text-2xl font-extrabold text-accent">0</div><div class="text-[11px] text-slate-500">coffees that interest buys</div></div>' +
      '</div>' +
      '<p id="delay-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="start-now-vs-wait.html">Why starting this paycheck matters</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  var chosen = 3;

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareDelay) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('delay-card');
    if (!input || !card) return;
    if (!(input.extra > 0)) {
      card.classList.add('hidden');
      return;
    }
    var cmp = PayoffEngine.compareDelay(input, chosen);
    card.classList.remove('hidden');
    var iEl = document.getElementById('delay-interest');
    var mEl = document.getElementById('delay-months');
    var cEl = document.getElementById('delay-coffees');
    var copy = document.getElementById('delay-copy');
    if (iEl) iEl.textContent = fmtMoney(cmp.extraInterest);
    if (mEl) mEl.textContent = String(cmp.extraMonths);
    if (cEl) cEl.textContent = String(cmp.basket.coffees);
    if (copy) {
      copy.textContent = 'Waiting ' + chosen + ' month' + (chosen === 1 ? '' : 's') +
        ' to start extras costs ' + fmtMoney(cmp.extraInterest) +
        ' in interest and ' + cmp.extraMonths + ' extra month' +
        (cmp.extraMonths === 1 ? '' : 's') +
        (cmp.basket.coffees ? ' — about ' + cmp.basket.coffees + ' coffees you never drink.' : '.');
    }
    document.querySelectorAll('.delay-pill').forEach(function (btn) {
      var on = parseInt(btn.getAttribute('data-delay'), 10) === chosen;
      btn.classList.toggle('btn-accent', on);
      btn.classList.toggle('text-white', on);
    });
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'start_now' });
    }
  }

  function bind() {
    ensureCard();
    var wrap = document.getElementById('delay-pills');
    if (wrap && !wrap._bound) {
      wrap._bound = true;
      wrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.delay-pill');
        if (!btn) return;
        chosen = parseInt(btn.getAttribute('data-delay'), 10) || 3;
        run();
      });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._delayWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { bind(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._delayWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
  } else {
    setTimeout(bind, 0);
  }
})();
