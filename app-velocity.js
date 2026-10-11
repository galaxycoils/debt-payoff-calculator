/**
 * Live payoff velocity meter — shows months & interest saved per $100 extra.
 * Updates as the slider moves. High-retention "what is this extra worth?" visual.
 */
(function () {
  'use strict';

  function ensureCard() {
    if (document.getElementById('velocity-card')) return;
    var results = document.getElementById('results');
    if (!results) return;
    var anchor = document.getElementById('hero-card') || document.getElementById('progress-card');
    if (!anchor || !anchor.parentNode) return;
    var outer = document.createElement('div');
    outer.id = 'velocity-card';
    outer.className = 'double-bezel hidden mb-6';
    outer.innerHTML =
      '<div class="double-bezel-inner">' +
        '<p class="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-3">Payoff velocity</p>' +
        '<div class="flex flex-wrap items-end justify-between gap-4">' +
          '<div>' +
            '<div class="text-3xl font-extrabold text-accent leading-none" id="velocity-months">—</div>' +
            '<div class="text-xs text-slate-500 mt-1">months saved per $100 extra</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-3xl font-extrabold text-accent leading-none" id="velocity-interest">—</div>' +
            '<div class="text-xs text-slate-500 mt-1">interest saved per $100</div>' +
          '</div>' +
        '</div>' +
        '<p id="velocity-msg" class="text-sm text-slate-600 dark:text-slate-300 mt-4"></p>' +
      '</div>';
    anchor.parentNode.insertBefore(outer, anchor.nextSibling);
  }

  function formatMoney(n) {
    return '$' + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function update() {
    ensureCard();
    var card = document.getElementById('velocity-card');
    if (!card || typeof PayoffVelocity === 'undefined' || typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    if (!debts.length) { card.classList.add('hidden'); return; }
    var extraEl = document.getElementById('extra-slider');
    var extra = extraEl ? parseFloat(extraEl.value) || 0 : 0;
    var stratEl = document.getElementById('strategy');
    var strategy = stratEl && stratEl.value === 'avalanche' ? 'avalanche' : 'snowball';
    var v = PayoffVelocity.calculateVelocity(debts, extra, strategy);
    var mEl = document.getElementById('velocity-months');
    var iEl = document.getElementById('velocity-interest');
    var msg = document.getElementById('velocity-msg');
    if (mEl) mEl.textContent = v.monthsPer100 === 0 ? '0' : String(v.monthsPer100);
    if (iEl) iEl.textContent = formatMoney(v.interestPer100);
    if (msg) {
      if (v.monthsPer100 === 0) msg.textContent = 'Adding another $100 barely shortens this plan — you are already aggressive.';
      else msg.textContent = 'At your current extra, every additional $100 buys ' + v.monthsPer100 + ' month' + (v.monthsPer100 === 1 ? '' : 's') + ' and ' + formatMoney(v.interestPer100) + ' in interest.';
    }
    card.classList.remove('hidden');
  }

  function hook() {
    var slider = document.getElementById('extra-slider');
    if (slider && !slider._velocityBound) {
      slider.addEventListener('input', function () { try { update(); } catch (e) {} });
      slider._velocityBound = true;
    }
    if (typeof window.runCalc === 'function' && !window.runCalc._velocityWrapped) {
      var orig = window.runCalc;
      window.runCalc = function () {
        var out = orig.apply(this, arguments);
        try { update(); } catch (e) {}
        return out;
      };
      window.runCalc._velocityWrapped = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();
  // Also try after a short delay in case boot is still loading modules
  setTimeout(hook, 400);
})();
