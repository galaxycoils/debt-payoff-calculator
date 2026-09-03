/**
 * Overtime vs side-hustle hour-value card.
 * Shows which extra hour of work buys more months / interest off the plan.
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
    if (document.getElementById('hours-card')) return document.getElementById('hours-card');
    var anchor = document.getElementById('raise-card') || document.getElementById('irregular-card') || document.getElementById('stress-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'hours-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Overtime vs side hustle</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Use after-tax hourly rates. The winner is the path that saves the most interest per hour worked.</p>' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">' +
        '<label class="text-xs font-medium">OT $/hr<input id="ot-rate" type="number" min="0" step="1" value="25" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<label class="text-xs font-medium">OT hrs / mo<input id="ot-hours" type="number" min="0" step="1" value="8" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<label class="text-xs font-medium">Hustle $/hr<input id="hustle-rate" type="number" min="0" step="1" value="18" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
        '<label class="text-xs font-medium">Hustle hrs / mo<input id="hustle-hours" type="number" min="0" step="1" value="12" class="mt-1 w-full rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm" /></label>' +
      '</div>' +
      '<p id="hours-result" class="text-sm text-slate-600 dark:text-slate-300">Calculate a plan, then drag the hours.</p>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="overtime-vs-side-hustle-debt.html">How hour-value works</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(r) {
    var el = document.getElementById('hours-result');
    if (!el) return;
    var ot = r.overtime;
    var hu = r.hustle;
    var winnerLabel = r.winner === 'overtime' ? 'Overtime wins per hour'
      : r.winner === 'hustle' ? 'Side hustle wins per hour'
      : r.winner === 'tie' ? 'Same value per hour'
      : 'Add hours to compare';
    el.innerHTML =
      '<span class="font-semibold text-accent">' + winnerLabel + '.</span> ' +
      'OT ' + fmtMoney(ot.extraMonthly) + '/mo finishes ' + fmtDate(ot.plan.debtFreeDate) +
      (ot.monthsSaved > 0 ? ' (' + ot.monthsSaved + ' mo sooner, ' + fmtMoney(ot.interestSavedPerHour) + '/hr interest saved)' : '') +
      '. Hustle ' + fmtMoney(hu.extraMonthly) + '/mo finishes ' + fmtDate(hu.plan.debtFreeDate) +
      (hu.monthsSaved > 0 ? ' (' + hu.monthsSaved + ' mo sooner, ' + fmtMoney(hu.interestSavedPerHour) + '/hr interest saved)' : '') +
      '.';
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareHourValue) return;
    var input = inputFromUi();
    if (!input) return;
    var r = PayoffEngine.compareHourValue(input, {
      overtimeRate: num('ot-rate', 25),
      overtimeHours: num('ot-hours', 8),
      hustleRate: num('hustle-rate', 18),
      hustleHours: num('hustle-hours', 12)
    });
    window._lastHourValue = r;
    paint(r);
    if ((r.overtime.extraMonthly > 0 || r.hustle.extraMonthly > 0) && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'hour_value' });
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
    ['ot-rate', 'ot-hours', 'hustle-rate', 'hustle-hours'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._hoursBound) {
        el._hoursBound = true;
        el.addEventListener('input', function () { run(); });
      }
    });
  }

  function bind() {
    ensureCard();
    bindInputs();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._hoursBound) {
      calc._hoursBound = true;
      calc.addEventListener('click', function () { setTimeout(function () { refresh(); bindInputs(); }, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._hoursBound) {
      extra._hoursBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
