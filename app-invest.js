/**
 * Pay extra vs invest extra + milestone map cards.
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

  function ensureCards() {
    var results = document.getElementById('results');
    if (!results) return;
    var anchor = document.getElementById('progress-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    if (!document.getElementById('milestone-card')) {
      var mile = document.createElement('div');
      mile.id = 'milestone-card';
      mile.className = 'card hidden';
      mile.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Milestone map</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Dates you can put on the fridge.</p>' +
        '<div id="milestone-list" class="grid sm:grid-cols-2 gap-2"></div>';
      anchor.parentNode.insertBefore(mile, anchor.nextSibling);
    }
    if (!document.getElementById('invest-card')) {
      var card = document.createElement('div');
      card.id = 'invest-card';
      card.className = 'card hidden';
      card.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Pay extra vs invest extra</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Guaranteed APR vs an assumed market return. Drag extra, then change the return.</p>' +
        '<label class="text-xs font-medium">Expected annual return %' +
        '<input id="invest-return" type="number" min="0" step="0.5" value="7" class="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<p id="invest-result" class="text-sm text-slate-600 dark:text-slate-300 mt-3">Calculate a plan first.</p>' +
        '<p class="mt-2 text-xs"><a class="underline text-accent" href="pay-debt-vs-invest.html">When investing extra loses</a></p>';
      var mileCard = document.getElementById('milestone-card');
      mileCard.parentNode.insertBefore(card, mileCard.nextSibling);
    }
  }

  function paintMilestones(list) {
    var wrap = document.getElementById('milestone-list');
    var card = document.getElementById('milestone-card');
    if (!wrap || !card) return;
    if (!list.length) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    wrap.innerHTML = list.map(function (m) {
      var when = m.date instanceof Date && !isNaN(m.date.getTime())
        ? m.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : 'Month ' + m.month;
      return '<div class="rounded-xl border border-[var(--line)] px-3 py-2">' +
        '<div class="text-xs text-slate-500 dark:text-slate-400">' + m.label + '</div>' +
        '<div class="font-semibold text-accent">' + when + '</div>' +
        '<div class="text-[11px] text-slate-400">month ' + m.month + '</div></div>';
    }).join('');
  }

  function paintInvest(r) {
    var el = document.getElementById('invest-result');
    if (!el) return;
    if (r.extra <= 0) {
      el.textContent = 'Add extra payment to compare against investing that cash.';
      return;
    }
    var winner = r.debtWins
      ? 'Paying the debt wins by ' + fmtMoney(r.edge) + '.'
      : 'Investing the extra wins by ' + fmtMoney(-r.edge) + ' at this assumed return.';
    el.innerHTML =
      '<span class="font-semibold text-accent">' + winner + '</span> ' +
      'Weighted APR ' + r.weightedApr + '% vs ' + r.expectedReturn + '% assumed. ' +
      'Interest avoided ' + fmtMoney(r.interestSaved) +
      '. If you invested ' + fmtMoney(r.extra) + '/mo instead for ' + r.plan.months +
      ' months you might have ' + fmtMoney(r.fvIfInvestExtra) +
      '. Markets are not guaranteed. Your APR is.';
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareInvestVsDebt) return;
    var input = inputFromUi();
    ensureCards();
    var card = document.getElementById('invest-card');
    if (!input || !card) return;
    card.classList.remove('hidden');
    var retEl = document.getElementById('invest-return');
    var ret = retEl ? parseFloat(retEl.value) || 0 : 7;
    var r = PayoffEngine.compareInvestVsDebt(input, ret);
    paintInvest(r);
    var plan = PayoffEngine.calculate(input);
    paintMilestones(PayoffEngine.milestoneMap(plan));
    if (typeof window.dispatchGame === 'function' && r.extra > 0) {
      window.dispatchGame('unlock', { id: 'invest_vs_debt' });
    }
  }

  function bind() {
    ensureCards();
    var el = document.getElementById('invest-return');
    if (el && !el._bound) {
      el._bound = true;
      el.addEventListener('input', run);
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._investWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { bind(); run(); } catch (e) {}
      return out;
    };
    window.runCalc._investWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
  } else {
    setTimeout(bind, 0);
  }
})();
