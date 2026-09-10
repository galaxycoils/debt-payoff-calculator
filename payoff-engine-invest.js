/**
 * Pay extra vs invest extra — same-horizon comparison.
 * Extends PayoffEngine with futureValueAnnuity + compareInvestVsDebt.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareInvestVsDebt) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  function futureValueAnnuity(pmt, annualRate, months) {
    var p = Math.max(0, Number(pmt) || 0);
    var n = Math.max(0, parseInt(months, 10) || 0);
    var r = (Math.max(0, Number(annualRate) || 0) / 100) / 12;
    if (n === 0 || p === 0) return 0;
    if (r === 0) return Math.round(p * n * 100) / 100;
    return Math.round(p * (Math.pow(1 + r, n) - 1) / r * 100) / 100;
  }

  function weightedApr(debts) {
    var bal = 0, w = 0;
    (debts || []).forEach(function (d) {
      var b = Math.max(0, Number(d.balance) || 0);
      bal += b;
      w += b * Math.max(0, Number(d.apr) || 0);
    });
    if (bal <= 0) return 0;
    return Math.round((w / bal) * 100) / 100;
  }

  PE.futureValueAnnuity = futureValueAnnuity;

  PE.compareInvestVsDebt = function (input, expectedReturn) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareInvestVsDebt: debts array required');
    }
    var ret = Math.max(0, Number(expectedReturn) || 0);
    var extra = Math.max(0, Number(input.extra) || 0);
    var plan = PE.calculate(input);
    var mins = PE.calculate(Object.assign({}, input, { extra: 0, snowflakes: [] }));
    var interestSaved = Math.round((mins.totalInterest - plan.totalInterest) * 100) / 100;
    var monthsSaved = Math.max(0, mins.months - plan.months);
    var fvIfInvestExtra = futureValueAnnuity(extra, ret, plan.months);
    var horizon = Math.max(plan.months, mins.months);
    var afterPayoffMonths = Math.max(0, horizon - plan.months);
    var oldMins = (input.debts || []).reduce(function (s, d) {
      return s + Math.max(0, Number(d.minPayment) || 0);
    }, 0);
    var investAfterFree = futureValueAnnuity(oldMins + extra, ret, afterPayoffMonths);
    var payPathWealth = Math.round((investAfterFree) * 100) / 100;
    var investPathWealth = futureValueAnnuity(extra, ret, horizon);
    var edge = Math.round((interestSaved - fvIfInvestExtra) * 100) / 100;
    var debtWins = edge > 0;
    return {
      plan: plan,
      minimums: mins,
      extra: extra,
      expectedReturn: ret,
      weightedApr: weightedApr(input.debts),
      interestSaved: interestSaved,
      monthsSaved: monthsSaved,
      fvIfInvestExtra: fvIfInvestExtra,
      horizonMonths: horizon,
      payPathWealth: payPathWealth,
      investPathWealth: investPathWealth,
      edge: edge,
      debtWins: debtWins
    };
  };

  PE.milestoneMap = function (result) {
    if (!result || !Array.isArray(result.history) || !result.history.length) return [];
    var start = result.startingTotal || (result.history[0] ? result.history[0].totalBalance : 0);
    if (start <= 0) return [];
    var targets = [0.25, 0.5, 0.75, 1];
    var labels = { 0.25: '25% gone', 0.5: 'Halfway', 0.75: '75% gone', 1: 'Debt-free' };
    var out = [];
    var found = {};
    result.history.forEach(function (h) {
      var gone = 1 - (h.totalBalance / start);
      targets.forEach(function (t) {
        if (!found[t] && gone + 1e-9 >= t) {
          found[t] = true;
          out.push({
            pct: t * 100,
            label: labels[t],
            month: h.month,
            date: result.debtFreeDate && typeof PE.addMonths === 'function'
              ? PE.addMonths(new Date(result.debtFreeDate.getTime()), h.month - result.months)
              : h.month
          });
        }
      });
    });
    return out;
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
