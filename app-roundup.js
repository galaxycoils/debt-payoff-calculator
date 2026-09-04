/**
 * Round-up extras + paycheck reminder calendar card.
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
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  function selectedIncrement() {
    var el = document.querySelector('.roundup-btn[aria-pressed="true"]');
    return el ? parseInt(el.getAttribute('data-inc'), 10) || 10 : 10;
  }

  function ensureCard() {
    if (document.getElementById('roundup-card')) return document.getElementById('roundup-card');
    var anchor = document.getElementById('hours-card') || document.getElementById('raise-card') || document.getElementById('stress-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'roundup-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Round up + payday reminders</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Bump the whole payment to a clean number. Then drop paycheck pings on your calendar so extras actually leave the account.</p>' +
      '<div class="flex flex-wrap gap-2 mb-3" id="roundup-btns">' +
        '<button type="button" class="roundup-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-inc="5" aria-pressed="false">Nearest $5</button>' +
        '<button type="button" class="roundup-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-inc="10" aria-pressed="true">Nearest $10</button>' +
        '<button type="button" class="roundup-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-inc="25" aria-pressed="false">Nearest $25</button>' +
        '<button type="button" class="roundup-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-inc="50" aria-pressed="false">Nearest $50</button>' +
      '</div>' +
      '<p id="roundup-result" class="text-sm text-slate-600 dark:text-slate-300 mb-4">Calculate a plan, then pick a round-up.</p>' +
      '<button type="button" id="apply-roundup" class="hidden px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent mb-4">Apply rounded extra</button>' +
      '<div class="rounded-xl border border-[var(--line)] p-3">' +
        '<label class="block text-sm font-medium mb-1" for="payday-day">Paycheck day of month</label>' +
        '<div class="flex flex-wrap gap-2 items-center">' +
          '<input id="payday-day" type="number" min="1" max="31" value="15" class="w-24 rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-sm min-h-[44px]" />' +
          '<button type="button" id="payday-ics-btn" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700">Download 12 payday reminders</button>' +
        '</div>' +
        '<p id="payday-preview" class="text-xs text-slate-500 dark:text-slate-400 mt-2">Next payday reminder will show after you calculate.</p>' +
      '</div>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="round-up-debt-payments.html">How round-up extras work</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paintRoundup(r) {
    var el = document.getElementById('roundup-result');
    var apply = document.getElementById('apply-roundup');
    if (!el) return;
    if (!r.added) {
      el.textContent = 'Already on a $' + r.increment + ' number (' + fmtMoney(r.currentOutflow) + '/mo). Try a larger increment.';
      if (apply) apply.classList.add('hidden');
      return;
    }
    el.innerHTML = 'Pay ' + fmtMoney(r.roundedOutflow) + '/mo instead of ' + fmtMoney(r.currentOutflow) +
      ' — only ' + fmtMoney(r.added) + ' more extra. Finish ' +
      (r.rounded.debtFreeDate ? new Date(r.rounded.debtFreeDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'sooner') +
      (r.monthsSaved > 0 ? ' (' + r.monthsSaved + ' month' + (r.monthsSaved === 1 ? '' : 's') + ' sooner)' : '') +
      (r.interestSaved > 0 ? ', save ' + fmtMoney(r.interestSaved) + ' interest' : '') + '.';
    if (apply) apply.classList.remove('hidden');
  }

  function paintPaydays() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.nextPaydays) return;
    var dayEl = document.getElementById('payday-day');
    var preview = document.getElementById('payday-preview');
    var day = dayEl ? parseInt(dayEl.value, 10) || 15 : 15;
    var dates = PayoffEngine.nextPaydays(new Date(), day, 3);
    if (preview) preview.textContent = 'Next pings: ' + dates.map(fmtDate).join(', ') + '…';
  }

  function runRoundup(inc) {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareRoundUp) return;
    var input = inputFromUi();
    if (!input) return;
    var r = PayoffEngine.compareRoundUp(input, inc || selectedIncrement());
    window._lastRoundUp = r;
    paintRoundup(r);
    paintPaydays();
    if (r.added > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'round_up' });
    }
  }

  function applyRounded() {
    var r = window._lastRoundUp;
    var slider = document.getElementById('extra-slider');
    var display = document.getElementById('extra-display');
    if (!r || !slider) return;
    var next = Math.min(parseFloat(slider.max) || 1000, Math.max(parseFloat(slider.min) || 0, r.roundedExtra));
    slider.value = next;
    if (display) display.textContent = '$' + next;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc) calc.click();
  }

  function downloadPaydayIcs() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.paycheckReminderIcs) return;
    var dayEl = document.getElementById('payday-day');
    var day = dayEl ? parseInt(dayEl.value, 10) || 15 : 15;
    var extra = extraFromUi();
    if (window._lastRoundUp && window._lastRoundUp.roundedExtra) extra = window._lastRoundUp.roundedExtra;
    var dates = PayoffEngine.nextPaydays(new Date(), day, 12);
    var ics = PayoffEngine.paycheckReminderIcs(dates, extra);
    var blob = new Blob([ics], { type: 'text/calendar' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'payday-debt-extras.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof showToast === 'function') showToast('12 payday reminders downloaded');
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'payday_cal' });
  }

  function markIncrement(inc) {
    document.querySelectorAll('.roundup-btn').forEach(function (btn) {
      var on = String(btn.getAttribute('data-inc')) === String(inc);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('btn-accent', on);
      btn.classList.toggle('text-white', on);
    });
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (!inputFromUi()) return;
    card.classList.remove('hidden');
    markIncrement(selectedIncrement());
    runRoundup();
    bindInner();
  }

  function bindInner() {
    document.querySelectorAll('.roundup-btn').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', function () {
        markIncrement(btn.getAttribute('data-inc'));
        runRoundup(parseInt(btn.getAttribute('data-inc'), 10));
      });
    });
    var apply = document.getElementById('apply-roundup');
    if (apply && !apply._bound) {
      apply._bound = true;
      apply.addEventListener('click', applyRounded);
    }
    var ics = document.getElementById('payday-ics-btn');
    if (ics && !ics._bound) {
      ics._bound = true;
      ics.addEventListener('click', downloadPaydayIcs);
    }
    var day = document.getElementById('payday-day');
    if (day && !day._bound) {
      day._bound = true;
      day.addEventListener('input', paintPaydays);
    }
  }

  function bind() {
    ensureCard();
    bindInner();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._roundupBound) {
      calc._roundupBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._roundupBound) {
      extra._roundupBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
