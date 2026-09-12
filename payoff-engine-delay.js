/**
 * PayoffEngine.compareDelay + extraStartsAtMonth wrapper.
 * Monthly extras become snowflakes starting at extraStartsAtMonth.
 */
(function (root) {
  'use strict';
  var E = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!E || typeof E.calculate !== 'function') return;

  var orig = E.calculate;
  if (!orig._delayWrapped) {
    E.calculate = function (input) {
      if (!input) return orig(input);
      var start = Math.max(1, parseInt(input.extraStartsAtMonth, 10) || 1);
      if (start <= 1) return orig(input);
      var extra = Math.max(0, Number(input.extra) || 0);
      var flakes = (input.snowflakes || []).slice();
      var cap = (E.MAX_MONTHS || 720);
      for (var m = start; m <= cap; m++) flakes.push({ amount: extra, month: m });
      return orig({
        debts: input.debts,
        extra: 0,
        strategy: input.strategy,
        snowflakes: flakes,
        asOf: input.asOf,
        cadence: input.cadence
      });
    };
    E.calculate._delayWrapped = true;
  }

  function delayCostBasket(extraInterest) {
    var cost = Math.max(0, Number(extraInterest) || 0);
    return {
      extraInterest: Math.round(cost * 100) / 100,
      coffees: Math.floor(cost / 5.5),
      groceryTrips: Math.floor(cost / 80),
      streamingYears: Math.round((cost / 16) / 12 * 10) / 10
    };
  }

  function compareDelay(input, delayMonths) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareDelay: debts array required');
    var delay = Math.max(0, parseInt(delayMonths, 10) || 0);
    var now = orig(input);
    var later = E.calculate({
      debts: input.debts,
      extra: input.extra,
      strategy: input.strategy,
      snowflakes: input.snowflakes,
      asOf: input.asOf,
      cadence: input.cadence,
      extraStartsAtMonth: delay + 1
    });
    var extraInterest = Math.round((later.totalInterest - now.totalInterest) * 100) / 100;
    var extraMonths = Math.max(0, later.months - now.months);
    return {
      now: now,
      later: later,
      delayMonths: delay,
      extraMonths: extraMonths,
      extraInterest: extraInterest,
      basket: delayCostBasket(extraInterest)
    };
  }

  E.compareDelay = compareDelay;
  E.delayCostBasket = delayCostBasket;

  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : this);
