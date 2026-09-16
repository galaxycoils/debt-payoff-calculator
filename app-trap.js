/**
 * Minimum-payment trap card — live after results.
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

  function ensureCard() {
    var results = document.getElementById('results');
    if (!results) return;
    if (document.getElementById('trap-card')) return;
    var anchor = document.getElementById('vs-minimums-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return;
    var card = document.createElement('div');
    card.id = 'trap-card';
    card.className = 'card hidden border-l-4 border-amber-500';
    card.innerHTML =
      '<h2 class="text-lg font-semibold text-accent mb-1">Minimum payment trap</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Does this month’s minimum even cover the interest?</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      '<div><div id="trap-interest" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">interest this month</div></div>' +
      '<div><div id="trap-mins" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">minimums this month</div></div>' +
      '<div><div id="trap-extra" class="text-2xl font-extrabold text-accent">$0</div><div class="text-[11px] text-slate-500">extra to stop the bleed</div></div>' +
      '</div>' +
      '<div id="trap-list" class="space-y-2 mb-3"></div>' +
      '<p id="trap-copy" class="text-sm text-slate-600 dark:text-slate-300"></p>' +
      '<button type="button" id="trap-apply" class="hidden mt-3 px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold btn-accent">Apply extra to stop the bleed</button>' +
      '<p class="mt-2 text-xs"><a class="underline text-accent" href="minimum-payment-trap.html">Why a “paid on time” card still grows</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    var apply = document.getElementById('trap-apply');
    if (apply && !apply._trapBound) {
      apply._trapBound = true;
      apply.addEventListener('click', function () {
        var needed = parseFloat(apply.getAttribute('data-extra') || '0') || 0;
        var slider = document.getElementById('extra-slider');
        if (!slider || needed <= 0) return;
        var current = parseFloat(slider.value) || 0;
        var next = Math.max(current, Math.ceil(needed / 10) * 10);
        if (parseFloat(slider.max) < next) slider.max = String(next);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof window.runCalc === 'function') window.runCalc();
      });
    }
  }

  function run() {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.inspectMinimums) return;
    if (typeof getDebtsFromUI !== 'function') return;
    ensureCard();
    var card = document.getElementById('trap-card');
    var debts = getDebtsFromUI();
    if (!card || !debts.length) return;
    var report = PayoffEngine.inspectMinimums(debts);
    card.classList.remove('hidden');
    var iEl = document.getElementById('trap-interest');
    var mEl = document.getElementById('trap-mins');
    var eEl = document.getElementById('trap-extra');
    var list = document.getElementById('trap-list');
    var copy = document.getElementById('trap-copy');
    var apply = document.getElementById('trap-apply');
    if (iEl) iEl.textContent = fmtMoney(report.monthlyInterest);
    if (mEl) mEl.textContent = fmtMoney(report.monthlyMins);
    if (eEl) eEl.textContent = fmtMoney(report.extraToStopBleed);
    if (list) {
      list.innerHTML = report.debts.map(function (row) {
        var tone = row.growing ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300';
        var tag = row.growing ? 'growing' : (row.principalToward > 0 ? 'shrinking' : 'treading water');
        return '<div class="flex justify-between gap-3 text-sm ' + tone + '">' +
          '<span>' + row.name + ' · ' + tag + '</span>' +
          '<span>' + fmtMoney(row.monthlyInterest) + ' interest / ' + fmtMoney(row.minPayment) + ' min</span>' +
          '</div>';
      }).join('');
    }
    var extra = extraFromUi();
    if (copy) {
      if (report.trapped && extra < report.extraToStopBleed) {
        copy.textContent = report.growingCount + ' debt' + (report.growingCount === 1 ? '' : 's') +
          ' still grow on the minimum. Add ' + fmtMoney(report.extraToStopBleed) +
          ' extra this month just to stop the balance from rising.';
      } else if (report.trapped && extra >= report.extraToStopBleed) {
        copy.textContent = 'Your extra covers the interest gap. Principal can start moving.';
      } else {
        copy.textContent = 'Minimums already cover interest. Extra goes straight to principal — ' +
          fmtMoney(report.stackPrincipal) + ' this month before extras.';
      }
    }
    if (apply) {
      if (report.extraToStopBleed > extra + 0.5) {
        apply.classList.remove('hidden');
        apply.setAttribute('data-extra', String(report.extraToStopBleed));
      } else {
        apply.classList.add('hidden');
      }
    }
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: 'min_trap' });
    }
  }

  var orig = window.runCalc;
  if (typeof orig === 'function' && !orig._trapWrapped) {
    window.runCalc = function () {
      var out = orig.apply(this, arguments);
      try { ensureCard(); run(); } catch (err) {}
      return out;
    };
    window.runCalc._trapWrapped = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(ensureCard, 0); });
  } else {
    setTimeout(ensureCard, 0);
  }
})();
