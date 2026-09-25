/**
 * Year-one wins — debts killed in the first 12 months.
 * Public seam: yearOneWins, compareYearOneWins
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  function cloneInput(input, strategy) {
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
      strategy: strategy || (input.strategy === 'avalanche' ? 'avalanche' : 'snowball'),
      snowflakes: (input.snowflakes || []).slice(),
      asOf: input.asOf,
      cadence: input.cadence
    };
  }

  function yearOneWins(result, horizonMonths) {
    var horizon = Math.max(1, parseInt(horizonMonths, 10) || 12);
    if (!result) {
      return { horizon: horizon, count: 0, names: [], events: [], interestYearOne: 0, remainingAfter: 0, months: 0 };
    }
    var events = (result.payoffOrder || []).filter(function (ev) {
      return (ev.month || 0) <= horizon;
    });
    var interestYearOne = (result.history || []).reduce(function (s, h) {
      if (h.month <= horizon) return s + (Number(h.interest) || 0);
      return s;
    }, 0);
    var remainingAfter = 0;
    if (result.history && result.history.length) {
      var slice = result.history.filter(function (h) { return h.month <= horizon; });
      var last = slice[slice.length - 1];
      remainingAfter = last ? Number(last.totalBalance) || 0 : 0;
      if (result.months <= horizon) remainingAfter = 0;
    }
    return {
      horizon: horizon,
      count: events.length,
      names: events.map(function (e) { return e.name; }),
      events: events,
      interestYearOne: Math.round(interestYearOne * 100) / 100,
      remainingAfter: Math.round(remainingAfter * 100) / 100,
      months: result.months || 0,
      totalInterest: result.totalInterest || 0
    };
  }

  function compareYearOneWins(input, horizonMonths) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.compareYearOneWins: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareYearOneWins: debts array required');
    }
    var horizon = Math.max(1, parseInt(horizonMonths, 10) || 12);
    var snowPlan = PayoffEngine.calculate(cloneInput(input, 'snowball'));
    var avalPlan = PayoffEngine.calculate(cloneInput(input, 'avalanche'));
    var snow = yearOneWins(snowPlan, horizon);
    var aval = yearOneWins(avalPlan, horizon);
    var winLead = snow.count - aval.count;
    var interestGap = Math.round((aval.interestYearOne - snow.interestYearOne) * 100) / 100;
    var moreWinsStrategy = winLead > 0 ? 'snowball' : winLead < 0 ? 'avalanche' : 'tie';
    var cheaperYearOne = interestGap > 0 ? 'snowball' : interestGap < 0 ? 'avalanche' : 'tie';
    return {
      horizon: horizon,
      snowball: snow,
      avalanche: aval,
      snowballPlan: snowPlan,
      avalanchePlan: avalPlan,
      winLead: winLead,
      interestGap: interestGap,
      moreWinsStrategy: moreWinsStrategy,
      cheaperYearOne: cheaperYearOne
    };
  }

  if (PayoffEngine) {
    PayoffEngine.yearOneWins = yearOneWins;
    PayoffEngine.compareYearOneWins = compareYearOneWins;
  }
  return PayoffEngine;
});
