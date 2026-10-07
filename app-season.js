/**
 * Gift-month dip card + awkward balance cliff.
 * Double-bezel result surface. Copy lines are the share loop.
 */
(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtMoney(n) {
    var v = Number(n) || 0;
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
  function inputFromUi() {
    if (typeof getDebtsFromUI !== 'function') return null;
    var debts = getDebtsFromUI();
    if (!debts.length) return null;
    return { debts: debts, extra: extraFromUi(), strategy: strategyFromUi() };
  }

  function ensureCard() {
    if (document.getElementById('season-card')) return;
    var anchor = document.getElementById('calendar-card') || document.getElementById('hero-card') || document.getElementById('results');
    if (!anchor || !anchor.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'season-card';
    wrap.className = 'hidden rounded-[2rem] bg-black/5 dark:bg-white/5 p-1.5 mt-4';
    wrap.innerHTML =
      '<div class="rounded-[1.6rem] bg-[var(--card)] p-5 md:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Season</p>' +
      '<h2 class="text-lg font-semibold mb-1">What a gift month costs</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">One month a year the extra shrinks — gifts, travel, a slow check. The cliff is the awkward leftover on the smallest debt.</p>' +
      '<div class="grid md:grid-cols-2 gap-4">' +
      '<div>' +
      '<p id="season-months" class="text-4xl md:text-5xl font-semibold tracking-tight mb-1">—</p>' +
      '<p id="season-sub" class="text-sm text-slate-600 dark:text-slate-300 mb-3"></p>' +
      '<label class="block text-xs uppercase tracking-[0.16em] text-slate-500 mb-1">Extra that disappears</label>' +
      '<input id="season-dip" type="range" min="0" max="500" step="25" value="100" class="w-full mb-2" />' +
      '<div class="flex flex-wrap gap-2 mb-3">' +
      MONTHS.map(function (name, i) {
        return '<button type="button" data-month="' + (i + 1) + '" class="season-month rounded-full px-3 py-2 text-xs font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">' + name + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="rounded-[1.4rem] bg-black/5 dark:bg-white/5 p-4">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Awkward cliff</p>' +
      '<p id="season-cliff" class="text-2xl font-semibold tracking-tight mb-1">—</p>' +
      '<p id="season-cliff-sub" class="text-sm text-slate-600 dark:text-slate-300 mb-3"></p>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button type="button" data-step="100" class="season-step rounded-full px-4 py-2 text-sm font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">To $100</button>' +
      '<button type="button" data-step="500" class="season-step rounded-full px-4 py-2 text-sm font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">To $500</button>' +
      '</div></div></div>' +
      '<div class="flex flex-wrap gap-2 mt-4">' +
      '<button type="button" id="season-copy" class="rounded-full pl-5 pr-2 py-2 text-sm font-semibold bg-accent text-white min-h-[44px] inline-flex items-center gap-2">Copy the line <span class="w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center">↗</span></button>' +
      '<button type="button" id="season-apply" class="rounded-full px-4 py-2 text-sm font-semibold bg-black/5 dark:bg-white/5 min-h-[44px]">Drop the cliff in month 1</button>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="december-gift-month-debt.html">Gift month</a>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="awkward-balance-payoff.html">Awkward balance</a>' +
      '</div></div>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    wrap.setAttribute('data-month', '12');
    wrap.setAttribute('data-step', '100');
    var dip = document.getElementById('season-dip');
    if (dip) dip.addEventListener('input', function () { run(); });
    wrap.querySelectorAll('.season-month').forEach(function (btn) {
      btn.addEventListener('click', function () {
        wrap.setAttribute('data-month', btn.getAttribute('data-month'));
        run();
      });
    });
    wrap.querySelectorAll('.season-step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        wrap.setAttribute('data-step', btn.getAttribute('data-step'));
        run();
      });
    });
    var copy = document.getElementById('season-copy');
    if (copy) copy.addEventListener('click', function () {
      var sub = document.getElementById('season-sub');
      var cliff = document.getElementById('season-cliff-sub');
      var text = ((sub && sub.textContent) || '') + ' ' + ((cliff && cliff.textContent) || '');
      if (navigator.clipboard && text.trim()) navigator.clipboard.writeText(text.trim());
      if (typeof showToast === 'function') showToast('Season line copied');
      if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'gift_month' });
    });
    var apply = document.getElementById('season-apply');
    if (apply) apply.addEventListener('click', function () {
      var amount = Number(wrap.getAttribute('data-cliff') || 0);
      if (!amount) return;
      var box = document.getElementById('snowflakes-container');
      if (box) {
        var row = document.createElement('div');
        row.className = 'snowflake-row flex flex-wrap gap-2 items-center';
        row.innerHTML = '<input type="number" class="sf-month w-20 border rounded-lg px-2 py-2 text-sm" value="1" />' +
          '<span class="text-xs text-slate-400">mo</span>' +
          '<input type="number" class="sf-amount w-28 border rounded-lg px-2 py-2 text-sm" value="' + amount + '" />' +
          '<button type="button" class="remove-sf text-red-500 text-sm px-2 min-h-[44px]">Remove</button>';
        var rm = row.querySelector('.remove-sf');
        if (rm) rm.addEventListener('click', function () { row.remove(); });
        box.appendChild(row);
      }
      if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'balance_cliff' });
      if (typeof window.runCalc === 'function') window.runCalc(false);
      if (typeof showToast === 'function') showToast('Cliff dropped into month 1');
    });
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.giftMonthCost || !PayoffEngine.balanceCliff) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('season-card');
    if (!input || !card) return;
    var dipEl = document.getElementById('season-dip');
    var extra = input.extra;
    if (dipEl) dipEl.max = String(Math.max(100, extra || 100));
    var dip = dipEl ? Math.min(extra, parseFloat(dipEl.value) || 0) : Math.min(extra, 100);
    var month = parseInt(card.getAttribute('data-month'), 10) || 12;
    var step = parseInt(card.getAttribute('data-step'), 10) || 100;
    var gift = PayoffEngine.giftMonthCost(input.debts, extra, input.strategy, { monthOfYear: month, dip: dip, asOf: new Date() });
    var cliff = PayoffEngine.balanceCliff(input.debts, extra, input.strategy, { step: step });
    card.classList.remove('hidden');
    card.setAttribute('data-cliff', String(cliff.cliff || 0));
    var months = document.getElementById('season-months');
    var sub = document.getElementById('season-sub');
    if (months) months.textContent = gift.monthsAdded ? ('+' + gift.monthsAdded + ' mo') : 'No slip';
    if (sub) {
      sub.textContent = MONTHS[month - 1] + ' extra drops by ' + fmtMoney(gift.dip) +
        '. That adds ' + fmtMoney(gift.interestAdded) + ' interest and ' + gift.monthsAdded +
        ' month' + (gift.monthsAdded === 1 ? '' : 's') + '.';
    }
    var cliffEl = document.getElementById('season-cliff');
    var cliffSub = document.getElementById('season-cliff-sub');
    if (cliffEl) cliffEl.textContent = cliff.cliff ? fmtMoney(cliff.cliff) : 'Round';
    if (cliffSub) {
      cliffSub.textContent = cliff.name
        ? cliff.name + ' sits at ' + fmtMoney(cliff.balance) + '. Pay ' + fmtMoney(cliff.cliff) +
          ' once to land on ' + fmtMoney(cliff.targetBalance) + ' — ' + cliff.monthsSaved +
          ' month' + (cliff.monthsSaved === 1 ? '' : 's') + ' and ' + fmtMoney(cliff.interestSaved) + ' interest.'
        : 'Add a balance to see the cliff.';
    }
    card.querySelectorAll('.season-month').forEach(function (btn) {
      var on = btn.getAttribute('data-month') === String(month);
      btn.style.outline = on ? '1px solid rgba(15,118,110,0.45)' : '';
    });
  }

  function boot() {
    var calc = document.getElementById('calculate');
    if (calc && !calc._seasonBound) {
      calc._seasonBound = true;
      calc.addEventListener('click', function () { setTimeout(run, 30); });
    }
    var slider = document.getElementById('extra-slider');
    if (slider && !slider._seasonBound) {
      slider._seasonBound = true;
      slider.addEventListener('input', function () { setTimeout(run, 40); });
    }
    setTimeout(run, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
