/**
 * On-track check-in + credit utilization glide path.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    var v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
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

  function snapshotKey() { return 'debtPayoffPlanSnapshot'; }

  function saveSnapshot(plan, input) {
    try {
      var snap = {
        savedAt: Date.now(),
        extra: input.extra,
        strategy: input.strategy,
        startingTotal: plan.startingTotal,
        months: plan.months,
        history: (plan.history || []).map(function (h) {
          return { month: h.month, totalBalance: h.totalBalance };
        })
      };
      localStorage.setItem(snapshotKey(), JSON.stringify(snap));
    } catch (e) {}
  }

  function loadSnapshot() {
    try {
      var raw = localStorage.getItem(snapshotKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function monthsSince(ts) {
    if (!ts) return 0;
    var ms = Date.now() - ts;
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
  }

  function ensureCards() {
    var results = document.getElementById('results');
    if (!results) return;
    if (!document.getElementById('track-card')) {
      var anchor = document.getElementById('freedom-card') || document.getElementById('hero-card');
      var card = document.createElement('div');
      card.id = 'track-card';
      card.className = 'card hidden';
      card.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Are you on track?</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Come back later, type what you still owe, and we compare it to the plan this browser saved.</p>' +
        '<div class="flex flex-wrap gap-2 items-end mb-3">' +
        '<label class="text-sm">Months since this plan' +
        '<input id="track-months" type="number" min="0" max="720" class="block mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] w-28" />' +
        '</label>' +
        '<label class="text-sm">Current total remaining' +
        '<input id="track-actual" type="number" min="0" step="1" class="block mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 min-h-[44px] w-36" />' +
        '</label>' +
        '<button type="button" id="track-run" class="px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-accent-soft text-accent">Check in</button>' +
        '</div>' +
        '<p id="track-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
        '<p class="mt-2 text-xs"><a class="underline text-accent" href="stay-on-track.html">How monthly check-ins work</a></p>';
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
      else results.appendChild(card);
    }
    if (!document.getElementById('util-card')) {
      var track = document.getElementById('track-card');
      var util = document.createElement('div');
      util.id = 'util-card';
      util.className = 'card hidden';
      util.innerHTML =
        '<h2 class="text-lg font-semibold text-accent mb-1">Credit utilization glide</h2>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Estimated revolving utilization as balances fall. Under 30% is the usual scoreboard line.</p>' +
        '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">' +
        '<div><div id="util-now" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">starting util</div></div>' +
        '<div><div id="util-30" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">month under 30%</div></div>' +
        '<div><div id="util-10" class="text-2xl font-extrabold text-accent">—</div><div class="text-[11px] text-slate-500">month under 10%</div></div>' +
        '</div>' +
        '<p id="util-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>';
      if (track && track.parentNode) track.parentNode.insertBefore(util, track.nextSibling);
    }
  }

  function bindTrack() {
    var btn = document.getElementById('track-run');
    if (!btn || btn._bound) return;
    btn._bound = true;
    btn.addEventListener('click', function () {
      var snap = loadSnapshot();
      if (!snap || !snap.history) {
        var c = document.getElementById('track-copy');
        if (c) c.textContent = 'Run a calculation first so this browser has a plan to compare against.';
        return;
      }
      var monthsEl = document.getElementById('track-months');
      var actualEl = document.getElementById('track-actual');
      var elapsed = monthsEl ? parseInt(monthsEl.value, 10) || 0 : 0;
      var actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      if (typeof PayoffEngine === 'undefined' || !PayoffEngine.checkIn) return;
      var r = PayoffEngine.checkIn(snap, { monthsElapsed: elapsed, actualTotal: actual });
      var copy = document.getElementById('track-copy');
      if (!copy) return;
      if (r.status === 'done') {
        copy.textContent = 'Balances look paid off. That is ahead of a ' + snap.months + '-month plan.';
      } else if (r.status === 'ahead') {
        copy.textContent = 'Ahead by ' + fmtMoney(r.dollarsDelta) + '. The plan expected ' + fmtMoney(r.expectedTotal) + ' still owed.';
      } else if (r.status === 'behind') {
        copy.textContent = 'Behind by ' + fmtMoney(-r.dollarsDelta) + '. Expected ' + fmtMoney(r.expectedTotal) + ' remaining after ' + elapsed + ' month(s).';
      } else {
        copy.textContent = 'On track. Expected about ' + fmtMoney(r.expectedTotal) + ' remaining.';
      }
      if (typeof window.dispatchGame === 'function') {
        window.dispatchGame('unlock', { id: 'on_track' });
      }
    });
  }

  function runUtil() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.utilizationPath) return;
    var input = inputFromUi();
    ensureCards();
    var card = document.getElementById('util-card');
    if (!input || !card) return;
    var path = PayoffEngine.utilizationPath(input);
    if (!path.cardCount) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    var now = document.getElementById('util-now');
    var u30 = document.getElementById('util-30');
    var u10 = document.getElementById('util-10');
    var copy = document.getElementById('util-copy');
    if (now) now.textContent = path.startUtil + '%';
    if (u30) u30.textContent = path.under30Month == null ? '—' : String(path.under30Month);
    if (u10) u10.textContent = path.under10Month == null ? '—' : String(path.under10Month);
    if (copy) {
      copy.textContent = path.startUtil > 30
        ? 'Name a card (or add a limit) and this plan estimates when utilization crosses 30% and 10%.'
        : 'Starting utilization is already at or under 30%.';
    }
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'util_glide' });
    }
  }

  function afterCalc() {
    ensureCards();
    bindTrack();
    var input = inputFromUi();
    if (!input || typeof PayoffEngine === 'undefined') return;
    var plan = PayoffEngine.calculate(input);
    saveSnapshot(plan, input);
    var track = document.getElementById('track-card');
    if (track) {
      track.classList.remove('hidden');
      var monthsEl = document.getElementById('track-months');
      var actualEl = document.getElementById('track-actual');
      var snap = loadSnapshot();
      if (monthsEl && (!monthsEl.value || monthsEl.value === '0')) {
        monthsEl.value = String(monthsSince(snap && snap.savedAt));
      }
      if (actualEl && !actualEl.value) {
        actualEl.value = String(Math.round(plan.startingTotal || 0));
      }
    }
    runUtil();
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._trackWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { afterCalc(); } catch (err) {}
      return out;
    };
    window.runCalc._trackWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { ensureCards(); bindTrack(); }, 0); });
  } else {
    setTimeout(function () { ensureCards(); bindTrack(); }, 0);
  }
})();
