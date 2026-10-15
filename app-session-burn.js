/**
 * Live session interest burn ticker.
 * Shows how much interest has burned since the user started this session.
 * High-retention: the number keeps climbing while the tab is open.
 */
(function () {
  'use strict';

  var startTime = Date.now();
  var currentPerDay = 0;
  var timer = null;

  function ensureCard() {
    if (document.getElementById('session-burn-card')) return;
    var results = document.getElementById('results');
    if (!results) return;
    var anchor = document.getElementById('hero-card') || document.querySelector('#results .double-bezel');
    if (!anchor || !anchor.parentNode) return;

    var outer = document.createElement('div');
    outer.id = 'session-burn-card';
    outer.className = 'double-bezel hidden mb-6';
    outer.innerHTML =
      '<div class="double-bezel-inner text-center">' +
        '<p class="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">Interest burning right now</p>' +
        '<div id="session-burn-amount" class="text-5xl font-extrabold text-accent leading-none tracking-tight" style="transition: transform 400ms cubic-bezier(0.32,0.72,0,1), opacity 200ms;">$0.00</div>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mt-2">since you opened this page</p>' +
        '<p id="session-burn-rate" class="text-sm text-slate-600 dark:text-slate-300 mt-3"></p>' +
      '</div>';
    anchor.parentNode.insertBefore(outer, anchor.nextSibling);
  }

  function tick() {
    if (currentPerDay <= 0) return;
    var elapsed = (Date.now() - startTime) / 1000;
    var cents = (typeof SessionBurn !== 'undefined')
      ? SessionBurn.sessionBurnCents(currentPerDay, elapsed)
      : Math.round((currentPerDay / 86400) * elapsed * 100);
    var el = document.getElementById('session-burn-amount');
    if (!el) return;
    var formatted = (typeof SessionBurn !== 'undefined')
      ? SessionBurn.formatSessionBurn(cents)
      : '$' + (cents / 100).toFixed(2);
    if (el.textContent !== formatted) {
      el.textContent = formatted;
      // micro-interaction: slight scale pulse
      el.style.transform = 'scale(1.04)';
      setTimeout(function () { el.style.transform = 'scale(1)'; }, 180);
    }
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(tick, 1000);
    tick();
  }

  function update(perDay) {
    ensureCard();
    currentPerDay = Math.max(0, Number(perDay) || 0);
    var card = document.getElementById('session-burn-card');
    if (!card) return;
    if (currentPerDay <= 0) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    var rateEl = document.getElementById('session-burn-rate');
    if (rateEl) {
      var perHour = currentPerDay / 24;
      rateEl.textContent = 'Burning ' + (typeof SessionBurn !== 'undefined' ? SessionBurn.formatSessionBurn(Math.round(perHour * 100)) : '$' + perHour.toFixed(2)) + '/hour · every second counts';
    }
    startTimer();
  }

  function runFromEngine() {
    if (typeof PayoffEngine === 'undefined' || typeof PayoffEngine.dailyInterestBurn !== 'function') return;
    if (typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    if (!debts || !debts.length) return;
    var burn = PayoffEngine.dailyInterestBurn(debts);
    update(burn.perDay);
  }

  // Expose for boot / calc hooks
  window.SessionBurnUI = {
    update: update,
    run: runFromEngine,
    reset: function () { startTime = Date.now(); tick(); }
  };

  // Auto-run when results appear or on load if debts exist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(runFromEngine, 400);
    });
  } else {
    setTimeout(runFromEngine, 400);
  }

  // Hook into calculate button if present
  document.addEventListener('click', function (e) {
    if (e.target && (e.target.id === 'calculate-btn' || e.target.closest('#calculate-btn'))) {
      setTimeout(runFromEngine, 120);
    }
  });

  // Also react to slider changes (debts may change burn rate)
  document.addEventListener('input', function (e) {
    if (e.target && (e.target.id === 'extra-slider' || e.target.classList.contains('debt-balance') || e.target.classList.contains('debt-apr'))) {
      setTimeout(runFromEngine, 80);
    }
  });

  // Viral challenge copy — short, high-share version
  document.addEventListener('click', function (e) {
    if (!e.target || e.target.id !== 'challenge-btn') return;
    var snow = window._lastSnow;
    var aval = window._lastAval;
    var mode = window._lastMode || 'compare';
    var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
    if (!primary || !primary.debtFreeDate) {
      if (typeof showToast === 'function') showToast('Calculate a plan first');
      return;
    }
    var dateStr = primary.debtFreeDate;
    if (dateStr instanceof Date) dateStr = dateStr.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    var extra = 0;
    var slider = document.getElementById('extra-slider');
    if (slider) extra = parseFloat(slider.value) || 0;
    var text = 'I can be debt-free by ' + dateStr + ' if I put $' + extra + '/month extra toward debt.\n\nCan you beat my date?\n\nFree private calculator (data never leaves your browser):\n' + window.location.href.split('#')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (typeof showToast === 'function') showToast('Challenge copied — paste anywhere');
      }).catch(function () {
        if (typeof showToast === 'function') showToast(text);
      });
    } else if (typeof showToast === 'function') {
      showToast(text);
    }
  });
})();
