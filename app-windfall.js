/**
 * Windfall allocator — lump the bonus this month vs drip it.
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
  function num(id, fallback) {
    var el = document.getElementById(id);
    var n = el ? parseFloat(el.value) : fallback;
    return isNaN(n) ? fallback : n;
  }

  function ensureCard() {
    if (document.getElementById('windfall-card')) return document.getElementById('windfall-card');
    var anchor = document.getElementById('hours-card') || document.getElementById('raise-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'windfall-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Got a windfall?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Tax refund, bonus, or sale. Compare dumping it this month vs dripping it.</p>' +
      '<div class="grid grid-cols-2 gap-3 mb-3">' +
        '<label class="text-xs font-medium">Amount<input id="windfall-amount" type="number" min="0" step="50" value="500" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<label class="text-xs font-medium">Drip over months<input id="windfall-drip" type="number" min="2" max="12" step="1" value="3" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
      '</div>' +
      '<p id="windfall-result" class="text-sm text-slate-600 dark:text-slate-300">Calculate a plan, then set the bonus.</p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="use-a-windfall-on-debt.html">Why lumping usually wins</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var el = document.getElementById('windfall-result');
    if (!el) return;
    if (r.amount <= 0) {
      el.textContent = 'Enter a bonus amount to see months and interest saved.';
      return;
    }
    var label = r.winner === 'now' ? 'Send it this month'
      : r.winner === 'drip' ? 'Dripping wins this scenario'
      : 'No change yet';
    el.innerHTML =
      '<span class="font-semibold text-accent">' + label + '.</span> ' +
      'Lump ' + fmtMoney(r.amount) + ' now finishes ' + fmtDate(r.now.plan.debtFreeDate) +
      (r.now.monthsSaved > 0 ? ' (' + r.now.monthsSaved + ' mo sooner, ' + fmtMoney(r.now.interestSaved) + ' interest saved)' : '') +
      '. Drip over ' + r.dripMonths + ' months finishes ' + fmtDate(r.drip.plan.debtFreeDate) +
      (r.drip.monthsSaved > 0 ? ' (' + r.drip.monthsSaved + ' mo / ' + fmtMoney(r.drip.interestSaved) + ')' : '') +
      '.';
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareWindfall) return;
    var input = inputFromUi();
    if (!input) return;
    var r = PayoffEngine.compareWindfall(input, {
      amount: num('windfall-amount', 500),
      dripMonths: num('windfall-drip', 3)
    });
    window._lastWindfall = r;
    paint(r);
    if (r.amount > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'windfall' });
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (!inputFromUi()) return;
    card.classList.remove('hidden');
    run();
  }

  function bindInputs() {
    ['windfall-amount', 'windfall-drip'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._windfallBound) {
        el._windfallBound = true;
        el.addEventListener('input', function () { run(); });
      }
    });
  }

  function bind() {
    ensureCard();
    bindInputs();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._windfallBound) {
      calc._windfallBound = true;
      calc.addEventListener('click', function () { setTimeout(function () { refresh(); bindInputs(); }, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._windfallBound) {
      extra._windfallBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
