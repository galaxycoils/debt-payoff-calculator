/**
 * Life-stack card — interest saved as rent, groceries, flights + pin duel.
 */
(function () {
  'use strict';

  var PIN_KEY = 'debtPayoffPin';

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
  function rentFromUi() {
    var el = document.getElementById('life-rent');
    return el ? parseFloat(el.value) || 1500 : 1500;
  }
  function loadPin() {
    try {
      var raw = localStorage.getItem(PIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function savePin(pin) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pin)); } catch (e) { /* private mode */ }
  }

  function ensureStyle() {
    if (document.getElementById('life-style')) return;
    var style = document.createElement('style');
    style.id = 'life-style';
    style.textContent =
      '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap");' +
      '#life-card { font-family: "Plus Jakarta Sans", ui-sans-serif, sans-serif; }' +
      '#life-card .life-shell { background: rgba(92,61,30,0.06); padding: 0.4rem; border-radius: 2rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4); }' +
      '#life-card .life-inner { border-radius: calc(2rem - 0.375rem); background: var(--card, #fff); box-shadow: inset 0 1px 1px rgba(255,255,255,0.22); padding: 1.25rem; }' +
      '#life-card .life-pill { border-radius: 999px; padding: 0.2rem 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-size: 10px; }' +
      '#life-rent, #life-pin, #life-copy { transition: transform 700ms cubic-bezier(0.32,0.72,0,1); }' +
      '#life-pin:active, #life-copy:active { transform: scale(0.97); }';
    document.head.appendChild(style);
  }

  function ensureCard() {
    if (document.getElementById('life-card')) return document.getElementById('life-card');
    ensureStyle();
    var anchor = document.getElementById('ratecut-card') || document.getElementById('holiday-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'life-card';
    card.className = 'hidden';
    card.innerHTML =
      '<div class="life-shell">' +
        '<div class="life-inner">' +
          '<p class="life-pill text-accent mb-3 inline-block bg-accent-soft">Life stack</p>' +
          '<h2 class="text-lg font-extrabold tracking-tight mb-1">Interest saved, in real life</h2>' +
          '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Same plan versus minimums only. Drag rent so the number matches your city. Pin the plan, then raise extra and try to beat it.</p>' +
          '<label class="block text-sm font-medium mb-1" for="life-rent">Monthly rent <span id="life-rent-label" class="text-accent font-extrabold">$1,500</span></label>' +
          '<input type="range" id="life-rent" min="800" max="4000" step="50" value="1500" class="w-full" />' +
          '<div class="grid grid-cols-3 gap-3 my-4">' +
            '<div class="rounded-2xl bg-accent-soft p-3"><div id="life-rent-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-[10px] uppercase tracking-wide text-slate-500">months of rent</div></div>' +
            '<div class="rounded-2xl bg-accent-soft p-3"><div id="life-groceries" class="text-2xl font-extrabold text-accent">0</div><div class="text-[10px] uppercase tracking-wide text-slate-500">grocery weeks</div></div>' +
            '<div class="rounded-2xl bg-accent-soft p-3"><div id="life-flights" class="text-2xl font-extrabold text-accent">0</div><div class="text-[10px] uppercase tracking-wide text-slate-500">weekend flights</div></div>' +
          '</div>' +
          '<p id="life-verdict" class="text-sm text-slate-600 dark:text-slate-300 mb-2"></p>' +
          '<p id="life-pin-verdict" class="text-sm font-semibold text-accent mb-4"></p>' +
          '<div class="flex flex-wrap gap-2">' +
            '<button type="button" id="life-pin" class="rounded-full px-4 py-2 text-xs font-semibold btn-accent">Pin this plan</button>' +
            '<button type="button" id="life-copy" class="rounded-full px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700">Copy line</button>' +
          '</div>' +
          '<p class="text-xs mt-3"><a href="interest-saved-in-real-life.html" class="text-accent underline">Why interest saved is rent, not a spreadsheet cell</a></p>' +
        '</div>' +
      '</div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(eq, pinScore) {
    var rentLabel = document.getElementById('life-rent-label');
    var rentMonths = document.getElementById('life-rent-months');
    var groceries = document.getElementById('life-groceries');
    var flights = document.getElementById('life-flights');
    var verdict = document.getElementById('life-verdict');
    var pinLine = document.getElementById('life-pin-verdict');
    if (rentLabel) rentLabel.textContent = fmtMoney(eq.rent);
    if (rentMonths) rentMonths.textContent = String(eq.rentMonths);
    if (groceries) groceries.textContent = String(eq.groceryWeeks);
    if (flights) flights.textContent = String(eq.flights);
    if (verdict) {
      verdict.textContent = eq.interestSaved > 0
        ? 'Versus minimums, this plan avoids ' + fmtMoney(eq.interestSaved) + ' — ' + eq.headline + ', ' + eq.groceryWeeks + ' grocery weeks, ' + eq.flights + ' flights.'
        : 'Add extra above the minimums to turn interest into rent.';
    }
    if (pinLine) {
      if (!pinScore) pinLine.textContent = 'Pin this plan. Come back after a raise, a cut, or a snowflake and see if you beat it.';
      else if (pinScore.won) pinLine.textContent = 'You beat the pin by ' + pinScore.monthsBeaten + ' months and ' + fmtMoney(pinScore.interestBeaten) + '.';
      else pinLine.textContent = 'Still even with the pin. Drag extra up.';
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.lifeEquivalents || !PayoffEngine.compareToMinimums) return;
    var input = inputFromUi();
    if (!input) return;
    var cmp = PayoffEngine.compareToMinimums(input);
    var eq = PayoffEngine.lifeEquivalents(cmp.interestSaved, { rent: rentFromUi() });
    var plan = cmp.plan || {};
    var pin = loadPin();
    var pinScore = pin && PayoffEngine.beatPin ? PayoffEngine.beatPin(plan, pin) : null;
    window._lastLife = { eq: eq, plan: plan, pinScore: pinScore };
    card.classList.remove('hidden');
    paint(eq, pinScore);
    if (eq.interestSaved > 0 && typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'life_stack' });
    if (pinScore && pinScore.won && typeof showToast === 'function' && !card._celebrated) {
      card._celebrated = true;
      showToast('Pinned plan beaten');
    }
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._lifeBound) {
      calc._lifeBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 40); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._lifeBound) {
      extra._lifeBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) refresh();
      });
    }
    var rent = document.getElementById('life-rent');
    if (rent && !rent._lifeBound) {
      rent._lifeBound = true;
      rent.addEventListener('input', refresh);
    }
    var pinBtn = document.getElementById('life-pin');
    if (pinBtn && !pinBtn._lifeBound) {
      pinBtn._lifeBound = true;
      pinBtn.addEventListener('click', function () {
        var last = window._lastLife;
        if (!last || !last.plan) return;
        savePin({ months: last.plan.months, totalInterest: last.plan.totalInterest, pinnedAt: Date.now() });
        var card = document.getElementById('life-card');
        if (card) card._celebrated = false;
        if (typeof showToast === 'function') showToast('Plan pinned');
        refresh();
      });
    }
    var copy = document.getElementById('life-copy');
    if (copy && !copy._lifeBound) {
      copy._lifeBound = true;
      copy.addEventListener('click', function () {
        var last = window._lastLife;
        if (!last || !navigator.clipboard) return;
        var eq = last.eq;
        var line = 'My extra payments avoid ' + fmtMoney(eq.interestSaved) + ' in interest — ' + eq.headline + ', ' + eq.groceryWeeks + ' weeks of groceries, ' + eq.flights + ' flights.';
        navigator.clipboard.writeText(line);
        if (typeof showToast === 'function') showToast('Life-stack line copied');
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
