/**
 * app-hero-fix.js — patches missing hero date + summary-cards wiring
 * (renderResults historically wrote to #comparison-summary which does not exist)
 */
(function () {
  'use strict';

  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function pickPrimary(snow, aval, mode) {
    if (mode === 'compare' && snow && aval) {
      if (aval.totalInterest < snow.totalInterest) return aval;
      if (snow.totalInterest < aval.totalInterest) return snow;
      return aval.months <= snow.months ? aval : snow;
    }
    if (mode === 'avalanche') return aval || snow;
    return snow || aval;
  }

  function renderSingle(result, label, colorClass) {
    if (!result) return '';
    return (
      '<div class="card border-l-4 ' + (colorClass || 'border-indigo-500') + '">' +
      '<div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">' + label + '</div>' +
      '<div class="hero-date text-2xl md:text-3xl font-bold text-teal-700 dark:text-teal-300 tracking-tight mb-2">' + fmtDate(result.debtFreeDate) + '</div>' +
      '<div class="text-sm text-slate-600 dark:text-slate-300 space-y-1">' +
      '<div><span class="text-slate-400">Months:</span> <strong>' + result.months + '</strong></div>' +
      '<div><span class="text-slate-400">Total interest:</span> <strong>' + fmtMoney(result.totalInterest) + '</strong></div>' +
      '</div></div>'
    );
  }

  function fixHeroAndSummary() {
    var snow = window._lastSnow;
    var aval = window._lastAval;
    var mode = window._lastMode || 'compare';
    var primary = pickPrimary(snow, aval, mode);
    if (!primary) return;

    var heroDate = document.getElementById('hero-date');
    var heroSub = document.getElementById('hero-sub');
    if (heroDate) heroDate.textContent = fmtDate(primary.debtFreeDate);
    if (heroSub) {
      var label = primary.strategy === 'avalanche' ? 'Avalanche' : 'Snowball';
      if (mode === 'compare') label = 'Winning plan';
      heroSub.textContent = label + ' \u00b7 ' + primary.months + ' month' + (primary.months === 1 ? '' : 's') + ' \u00b7 ' + fmtMoney(primary.totalInterest) + ' interest';
    }

    var summary = document.getElementById('summary-cards');
    if (summary) {
      if (mode === 'compare' && snow && aval) {
        summary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-500') + renderSingle(aval, 'Avalanche', 'border-emerald-500');
      } else if (mode === 'snowball' && snow) {
        summary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-500');
      } else if (aval) {
        summary.innerHTML = renderSingle(aval, 'Avalanche', 'border-emerald-500');
      }
    }

    var banner = document.getElementById('winner-banner');
    if (banner && mode === 'compare' && snow && aval && !banner.classList.contains('hidden')) {
      var better = pickPrimary(snow, aval, 'compare');
      var worse = better === aval ? snow : aval;
      var interestSaved = Math.round((worse.totalInterest - better.totalInterest) * 100) / 100;
      var monthsSaved = worse.months - better.months;
      var wName = better.strategy === 'avalanche' ? 'Avalanche' : 'Snowball';
      if (interestSaved < 0.5 && monthsSaved === 0) {
        banner.innerHTML =
          '<div class="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Nearly a tie</div>' +
          '<p class="text-sm text-emerald-900/90 dark:text-emerald-100/90"><strong>' + wName + '</strong> edges this stack \u2014 interest and months match within a dollar. Choose the plan you will stick with.</p>';
      }
    }

    var msg = document.getElementById('progress-msg');
    var pctEl = document.getElementById('progress-pct');
    if (msg && primary.months > 12) {
      var pct = pctEl ? parseInt(pctEl.textContent, 10) || 0 : 0;
      msg.textContent = (pct === 0 ? 'Plan just started \u00b7 ' : '') + primary.months + ' months remaining until ' + fmtDate(primary.debtFreeDate) + '.';
    }

    if (typeof window.layoutCoreResults === 'function') window.layoutCoreResults();
  }

  function bind() {
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._heroFix) {
      calc._heroFix = true;
      calc.addEventListener('click', function () {
        setTimeout(fixHeroAndSummary, 30);
        setTimeout(fixHeroAndSummary, 250);
        setTimeout(fixHeroAndSummary, 600);
      });
    }
    var extra = document.getElementById('extra-slider');
    if (extra && !extra._heroFix) {
      extra._heroFix = true;
      extra.addEventListener('input', function () {
        if (window._lastResultsShown) setTimeout(fixHeroAndSummary, 40);
      });
    }
  }

  window.fixHeroAndSummary = fixHeroAndSummary;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
