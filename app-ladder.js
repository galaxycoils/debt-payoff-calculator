/**
 * Extra ladder + partner chip-in card.
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
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
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
    if (document.getElementById('ladder-card')) return document.getElementById('ladder-card');
    var anchor = document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'ladder-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">What if I paid a little more?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Same debts, six extras. Tap a row to put that extra on the slider.</p>' +
      '<div class="overflow-x-auto"><table class="w-full text-sm" id="ladder-table">' +
      '<thead><tr class="text-left text-xs uppercase tracking-wide text-slate-400">' +
      '<th class="py-1 pr-3">Extra</th><th class="py-1 pr-3">Debt-free</th><th class="py-1 pr-3">Months</th><th class="py-1">Interest</th>' +
      '</tr></thead><tbody></tbody></table></div>' +
      '<div class="mt-5 pt-4 border-t border-[var(--line)]">' +
      '<label class="block text-sm font-medium mb-1" for="partner-slider">If a partner chips in <span id="partner-label" class="text-accent">+$0</span></label>' +
      '<input type="range" id="partner-slider" min="0" max="500" step="25" value="0" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '<div class="flex justify-between text-xs text-slate-400 mt-1"><span>$0</span><span>$250</span><span>$500</span></div>' +
      '<p id="partner-result" class="text-sm mt-3 text-slate-600 dark:text-slate-300">Drag after you calculate.</p>' +
      '<button type="button" id="apply-partner-extra" class="hidden mt-3 px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent">Add partner amount to extra</button>' +
      '</div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paintLadder(lad) {
    var tbody = document.querySelector('#ladder-table tbody');
    if (!tbody || !lad) return;
    tbody.innerHTML = '';
    lad.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.className = 'border-t border-[var(--line)] cursor-pointer hover:bg-accent-soft/60' + (row.isCurrent ? ' font-semibold' : '');
      tr.setAttribute('data-extra', String(row.extra));
      tr.innerHTML =
        '<td class="py-2 pr-3">' + fmtMoney(row.extra) + (row.isCurrent ? ' <span class="text-[10px] uppercase tracking-wide text-accent">now</span>' : '') + '</td>' +
        '<td class="py-2 pr-3">' + fmtDate(row.debtFreeDate) + '</td>' +
        '<td class="py-2 pr-3">' + row.months + (row.monthsSaved > 0 ? ' <span class="text-xs text-accent">−' + row.monthsSaved + '</span>' : '') + '</td>' +
        '<td class="py-2">' + fmtMoney(row.totalInterest) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function paintPartner(c) {
    var lab = document.getElementById('partner-label');
    var el = document.getElementById('partner-result');
    var apply = document.getElementById('apply-partner-extra');
    if (lab) lab.textContent = '+' + fmtMoney(c.partner);
    if (!el) return;
    if (!c.partner) {
      el.textContent = 'Finish solo on ' + fmtDate(c.solo.debtFreeDate) + '.';
      if (apply) apply.classList.add('hidden');
      return;
    }
    el.textContent = 'Together: ' + fmtDate(c.together.debtFreeDate) +
      (c.monthsSaved > 0 ? ' — ' + c.monthsSaved + ' month' + (c.monthsSaved === 1 ? '' : 's') + ' sooner' : '') +
      (c.interestSaved > 0 ? ', save ' + fmtMoney(c.interestSaved) + ' interest.' : '.');
    if (apply) apply.classList.remove('hidden');
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.extraLadder) return;
    var input = inputFromUi();
    if (!input) return;
    var extra = input.extra;
    var steps = [0, extra, extra + 25, extra + 50, extra + 100, extra + 200, extra + 500];
    var lad = PayoffEngine.extraLadder(input, steps);
    window._lastLadder = lad;
    paintLadder(lad);
    var slider = document.getElementById('partner-slider');
    var partner = slider ? parseFloat(slider.value) || 0 : 0;
    var c = PayoffEngine.comparePartnerExtra(input, partner);
    window._lastPartner = c;
    paintPartner(c);
    if ((partner > 0 || lad.rows.length > 2) && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'extra_ladder' });
    }
  }

  function applyExtra(amount) {
    var slider = document.getElementById('extra-slider');
    var display = document.getElementById('extra-display');
    if (!slider) return;
    var max = parseFloat(slider.max) || 1000;
    if (amount > max) slider.max = String(Math.ceil(amount / 100) * 100);
    slider.value = String(amount);
    if (display) display.textContent = '$' + amount;
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc) calc.click();
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
    var partner = document.getElementById('partner-slider');
    if (partner && !partner._bound) {
      partner._bound = true;
      partner.addEventListener('input', function () { run(); });
    }
    var apply = document.getElementById('apply-partner-extra');
    if (apply && !apply._bound) {
      apply._bound = true;
      apply.addEventListener('click', function () {
        var c = window._lastPartner;
        if (!c) return;
        applyExtra(Math.round((Number(extraFromUi()) || 0) + (c.partner || 0)));
      });
    }
    var table = document.getElementById('ladder-table');
    if (table && !table._bound) {
      table._bound = true;
      table.addEventListener('click', function (ev) {
        var tr = ev.target.closest('tr[data-extra]');
        if (!tr) return;
        applyExtra(parseInt(tr.getAttribute('data-extra'), 10) || 0);
      });
    }
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._ladderBound) {
      calc._ladderBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._ladderBound) {
      extra._ladderBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
