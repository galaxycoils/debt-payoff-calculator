/**
 * Payoff velocity — marginal months and interest saved per $100 extra.
 * Pure function; depends on PayoffEngine.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else root.PayoffVelocity = factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  function calculateVelocity(debts, extra, strategy) {
    if (!Array.isArray(debts) || debts.length === 0) {
      return { monthsPer100: 0, interestPer100: 0, baseMonths: 0, baseInterest: 0 };
    }
    var base = Math.max(0, Number(extra) || 0);
    var strat = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var basePlan = PayoffEngine.calculate({ debts: debts, extra: base, strategy: strat });
    var plusPlan = PayoffEngine.calculate({ debts: debts, extra: base + 100, strategy: strat });
    var monthsSaved = Math.max(0, basePlan.months - plusPlan.months);
    var interestSaved = Math.max(0, basePlan.totalInterest - plusPlan.totalInterest);
    return {
      monthsPer100: monthsSaved,
      interestPer100: Math.round(interestSaved),
      baseMonths: basePlan.months,
      baseInterest: Math.round(basePlan.totalInterest)
    };
  }

  return { calculateVelocity: calculateVelocity };
});
