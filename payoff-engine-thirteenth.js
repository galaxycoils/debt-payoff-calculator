/**
 * 13th payment + this-month principal/interest split.
 * Public seam: monthOneSplit, compareThirteenth
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  function cloneInput(input) {
    return {
      debts: (input.debts || []).map(function (d) {
        return {
          name: d.name,
          balance: Number(d.balance) || 0,
          apr: Number(d.apr) || 0,
          minPayment: Number(d.minPayment) || 0,
          promoMonths: d.promoMonths,
          promoApr: d.promoApr,
          regularApr: d.regularApr
        };
      }),
      extra: Math.max(0, Number(input.extra) || 0),
      strategy: input.strategy === 'avalanche' ? 'avalanche' : 'snowball',
      snowflakes: (input.snowflakes || []).slice(),
      asOf: input.asOf
    };
  }

  function monthOneSplit(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.monthOneSplit: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var interest = 0;
    var mins = 0;
    var principalStart = 0;
    input.debts.forEach(function (d) {
      var bal = Math.max(0, Number(d.balance) || 0);
      var apr = Math.max(0, Number(d.apr) || 0);
      var min = Math.max(0, Number(d.minPayment) || 0);
      if (bal <= 0) return;
      principalStart += bal;
      interest += bal * (apr / 100 / 12);
      mins += min;
    });
    var payment = mins + extra;
    if (payment < 0) payment = 0;
    var afterInterest = principalStart + interest;
    if (payment > afterInterest) payment = afterInterest;
    var principalPaid = Math.max(0, payment - interest);
    var bankShare = payment > 0 ? interest / payment : 0;
    return {
      interest: Math.round(interest * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100,
      payment: Math.round(payment * 100) / 100,
      mins: Math.round(mins * 100) / 100,
      extra: extra,
      bankShare: Math.round(bankShare * 10000) / 10000,
      startingTotal: Math.round(principalStart * 100) / 100
    };
  }

  function thirteenthSnowflakes(amount, horizonMonths) {
    var amt = Math.max(0, Number(amount) || 0);
    var horizon = Math.max(1, parseInt(horizonMonths, 10) || 12);
    var out = [];
    for (var m = 12; m <= horizon + 12; m += 12) {
      out.push({ amount: amt, month: m });
    }
    return out;
  }

  function compareThirteenth(input) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.compareThirteenth: engine missing');
    }
    var baseInput = cloneInput(input);
    var baseline = PayoffEngine.calculate(baseInput);
    var mins = (input.debts || []).reduce(function (s, d) {
      return s + Math.max(0, Number(d.minPayment) || 0);
    }, 0);
    var extra = Math.max(0, Number(input.extra) || 0);
    var thirteenthAmount = Math.round((mins + extra) * 100) / 100;
    var extraFlakes = thirteenthSnowflakes(thirteenthAmount, baseline.months || 12);
    var withInput = cloneInput(input);
    withInput.snowflakes = (withInput.snowflakes || []).concat(extraFlakes);
    var with13 = PayoffEngine.calculate(withInput);
    return {
      baseline: baseline,
      withThirteenth: with13,
      thirteenthAmount: thirteenthAmount,
      monthsSaved: Math.max(0, (baseline.months || 0) - (with13.months || 0)),
      interestSaved: Math.round(((baseline.totalInterest || 0) - (with13.totalInterest || 0)) * 100) / 100,
      flakes: extraFlakes
    };
  }

  if (PayoffEngine) {
    PayoffEngine.monthOneSplit = monthOneSplit;
    PayoffEngine.compareThirteenth = compareThirteenth;
    PayoffEngine.thirteenthSnowflakes = thirteenthSnowflakes;
  }
  return PayoffEngine;
});
