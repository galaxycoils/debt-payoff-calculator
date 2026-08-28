/**
 * Target debt-free date solver + cash-freed timeline.
 * Uses PayoffEngine.extraNeededForDate / cashFreedTimeline.
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  function defaultTargetISO() {
    var d = new Date();
    d.setMonth(d.getMonth() + 18);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-01';
  }

  function paintCashFreed(result) {
    var card = document.getElementById('cash-freed-card');
    var list = document.getElementById('cash-freed-list');
    if (!card || !list || typeof PayoffEngine === 'undefined') return;
    var tl = PayoffEngine.cashFreedTimeline(result);
    if (!tl.length) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    list.innerHTML = '';
    tl.forEach(function (row, i) {
      var el = document.createElement('div');
      el.className = 'flex items-start justify-between gap-3 py-2 border-b border-[var(--line)] last:border-0';
      el.innerHTML =
        '<div><div class="font-medium">' + (row.name || 'Debt') + '</div>' +
        '<div class="text-xs text-slate-500 dark:text-slate-400">Month ' + row.month + ' · ' + fmtDate(row.date) + '</div></div>' +
        '<div class="text-right"><div class="font-semibold text-accent">+' + fmtMoney(row.freedMonthly) + '/mo</div>' +
        '<div class="text-xs text-slate-500 dark:text-slate-400">' + fmtMoney(row.cumulativeFreed) + ' freed total</div></div>';
      list.appendChild(el);
      if (i === tl.length - 1) {
        var last = document.getElementById('cash-freed-end');
        if (last) last.textContent = 'After the last payoff you keep ' + fmtMoney(row.cumulativeFreed) + ' every month.';
      }
    });
  }

  function solveTarget() {
    if (typeof PayoffEngine === 'undefined' || typeof getDebtsFromUI !== 'function') return;
    var debts = getDebtsFromUI();
    var out = document.getElementById('target-date-result');
    if (!debts.length) {
      if (out) out.textContent = 'Add a debt first.';
      return;
    }
    var dateEl = document.getElementById('target-date');
    var raw = dateEl && dateEl.value ? dateEl.value : defaultTargetISO();
    var target = new Date(raw + 'T00:00:00');
    var modeEl = document.getElementById('strategy');
    var mode = modeEl ? modeEl.value : 'compare';
    var strat = mode === 'avalanche' ? 'avalanche' : 'snowball';
    var snowflakes = typeof getSnowflakesFromUI === 'function' ? getSnowflakesFromUI() : [];
    var r = PayoffEngine.extraNeededForDate({
      debts: debts,
      strategy: strat,
      snowflakes: snowflakes,
      asOf: new Date()
    }, target);
    window._lastTargetSolve = r;
    if (!out) return;
    if (r.alreadyOnTrack) {
      out.innerHTML = 'You already finish by <strong>' + fmtDate(r.plan.debtFreeDate) + '</strong> on minimums. Extra needed: <strong>$0</strong>.';
    } else if (r.reachable) {
      out.innerHTML = 'To be debt-free by <strong>' + fmtDate(target) + '</strong> you need about <strong>' + fmtMoney(r.extra) + '</strong> extra per month (' + r.plan.months + ' months, ' + fmtMoney(r.plan.totalInterest) + ' interest).';
    } else {
      out.innerHTML = 'That date is tighter than one month of payments. Raise the target or add a snowflake.';
    }
    var applyBtn = document.getElementById('apply-target-extra');
    if (applyBtn) applyBtn.classList.toggle('hidden', !(r.reachable && r.extra > 0));
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'target_date' });
  }

  function applySolvedExtra() {
    var r = window._lastTargetSolve;
    var slider = document.getElementById('extra-slider');
    if (!r || !slider) return;
    var cap = parseInt(slider.max, 10) || 1000;
    var next = Math.min(cap, Math.max(0, r.extra));
    if (r.extra > cap) slider.max = String(Math.min(20000, Math.ceil(r.extra / 100) * 100));
    slider.value = String(next);
    var display = document.getElementById('extra-display');
    if (display) display.textContent = '$' + slider.value;
    if (typeof window.runCalc === 'function') window.runCalc(true);
    if (typeof showToast === 'function') showToast('Extra set to $' + slider.value);
  }

  function attach() {
    var dateEl = document.getElementById('target-date');
    if (dateEl && !dateEl.value) dateEl.value = defaultTargetISO();
    var solveBtn = document.getElementById('solve-target-date');
    if (solveBtn && !solveBtn._bound) {
      solveBtn._bound = true;
      solveBtn.addEventListener('click', solveTarget);
    }
    var applyBtn = document.getElementById('apply-target-extra');
    if (applyBtn && !applyBtn._bound) {
      applyBtn._bound = true;
      applyBtn.addEventListener('click', applySolvedExtra);
    }
    if (dateEl && !dateEl._bound) {
      dateEl._bound = true;
      dateEl.addEventListener('change', solveTarget);
    }
    var orig = window.renderResults;
    if (typeof orig === 'function' && !orig._cashPatched) {
      window.renderResults = function (snow, aval, mode) {
        orig(snow, aval, mode);
        var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
        if (primary) paintCashFreed(primary);
      };
      window.renderResults._cashPatched = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
