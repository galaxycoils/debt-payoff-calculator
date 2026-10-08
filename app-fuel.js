/**
 * Snowball fuel card + named debt-free date.
 * Double-bezel result surface. The copy line is the share loop.
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
    if (document.getElementById('fuel-card')) return;
    var anchor = document.getElementById('season-card') || document.getElementById('calendar-card') || document.getElementById('hero-card') || document.getElementById('results');
    if (!anchor || !anchor.parentNode) return;
    var wrap = document.createElement('div');
    wrap.id = 'fuel-card';
    wrap.className = 'hidden rounded-[2rem] bg-black/5 dark:bg-white/5 p-1.5 mt-4';
    wrap.style.transition = 'opacity 700ms cubic-bezier(0.32,0.72,0,1), transform 700ms cubic-bezier(0.32,0.72,0,1)';
    wrap.innerHTML =
      '<div class="rounded-[1.6rem] bg-[var(--card)] p-5 md:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Fuel</p>' +
      '<h2 class="text-lg font-semibold mb-1">The minimum that becomes extra</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">When a debt dies, its minimum rolls into the extra. That is the snowball. The date on the right is the one people paste.</p>' +
      '<div class="grid md:grid-cols-2 gap-4">' +
      '<div>' +
      '<p id="fuel-double" class="text-4xl md:text-5xl font-semibold tracking-tight mb-1">—</p>' +
      '<p id="fuel-sub" class="text-sm text-slate-600 dark:text-slate-300 mb-3"></p>' +
      '<div id="fuel-kills" class="space-y-2"></div>' +
      '</div>' +
      '<div class="rounded-[1.4rem] bg-black/5 dark:bg-white/5 p-4">' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Named date</p>' +
      '<p id="fuel-name" class="text-2xl font-semibold tracking-tight mb-1">—</p>' +
      '<p id="fuel-name-sub" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '</div></div>' +
      '<div class="flex flex-wrap gap-2 mt-4">' +
      '<button type="button" id="fuel-copy" class="rounded-full pl-5 pr-2 py-2 text-sm font-semibold bg-accent text-white min-h-[44px] inline-flex items-center gap-2">Copy the line <span class="w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center">↗</span></button>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="snowball-fuel.html">Snowball fuel</a>' +
      '<a class="rounded-full px-4 py-2 text-sm underline text-accent min-h-[44px] inline-flex items-center" href="name-your-debt-free-date.html">Name the date</a>' +
      '</div></div>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    var copy = document.getElementById('fuel-copy');
    if (copy) copy.addEventListener('click', function () {
      var sub = document.getElementById('fuel-sub');
      var name = document.getElementById('fuel-name-sub');
      var text = ((sub && sub.textContent) || '') + ' ' + ((name && name.textContent) || '');
      if (navigator.clipboard && text.trim()) navigator.clipboard.writeText(text.trim());
      if (typeof showToast === 'function') showToast('Fuel line copied');
      if (typeof window.dispatchGame === 'function') {
        window.dispatchGame('unlock', { id: 'snowball_fuel' });
        window.dispatchGame('unlock', { id: 'freedom_name' });
      }
    });
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.snowballFuel || !PayoffEngine.freedomName) return;
    var input = inputFromUi();
    ensureCard();
    var card = document.getElementById('fuel-card');
    if (!input || !card) return;
    var fuel = PayoffEngine.snowballFuel(input.debts, input.extra, input.strategy);
    var named = PayoffEngine.freedomName(fuel.debtFreeDate instanceof Date ? fuel.debtFreeDate : new Date());
    card.classList.remove('hidden');
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
    var headline = document.getElementById('fuel-double');
    var sub = document.getElementById('fuel-sub');
    if (headline) {
      headline.textContent = fuel.doubleAtMonth ? ('Month ' + fuel.doubleAtMonth) : (fuel.freedTotal ? fmtMoney(fuel.freedTotal) : '—');
    }
    if (sub) {
      sub.textContent = fuel.doubleAtMonth
        ? 'The extra doubles in month ' + fuel.doubleAtMonth + ' once ' + fmtMoney(fuel.extra) + ' of minimums roll in. By the end, ' + fmtMoney(fuel.freedTotal) + ' of bills have become extra.'
        : 'Freed minimums add ' + fmtMoney(fuel.freedTotal) + ' to the extra by the last kill.';
    }
    var list = document.getElementById('fuel-kills');
    if (list) {
      var maxExtra = fuel.extraAtEnd || 1;
      list.innerHTML = fuel.kills.slice(0, 6).map(function (k) {
        var width = Math.max(8, Math.round((k.extraAfter / maxExtra) * 100));
        return '<div class="text-sm">' +
          '<div class="flex justify-between gap-3 mb-1"><span>' + k.name + ' · mo ' + k.month + '</span><span>' + fmtMoney(k.freed) + ' → ' + fmtMoney(k.extraAfter) + '</span></div>' +
          '<div class="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden"><div class="h-full bg-accent origin-left" style="width:' + width + '%;transform:scaleX(1);transition:transform 700ms cubic-bezier(0.32,0.72,0,1)"></div></div>' +
          '</div>';
      }).join('');
    }
    var nameEl = document.getElementById('fuel-name');
    var nameSub = document.getElementById('fuel-name-sub');
    if (nameEl) nameEl.textContent = named.phrase || '—';
    if (nameSub) {
      nameSub.textContent = named.phrase
        ? 'Debt-free lands on ' + named.phrase + ' — ' + fuel.months + ' month' + (fuel.months === 1 ? '' : 's') + ' from today.'
        : 'Run a plan to name the date.';
    }
  }

  function boot() {
    var calc = document.getElementById('calculate');
    if (calc && !calc._fuelBound) {
      calc._fuelBound = true;
      calc.addEventListener('click', function () { setTimeout(run, 30); });
    }
    var slider = document.getElementById('extra-slider');
    if (slider && !slider._fuelBound) {
      slider._fuelBound = true;
      slider.addEventListener('input', function () { setTimeout(run, 40); });
    }
    setTimeout(run, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
