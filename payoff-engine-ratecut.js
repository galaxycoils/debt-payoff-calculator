/**
 * Rate-cut daydream — what if every APR dropped by N points (autopay, rate cycle, refi tease).
 * Public seam: compareRateCut, compareAutopayDiscount
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var AUTOPAY_POINTS = 0.25;

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function cloneInput(input, points) {
    var drop = Math.max(0, Number(points) || 0);
    return {
      debts: (input.debts || []).map(function (d) {
        var apr = Math.max(0, (Number(d.apr) || 0) - drop);
        var next = {
          name: d.name,
          balance: Number(d.balance) || 0,
          apr: round2(apr),
          minPayment: Number(d.minPayment) || 0
        };
        if (d.promoMonths) next.promoMonths = d.promoMonths;
        if (d.promoApr != null) next.promoApr = round2(Math.max(0, Number(d.promoApr) - drop));
        if (d.regularApr != null) next.regularApr = round2(Math.max(0, Number(d.regularApr) - drop));
        return next;
      }),
      extra: Math.max(0, Number(input.extra) || 0),
      strategy: input.strategy === 'avalanche' ? 'avalanche' : 'snowball',
      snowflakes: (input.snowflakes || []).slice(),
      asOf: input.asOf,
      cadence: input.cadence
    };
  }

  function compareRateCut(input, points) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.compareRateCut: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareRateCut: debts array required');
    }
    var drop = Math.max(0, Number(points) || 0);
    var baselineInput = cloneInput(input, 0);
    var cutInput = cloneInput(input, drop);
    var baseline = PayoffEngine.calculate(baselineInput);
    var cut = PayoffEngine.calculate(cutInput);
    return {
      points: drop,
      baseline: baseline,
      cut: cut,
      monthsSaved: Math.max(0, baseline.months - cut.months),
      interestSaved: round2(Math.max(0, baseline.totalInterest - cut.totalInterest)),
      cutDebts: cutInput.debts
    };
  }

  function compareAutopayDiscount(input) {
    var result = compareRateCut(input, AUTOPAY_POINTS);
    result.autopay = true;
    return result;
  }

  if (PayoffEngine) {
    PayoffEngine.compareRateCut = compareRateCut;
    PayoffEngine.compareAutopayDiscount = compareAutopayDiscount;
  }
  return PayoffEngine;
});
