/**
 * Promo-APR cliff card — beat the intro-rate reset.
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

  function ensureCard() {
    if (document.getElementById('promo-card')) return document.getElementById('promo-card');
    var anchor = document.getElementById('cashflow-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'promo-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Beat the 0% cliff</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Aim extra at intro-APR debts first so the promotional rate never resets on a leftover balance.</p>' +
      '<div class="grid grid-cols-2 gap-2 text-sm">' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Promo-first finish</p><p id="promo-months" class="font-semibold text-sm">—</p><p id="promo-interest" class="text-[11px] text-slate-500 mt-1"></p></div>' +
      '<div class="rounded-2xl bg-accent-soft/50 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Extra to clear before reset</p><p id="promo-clear" class="font-semibold text-sm">—</p><p id="promo-clear-meta" class="text-[11px] text-slate-500 mt-1"></p></div>' +
      '</div>' +
      '<p id="promo-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<button type="button" id="promo-apply" class="mt-3 hidden px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-accent-soft text-accent">Apply that extra</button>' +
      '<p class="text-xs mt-2"><a href="promo-apr-cliff.html" class="text-accent underline">How intro APR cliffs work</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    var apply = card.querySelector('#promo-apply');
    if (apply) {
      apply.addEventListener('click', function () {
        var extra = window._lastPromo && window._lastPromo.extraToClear;
        var slider = document.getElementById('extra-slider');
        var display = document.getElementById('extra-display');
        if (!slider || extra == null) return;
        var max = parseFloat(slider.max) || 1000;
        if (extra > max) slider.max = String(Math.ceil(extra / 100) * 100);
        slider.value = String(extra);
        if (display) display.textContent = '$' + extra;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
        if (calc) calc.click();
      });
    }
    return card;
  }

  function paint(c) {
    if (!c) return;
    var m = document.getElementById('promo-months');
    var i = document.getElementById('promo-interest');
    var cl = document.getElementById('promo-clear');
    var cm = document.getElementById('promo-clear-meta');
    var v = document.getElementById('promo-verdict');
    var apply = document.getElementById('promo-apply');
    if (m) m.textContent = c.promo.months + ' months';
    if (i) i.textContent = fmtMoney(c.promo.totalInterest) + ' interest';
    if (cl) cl.textContent = c.hasPromo ? fmtMoney(c.extraToClear) + '/mo' : 'No promo';
    if (cm) {
      cm.textContent = c.allClearedBeforeCliff
        ? 'Current extra already clears the cliff'
        : 'Raise extras to wipe promo balances in time';
    }
    if (apply) {
      if (c.hasPromo && !c.allClearedBeforeCliff && c.extraToClear > extraFromUi()) apply.classList.remove('hidden');
      else apply.classList.add('hidden');
    }
    if (!v) return;
    if (!c.hasPromo) {
      v.textContent = 'None of the current debts have promo months set. Add promoMonths on a 0% card to hunt the cliff.';
      return;
    }
    var parts = [];
    if (c.allClearedBeforeCliff) {
      parts.push('Promo balances die before the rate resets.');
    } else {
      var leftover = (c.promo.cliffs || []).filter(function (x) { return !x.paidBeforeCliff; })
        .map(function (x) { return x.name + ' still has ' + fmtMoney(x.leftoverAtCliff) + ' at month ' + x.promoMonths; })
        .join('; ');
      parts.push(leftover || 'A promo balance survives the intro window.');
    }
    if (c.interestSavedVsAvalanche > 1) {
      parts.push('Hunting the cliff saves about ' + fmtMoney(c.interestSavedVsAvalanche) + ' versus plain avalanche.');
    } else if (c.interestSavedVsAvalanche < -1) {
      parts.push('Avalanche still wins on interest by ' + fmtMoney(-c.interestSavedVsAvalanche) + '.');
    }
    v.textContent = parts.join(' ');
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.comparePromoCliff) return;
    var input = inputFromUi();
    if (!input) return;
    var hasPromo = input.debts.some(function (d) { return (parseInt(d.promoMonths, 10) || 0) > 0; });
    if (!hasPromo) {
      card.classList.add('hidden');
      return;
    }
    var c = PayoffEngine.comparePromoCliff(input);
    window._lastPromo = c;
    card.classList.remove('hidden');
    paint(c);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'promo_cliff' });
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._promoBound) {
      calc._promoBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._promoBound) {
      extra._promoBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
