/**
 * Holiday deadline card — extra needed to finish by Christmas, tax day, New Year.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
    if (document.getElementById('holiday-card')) return document.getElementById('holiday-card');
    var anchor = document.getElementById('yearone-card') || document.getElementById('thirteenth-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'holiday-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Calendar pressure</p>' +
      '<h2 class="text-lg font-semibold text-accent mb-1">Finish before a date that matters</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Christmas, tax day, and New Year are the three dates people actually screenshot. This card solves the extra that hits each one.</p>' +
      '<div id="holiday-rows" class="space-y-2"></div>' +
      '<p id="holiday-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<p class="text-xs mt-2"><a href="finish-by-christmas.html" class="text-accent underline">Why holiday deadlines work</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function applyExtra(amount) {
    var slider = document.getElementById('extra-slider');
    if (!slider) return;
    var max = parseFloat(slider.max) || 2000;
    if (amount > max) slider.max = String(Math.ceil(amount / 100) * 100);
    slider.value = String(amount);
    var display = document.getElementById('extra-display');
    if (display) display.textContent = '$' + amount;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc) calc.click();
  }

  function paint(cmp) {
    var wrap = document.getElementById('holiday-rows');
    var verdict = document.getElementById('holiday-verdict');
    if (!wrap || !cmp) return;
    wrap.innerHTML = '';
    cmp.rows.forEach(function (row) {
      var el = document.createElement('div');
      el.className = 'rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 flex items-center justify-between gap-3';
      var status = row.alreadyOnTrack
        ? 'On track'
        : (row.reachable ? 'Need ' + fmtMoney(row.shortfall) + ' more extra' : 'Out of range');
      el.innerHTML =
        '<div><p class="text-[10px] uppercase tracking-wide text-slate-400">' + row.label + ' · ' + fmtDate(row.date) + '</p>' +
        '<p class="font-semibold text-sm">' + status + '</p>' +
        '<p class="text-xs text-slate-500">Solved extra ' + fmtMoney(row.extraNeeded) + ' / mo</p></div>';
      if (!row.alreadyOnTrack && row.reachable) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rounded-full px-3 py-1.5 text-xs bg-accent text-white shrink-0';
        btn.textContent = 'Apply';
        btn.addEventListener('click', function () { applyExtra(row.extraNeeded); });
        el.appendChild(btn);
      }
      wrap.appendChild(el);
    });
    if (verdict) {
      var hit = cmp.rows.filter(function (r) { return r.alreadyOnTrack; });
      if (hit.length) {
        verdict.textContent = 'Current extra already clears ' + hit.map(function (h) { return h.label; }).join(' and ') + '. Drag the slider down to see the line you would miss.';
      } else {
        var cheapest = cmp.rows.filter(function (r) { return r.reachable; }).sort(function (a, b) { return a.shortfall - b.shortfall; })[0];
        verdict.textContent = cheapest
          ? 'Closest holiday you can still buy is ' + cheapest.label + ' — ' + fmtMoney(cheapest.shortfall) + ' more extra per month.'
          : 'These three dates are too soon at any reasonable extra. Pick a later target date on the solver.';
      }
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareHolidayDeadlines) return;
    var input = inputFromUi();
    if (!input) return;
    var cmp = PayoffEngine.compareHolidayDeadlines(input);
    window._lastHoliday = cmp;
    card.classList.remove('hidden');
    paint(cmp);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'holiday_deadline' });
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._holidayBound) {
      calc._holidayBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._holidayBound) {
      extra._holidayBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
