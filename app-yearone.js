/**
 * Year-one wins card — snowball vs avalanche kills in the first 12 months.
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

  function nameList(names) {
    if (!names || !names.length) return 'none yet';
    return names.join(', ');
  }

  function ensureCard() {
    if (document.getElementById('yearone-card')) return document.getElementById('yearone-card');
    var anchor = document.getElementById('thirteenth-card') || document.getElementById('promo-card') || document.getElementById('hero-card');
    if (!anchor || !anchor.parentNode) return null;
    var card = document.createElement('div');
    card.id = 'yearone-card';
    card.className = 'card hidden';
    card.innerHTML =
      '<p class="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">First twelve months</p>' +
      '<h2 class="text-lg font-semibold text-accent mb-1">Who gets the early wins?</h2>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Snowball is built for quick kills. Avalanche is built for cheaper interest. This card counts debts that actually die in year one.</p>' +
      '<div class="grid grid-cols-2 gap-2 text-sm">' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Snowball wins</p><p id="yearone-snow-count" class="font-semibold text-2xl tracking-tight">—</p><p id="yearone-snow-names" class="text-xs text-slate-500 mt-1"></p></div>' +
      '<div class="rounded-2xl bg-accent-soft/50 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Avalanche wins</p><p id="yearone-aval-count" class="font-semibold text-2xl tracking-tight">—</p><p id="yearone-aval-names" class="text-xs text-slate-500 mt-1"></p></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2 text-sm mt-2">' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Year-one interest · snow</p><p id="yearone-snow-int" class="font-semibold text-sm">—</p></div>' +
      '<div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3"><p class="text-[10px] uppercase tracking-wide text-slate-400">Year-one interest · avalanche</p><p id="yearone-aval-int" class="font-semibold text-sm">—</p></div>' +
      '</div>' +
      '<p id="yearone-verdict" class="text-sm mt-4 text-slate-600 dark:text-slate-300"></p>' +
      '<p class="text-xs mt-2"><a href="year-one-debt-wins.html" class="text-accent underline">Why early wins matter</a></p>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }

  function paint(cmp) {
    if (!cmp) return;
    var sc = document.getElementById('yearone-snow-count');
    var ac = document.getElementById('yearone-aval-count');
    var sn = document.getElementById('yearone-snow-names');
    var an = document.getElementById('yearone-aval-names');
    var si = document.getElementById('yearone-snow-int');
    var ai = document.getElementById('yearone-aval-int');
    var verdict = document.getElementById('yearone-verdict');
    if (sc) sc.textContent = String(cmp.snowball.count);
    if (ac) ac.textContent = String(cmp.avalanche.count);
    if (sn) sn.textContent = nameList(cmp.snowball.names);
    if (an) an.textContent = nameList(cmp.avalanche.names);
    if (si) si.textContent = fmtMoney(cmp.snowball.interestYearOne);
    if (ai) ai.textContent = fmtMoney(cmp.avalanche.interestYearOne);
    if (verdict) {
      if (cmp.moreWinsStrategy === 'snowball' && cmp.winLead > 0) {
        verdict.textContent = 'Snowball lands ' + cmp.winLead + ' more closed account' + (cmp.winLead === 1 ? '' : 's') +
          ' in year one. Avalanche still often wins the interest column — here the year-one interest gap is ' +
          fmtMoney(Math.abs(cmp.interestGap)) + '.';
      } else if (cmp.moreWinsStrategy === 'avalanche' && cmp.winLead < 0) {
        verdict.textContent = 'Avalanche closes more accounts this year and keeps ' +
          fmtMoney(Math.abs(cmp.interestGap)) + ' more from the bank in year one.';
      } else {
        verdict.textContent = 'Same number of year-one kills. Pick avalanche if you care about the interest column (' +
          fmtMoney(Math.abs(cmp.interestGap)) + ' gap), or snowball if you want the same wins with a smaller first target.';
      }
    }
  }

  function refresh() {
    var card = ensureCard();
    if (!card) return;
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.compareYearOneWins) return;
    var input = inputFromUi();
    if (!input) return;
    var cmp = PayoffEngine.compareYearOneWins(input, 12);
    window._lastYearOne = cmp;
    card.classList.remove('hidden');
    paint(cmp);
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'year_one_wins' });
  }

  function bind() {
    ensureCard();
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._yearoneBound) {
      calc._yearoneBound = true;
      calc.addEventListener('click', function () { setTimeout(refresh, 0); });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._yearoneBound) {
      extra._yearoneBound = true;
      extra.addEventListener('input', function () {
        var results = document.getElementById('results');
        if (results && !results.classList.contains('hidden')) setTimeout(refresh, 0);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
