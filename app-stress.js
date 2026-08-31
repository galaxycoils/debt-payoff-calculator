/**
 * APR shock + payment-holiday cards. Recalc live after results.
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
    if (document.getElementById('stress-card')) return document.getElementById('stress-card');
    var anchor = document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'stress-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">What if things slip?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Two sliders people stay to drag: rates go up, or you pause extras.</p>' +
      '<div class="grid md:grid-cols-2 gap-4">' +
      '  <div class="rounded-xl border border-[var(--line)] p-3">' +
      '    <label class="block text-sm font-medium mb-1" for="apr-shock">If every APR rises <span id="apr-shock-label" class="text-accent">+3%</span></label>' +
      '    <input type="range" id="apr-shock" min="0" max="12" step="1" value="3" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />' +
      '    <p id="apr-shock-result" class="text-sm mt-2 text-slate-600 dark:text-slate-300">Drag to price a rate hike.</p>' +
      '  </div>' +
      '  <div class="rounded-xl border border-[var(--line)] p-3">' +
      '    <label class="block text-sm font-medium mb-2">If I skip extras for</label>' +
      '    <div class="flex flex-wrap gap-2 mb-2" id="holiday-btns">' +
      '      <button type="button" class="holiday-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-months="1">1 month</button>' +
      '      <button type="button" class="holiday-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-months="2">2 months</button>' +
      '      <button type="button" class="holiday-btn px-3 py-2 min-h-[44px] text-xs rounded-lg bg-slate-100 dark:bg-slate-700" data-months="3">3 months</button>' +
      '    </div>' +
      '    <p id="holiday-result" class="text-sm text-slate-600 dark:text-slate-300">Price a pause without abandoning the plan.</p>' +
      '  </div>' +
      '</div>' +
      '<div class="mt-4 flex flex-wrap gap-2">' +
      '  <button type="button" id="ics-btn" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700">Add debt-free date to calendar</button>' +
      '</div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paintShock(r) {
    var el = document.getElementById('apr-shock-result');
    var lab = document.getElementById('apr-shock-label');
    if (lab) lab.textContent = '+' + (r.extraApr || 0) + '%';
    if (!el) return;
    if (!r.extraApr) {
      el.textContent = 'At current rates you finish ' + fmtDate(r.stay.debtFreeDate) + '.';
      return;
    }
    el.textContent = 'Finish ' + fmtDate(r.shock.debtFreeDate) + ' — ' +
      (r.extraMonths > 0 ? r.extraMonths + ' extra month' + (r.extraMonths === 1 ? '' : 's') : 'same months') +
      ', ' + fmtMoney(Math.max(0, r.extraInterest)) + ' more interest.';
  }

  function paintHoliday(r) {
    var el = document.getElementById('holiday-result');
    if (!el) return;
    if (!r.skipMonths) {
      el.textContent = 'Stay on extras to finish ' + fmtDate(r.stay.debtFreeDate) + '.';
      return;
    }
    el.textContent = 'Pause ' + r.skipMonths + ' month' + (r.skipMonths === 1 ? '' : 's') +
      ': finish ' + fmtDate(r.holiday.debtFreeDate) +
      (r.extraMonths > 0 ? ' (' + r.extraMonths + ' later)' : '') +
      ', ' + fmtMoney(Math.max(0, r.extraInterest)) + ' extra interest.';
  }

  function runShock() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareAprShock) return;
    var input = inputFromUi();
    if (!input) return;
    var slider = document.getElementById('apr-shock');
    var delta = slider ? parseFloat(slider.value) || 0 : 3;
    var r = PayoffEngine.compareAprShock(input, delta);
    window._lastAprShock = r;
    paintShock(r);
    if (delta > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'apr_shock' });
    }
  }

  function runHoliday(months) {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.comparePaymentHoliday) return;
    var input = inputFromUi();
    if (!input) return;
    var r = PayoffEngine.comparePaymentHoliday(input, months);
    window._lastHoliday = r;
    paintHoliday(r);
    if (months > 0 && typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'holiday' });
    }
  }

  function downloadIcs() {
    var plan = (window._lastMinCmp && window._lastMinCmp.plan) || window._lastSnow || window._lastAval;
    if (!plan || !plan.debtFreeDate) {
      if (typeof showToast === 'function') showToast('Run a calculation first');
      return;
    }
    var d = plan.debtFreeDate instanceof Date ? plan.debtFreeDate : new Date(plan.debtFreeDate);
    function pad(n) { return String(n).padStart(2, '0'); }
    var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Debt Payoff Calculator//EN',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:' + ymd,
      'DTEND;VALUE=DATE:' + ymd,
      'SUMMARY:Debt-free day',
      'DESCRIPTION:Target date from the private debt payoff calculator.',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debt-free-day.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof showToast === 'function') showToast('Calendar event downloaded');
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    var input = inputFromUi();
    if (!input) return;
    card.classList.remove('hidden');
    runShock();
    var last = window._lastHoliday && window._lastHoliday.skipMonths ? window._lastHoliday.skipMonths : 1;
    runHoliday(last);
  }

  function bind() {
    ensureCard();
    var shock = document.getElementById('apr-shock');
    if (shock && !shock._bound) {
      shock._bound = true;
      shock.addEventListener('input', function () { runShock(); });
    }
    document.querySelectorAll('.holiday-btn').forEach(function (btn) {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', function () {
        runHoliday(parseInt(btn.getAttribute('data-months'), 10) || 1);
      });
    });
    var ics = document.getElementById('ics-btn');
    if (ics && !ics._bound) {
      ics._bound = true;
      ics.addEventListener('click', downloadIcs);
    }
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._stressBound) {
      calc._stressBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var slider = document.getElementById('extra-slider');
    if (slider && !slider._stressBound) {
      slider._stressBound = true;
      slider.addEventListener('input', function () {
        if (document.getElementById('results') && !document.getElementById('results').classList.contains('hidden')) {
          setTimeout(refresh, 0);
        }
      });
    }
    var foot = document.querySelector('footer p.mt-2');
    if (foot && !foot.querySelector('a[href="zero-percent-intro-apr-pitfalls.html"]')) {
      foot.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.className = 'underline hover:text-accent';
      a.href = 'zero-percent-intro-apr-pitfalls.html';
      a.textContent = '0% intro pitfalls';
      foot.appendChild(a);
      foot.appendChild(document.createTextNode(' '));
      var b = document.createElement('a');
      b.className = 'underline hover:text-accent';
      b.href = 'what-if-my-apr-goes-up.html';
      b.textContent = 'If APR rises';
      foot.appendChild(b);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
