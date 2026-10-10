/**
 * Freedom Countdown — circular progress ring + days remaining.
 * High-retention visual for the debt-free date.
 */
(function () {
  'use strict';

  function daysUntil(date) {
    if (!date) return 0;
    var target = date instanceof Date ? date : new Date(date);
    if (isNaN(target.getTime())) return 0;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    var ms = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  function ensureCard() {
    if (document.getElementById('countdown-card')) return;
    var results = document.getElementById('results');
    if (!results) return;
    var anchor = document.getElementById('progress-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'countdown-card';
    card.className = 'card hidden text-center';
    card.innerHTML =
      '<p class="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4">Freedom countdown</p>' +
      '<div class="relative inline-flex items-center justify-center mb-4">' +
        '<svg width="180" height="180" viewBox="0 0 180 180" class="transform -rotate-90">' +
          '<circle cx="90" cy="90" r="78" fill="none" stroke="var(--line)" stroke-width="10"/>' +
          '<circle id="countdown-arc" cx="90" cy="90" r="78" fill="none" stroke="var(--accent)" stroke-width="10" ' +
            'stroke-linecap="round" stroke-dasharray="490" stroke-dashoffset="490" ' +
            'style="transition: stroke-dashoffset 700ms cubic-bezier(0.32,0.72,0,1);"/>' +
        '</svg>' +
        '<div class="absolute flex flex-col items-center">' +
          '<div id="countdown-days" class="text-4xl font-extrabold text-accent leading-none">—</div>' +
          '<div class="text-xs text-slate-500 mt-1">days left</div>' +
        '</div>' +
      '</div>' +
      '<p id="countdown-msg" class="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto"></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  function update(result) {
    ensureCard();
    var card = document.getElementById('countdown-card');
    if (!card || !result || !result.debtFreeDate) return;
    var days = daysUntil(result.debtFreeDate);
    var months = result.months || 0;
    // Soft progress: more days remaining = less arc filled (or reverse for "progress to free")
    var softMaxDays = Math.max(days, 365);
    var progress = months <= 0 ? 1 : Math.max(0.05, 1 - (days / softMaxDays));
    var circumference = 2 * Math.PI * 78; // ~490
    var offset = circumference * (1 - progress);

    var arc = document.getElementById('countdown-arc');
    var daysEl = document.getElementById('countdown-days');
    var msg = document.getElementById('countdown-msg');

    if (arc) arc.style.strokeDashoffset = String(offset);
    if (daysEl) daysEl.textContent = days === 0 ? '0' : String(days);
    if (msg) {
      if (days === 0) msg.textContent = 'You are debt-free today.';
      else if (days <= 30) msg.textContent = 'Finish line — ' + days + ' day' + (days === 1 ? '' : 's') + ' to go.';
      else if (days <= 90) msg.textContent = days + ' days. Keep the extra payments flowing.';
      else msg.textContent = 'On this plan you are free in ' + days + ' days.';
    }
    card.classList.remove('hidden');

    if (typeof window.dispatchGame === 'function' && days > 0 && days <= 365) {
      window.dispatchGame('unlock', { id: 'countdown_watcher' });
    }
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    if (!debts.length) return;
    var extraEl = document.getElementById('extra-slider');
    var extra = extraEl ? parseFloat(extraEl.value) || 0 : 0;
    var stratEl = document.getElementById('strategy');
    var strategy = stratEl && stratEl.value === 'avalanche' ? 'avalanche' : 'snowball';
    var plan = PayoffEngine.calculate({ debts: debts, extra: extra, strategy: strategy });
    update(plan);
  }


  if (typeof window !== 'undefined') {
    var orig = window.runCalc;
    if (typeof orig === 'function' && !orig._countdownWrapped) {
      window.runCalc = function () {
        var out = orig.apply(this, arguments);
        try { ensureCard(); run(); } catch (e) {}
        return out;
      };
      window.runCalc._countdownWrapped = true;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
    } else {
      setTimeout(ensureCard, 0);
    }

    window.Countdown = { daysUntil: daysUntil };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { daysUntil: daysUntil };
  }
})();
