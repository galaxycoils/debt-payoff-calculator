/**
 * Next-dollar curve card — drag the slider, see what the next $25 buys.
 */
(function () {
  'use strict';

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
    if (document.getElementById('marginal-card')) return;
    var anchor = document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'marginal-card';
    wrap.className = 'hidden rounded-[2rem] bg-black/5 dark:bg-white/5 p-1.5';
    wrap.innerHTML =
      '<div class="rounded-[1.6rem] bg-[var(--card)] p-5 md:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Next dollar</p>' +
      '<h2 class="text-lg font-semibold mb-1">What the next extra buys</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Same debts. Each step is added on top of the slider. Tap a row to apply it.</p>' +
      '<div id="marginal-rows" class="grid gap-2"></div>' +
      '<p id="marginal-copy" class="text-sm mt-4 text-slate-700 dark:text-slate-200"></p>' +
      '<div class="mt-3 flex flex-wrap gap-2">' +
      '<button type="button" id="marginal-copy-btn" class="rounded-full px-4 py-2 text-sm font-semibold bg-accent-soft text-accent min-h-[44px]">Copy this line</button>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="next-dollar-of-extra.html">Why the first dollars hit harder</a>' +
      '</div></div>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    var btn = document.getElementById('marginal-copy-btn');
    if (btn) btn.addEventListener('click', function () {
      var line = document.getElementById('marginal-copy');
      var text = line ? line.textContent : '';
      if (navigator.clipboard && text) navigator.clipboard.writeText(text);
      if (typeof showToast === 'function') showToast('Next-dollar line copied');
      if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'next_dollar' });
    });
  }

  function applyBump(amount) {
    var slider = document.getElementById('extra-slider');
    var display = document.getElementById('extra-display');
    if (!slider) return;
    var next = Math.min(Number(slider.max) || 1000, Math.max(0, amount));
    slider.value = String(next);
    if (display) display.textContent = '$' + next;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.nextDollarCurve) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('marginal-card');
    if (!input || !card) return;
    var curve = PayoffEngine.nextDollarCurve(PayoffEngine.calculate, input, [0, 25, 50, 100]);
    card.classList.remove('hidden');
    var host = document.getElementById('marginal-rows');
    if (host) {
      host.innerHTML = curve.rows.map(function (r) {
        var label = r.bump === 0 ? 'Now · $' + r.extra : '+$' + r.bump + ' · $' + r.extra;
        var gain = r.bump === 0 ? r.months + ' mo' : (r.monthsSaved > 0 ? r.monthsSaved + ' mo sooner' : 'no sooner');
        return '<button type="button" data-extra="' + r.extra + '" class="marginal-step text-left rounded-2xl px-4 py-3 min-h-[44px] bg-black/5 dark:bg-white/5 hover:opacity-90 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">' +
          '<span class="block text-sm font-semibold">' + label + '</span>' +
          '<span class="block text-xs text-slate-500">' + gain + (r.interestSaved > 0 ? ' · ' + fmtMoney(r.interestSaved) + ' interest' : '') + '</span></button>';
      }).join('');
      host.querySelectorAll('.marginal-step').forEach(function (btn) {
        btn.addEventListener('click', function () { applyBump(Number(btn.getAttribute('data-extra'))); });
      });
    }
    var copy = document.getElementById('marginal-copy');
    if (copy) {
      var sharp = curve.sharpest;
      copy.textContent = sharp && sharp.monthsSaved > 0
        ? 'The sharpest step from $' + curve.baseExtra + ' extra is +$' + sharp.bump + ': ' + sharp.monthsSaved + ' months sooner' + (sharp.interestSaved > 0 ? ' and ' + fmtMoney(sharp.interestSaved) + ' less interest.' : '.')
        : 'From $' + curve.baseExtra + ' extra, the next $100 does not shorten this plan. Minimums are already doing the work.';
    }
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'next_dollar' });
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._marginalWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { run(); } catch (e) {}
      return out;
    };
    window.runCalc._marginalWrapped = true;
  }
})();
