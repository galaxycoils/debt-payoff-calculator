/**
 * Rate-cut daydream card — live APR-drop slider + 0.25 autopay preset.
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
  function pointsFromUi() {
    var el = document.getElementById('ratecut-slider');
    return el ? parseFloat(el.value) || 0 : 1;
  }

  function ensureStyle() {
    if (document.getElementById('ratecut-style')) return;
    var style = document.createElement('style');
    style.id = 'ratecut-style';
    style.textContent =
      '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap");' +
      '#ratecut-card { font-family: "Plus Jakarta Sans", ui-sans-serif, sans-serif; }' +
      '#ratecut-card .ratecut-shell { background: rgba(13,110,110,0.06); padding: 0.4rem; border-radius: 2rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35); }' +
      '#ratecut-card .ratecut-inner { border-radius: calc(2rem - 0.375rem); background: var(--card); box-shadow: inset 0 1px 1px rgba(255,255,255,0.18); padding: 1.25rem; }' +
      '#ratecut-card .ratecut-pill { border-radius: 999px; padding: 0.2rem 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-size: 10px; }' +
      '#ratecut-slider { transition: filter 700ms cubic-bezier(0.32,0.72,0,1); }' +
      '#ratecut-apply { transition: transform 700ms cubic-bezier(0.32,0.72,0,1); }' +
      '#ratecut-apply:active { transform: scale(0.97); }';
    document.head.appendChild(style);
  }

  function ensureCard() {
    if (document.getElementById('ratecut-card')) return document.getElementById('ratecut-card');
    ensureStyle();
    var anchor = document.getElementById('holiday-card') || document.getElementById('yearone-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'ratecut-card';
    card.className = 'hidden';
    card.innerHTML =
      '<div class="ratecut-shell">' +
        '<div class="ratecut-inner">' +
          '<p class="ratecut-pill text-accent mb-3 inline-block bg-accent-soft">Rate daydream</p>' +
          '<h2 class="text-lg font-extrabold tracking-tight mb-1">What if every APR dropped?</h2>' +
          '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Drag the cut. Autopay is the 0.25 point version cards actually offer. Apply writes the new rates into your debts so the rest of the plan follows.</p>' +
          '<label class="block text-sm font-medium mb-1" for="ratecut-slider">Cut every APR by <span id="ratecut-points" class="text-accent font-extrabold">1.00</span> points</label>' +
          '<input type="range" id="ratecut-slider" min="0" max="6" step="0.25" value="1" class="w-full" />' +
          '<div class="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 mt-1 mb-4"><span>0</span><span>Autopay 0.25</span><span>6 pts</span></div>' +
          '<div class="grid grid-cols-2 gap-3 mb-4">' +
            '<div class="rounded-2xl bg-accent-soft p-3"><div id="ratecut-months" class="text-2xl font-extrabold text-accent">0</div><div class="text-[10px] uppercase tracking-wide text-slate-500">months sooner</div></div>' +
            '<div class="rounded-2xl bg-accent-soft p-3"><div id="ratecut-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[10px] uppercase tracking-wide text-slate-500">interest avoided</div></div>' +
          '</div>' +
          '<p id="ratecut-verdict" class="text-sm text-slate-600 dark:text-slate-300 mb-4"></p>' +
          '<div class="flex flex-wrap gap-2">' +
            '<button type="button" id="ratecut-autopay" class="rounded-full px-4 py-2 text-xs font-semibold bg-accent-soft text-accent">Autopay 0.25</button>' +
            '<button type="button" id="ratecut-apply" class="rounded-full px-4 py-2 text-xs font-semibold btn-accent">Apply these rates</button>' +
            '<button type="button" id="ratecut-copy" class="rounded-full px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700">Copy line</button>' +
          '</div>' +
          '<p class="text-xs mt-3"><a href="what-if-my-apr-drops.html" class="text-accent underline">Why a rate cut beats another spreadsheet</a></p>' +
        '</div>' +
      '</div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function applyRates(cutDebts) {
    var rows = document.querySelectorAll('.debt-row');
    cutDebts.forEach(function (debt, i) {
      var row = rows[i];
      if (!row) return;
      var apr = row.querySelector('.debt-apr');
      if (apr) apr.value = String(debt.apr);
    });
    var slider = document.getElementById('ratecut-slider');
    if (slider) slider.value = '0';
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc) calc.click();
  }

  function paint(cmp) {
    var months = document.getElementById('ratecut-months');
    var interest = document.getElementById('ratecut-interest');
    var verdict = document.getElementById('ratecut-verdict');
    var label = document.getElementById('ratecut-points');
    if (label) label.textContent = cmp.points.toFixed(2);
    if (months) months.textContent = String(cmp.monthsSaved);
    if (interest) interest.textContent = fmtMoney(cmp.interestSaved);
    if (verdict) {
      if (cmp.points === 0) {
        verdict.textContent = 'Drag right. Zero points is the plan you already have.';
      } else if (cmp.interestSaved <= 0) {
        verdict.textContent = 'These balances are already cheap enough that a rate cut does not move the date.';
      } else {
        verdict.textContent = 'A ' + cmp.points.toFixed(2) + '-point cut finishes ' + cmp.monthsSaved + ' months sooner and avoids ' + fmtMoney(cmp.interestSaved) + '. Screenshot that line.';
      }
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareRateCut) return;
    var input = inputFromUi();
    if (!input) return;
    var cmp = PayoffEngine.compareRateCut(input, pointsFromUi());
    window._lastRateCut = cmp;
    card.classList.remove('hidden');
    paint(cmp);
    if (cmp.points > 0 && typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'rate_daydream' });
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._ratecutBound) {
      calc._ratecutBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 30); });
    }
    var slider = document.getElementById('ratecut-slider');
    if (slider && !slider._ratecutBound) {
      slider._ratecutBound = true;
      slider.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) refresh();
      });
    }
    var autopay = document.getElementById('ratecut-autopay');
    if (autopay && !autopay._ratecutBound) {
      autopay._ratecutBound = true;
      autopay.addEventListener('click', function () {
        var s = document.getElementById('ratecut-slider');
        if (s) s.value = '0.25';
        refresh();
      });
    }
    var apply = document.getElementById('ratecut-apply');
    if (apply && !apply._ratecutBound) {
      apply._ratecutBound = true;
      apply.addEventListener('click', function () {
        if (window._lastRateCut && window._lastRateCut.cutDebts) applyRates(window._lastRateCut.cutDebts);
      });
    }
    var copy = document.getElementById('ratecut-copy');
    if (copy && !copy._ratecutBound) {
      copy._ratecutBound = true;
      copy.addEventListener('click', function () {
        var cmp = window._lastRateCut;
        if (!cmp || !navigator.clipboard) return;
        var line = 'If every APR dropped ' + cmp.points.toFixed(2) + ' points I would be debt-free ' + cmp.monthsSaved + ' months sooner and avoid ' + fmtMoney(cmp.interestSaved) + ' in interest.';
        navigator.clipboard.writeText(line);
        if (typeof showToast === 'function') showToast('Rate-cut line copied');
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
