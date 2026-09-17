/**
 * Paycheck-share extra — convert % of take-home into extra principal.
 * Extends PayoffEngine.comparePaycheckShare.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.comparePaycheckShare) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  function money(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  PE.comparePaycheckShare = function (input, opts) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.comparePaycheckShare: debts array required');
    }
    opts = opts || {};
    var takeHome = Math.max(0, Number(opts.takeHome) || 0);
    var pct = Math.max(0, Math.min(50, Number(opts.percent) || 0));
    var currentExtra = Math.max(0, Number(input.extra) || 0);
    var mins = input.debts.reduce(function (s, d) {
      return s + Math.max(0, Number(d.minPayment) || 0);
    }, 0);
    var extraFromShare = money(takeHome * (pct / 100));
    var leftover = money(takeHome - mins - extraFromShare);
    var current = PE.calculate(input);
    var sharePlan = PE.calculate({
      debts: input.debts,
      extra: extraFromShare,
      strategy: input.strategy,
      snowflakes: input.snowflakes,
      asOf: input.asOf,
      cadence: input.cadence
    });
    var monthsSaved = current.months - sharePlan.months;
    var interestSaved = money(current.totalInterest - sharePlan.totalInterest);
    return {
      takeHome: money(takeHome),
      percent: pct,
      extraFromShare: extraFromShare,
      monthlyMins: money(mins),
      leftover: leftover,
      leftoverTight: leftover < 0,
      current: current,
      sharePlan: sharePlan,
      monthsSaved: monthsSaved,
      interestSaved: interestSaved,
      moreAggressive: extraFromShare > currentExtra + 0.005
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
