/**
 * Hybrid strategy card — first win (snowball) then avalanche.
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
    return { debts: debts, extra: extraFromUi(), snowflakes: snowflakesFromUi() };
  }

  function ensureCard() {
    var results = document.getElementById('results');
    if (!results) return;
    if (document.getElementById('hybrid-card')) return;
    var anchor = document.getElementById('winner-banner') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'hybrid-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Motivation then math</p>' +
      '<h2 class="text-lg font-semibold text-accent mb-1">Hybrid: first win, then avalanche</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Kill the smallest balance for the early win. After that month, extra goes to the highest APR left.</p>' +
      '<div class="grid grid-cols-3 gap-3 mb-3">' +
      '<div><div id="hybrid-months" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">hybrid months</div></div>' +
      '<div><div id="hybrid-vs-snow" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">vs snowball $</div></div>' +
      '<div><div id="hybrid-vs-aval" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">vs avalanche $</div></div>' +
      '</div>' +
      '<p id="hybrid-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="hybrid-snowball-avalanche.html">Why people switch after the first win</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareHybrid) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('hybrid-card');
    if (!input || input.debts.length < 2 || !card) {
      if (card) card.classList.add('hidden');
      return;
    }
    var c = PayoffEngine.compareHybrid(input);
    card.classList.remove('hidden');
    var mEl = document.getElementById('hybrid-months');
    var vsS = document.getElementById('hybrid-vs-snow');
    var vsA = document.getElementById('hybrid-vs-aval');
    var copy = document.getElementById('hybrid-copy');
    if (mEl) mEl.textContent = String(c.hybrid.months);
    if (vsS) vsS.textContent = fmtMoney(c.vsSnowballInterest);
    if (vsA) vsA.textContent = fmtMoney(c.vsAvalancheInterest);
    if (copy) {
      var first = c.hybrid.firstKill || 'the smallest debt';
      copy.textContent = 'First win: ' + first +
        (c.hybrid.switchMonth ? ' in month ' + c.hybrid.switchMonth + '. ' : '. ') +
        (c.closestToAvalanche
          ? 'After the switch, hybrid interest sits close to pure avalanche — you keep most of the math without waiting on the first win.'
          : 'Hybrid saves ' + fmtMoney(c.vsSnowballInterest) + ' vs staying snowball the whole way.');
    }
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'hybrid_switch' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._hybridWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._hybridWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
