/**
 * Extra-payment ladder + partner chip-in.
 * Public seam: extraLadder, comparePartnerExtra
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  function extraLadder(input, steps) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.extraLadder: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.extraLadder: debts array required');
    }
    var baseExtra = Math.max(0, Number(input.extra) || 0);
    var raw = Array.isArray(steps) && steps.length
      ? steps
      : [0, baseExtra, baseExtra + 25, baseExtra + 50, baseExtra + 100, baseExtra + 200, baseExtra + 500];
    var seen = {};
    var extras = [];
    raw.forEach(function (n) {
      var e = Math.max(0, Math.round(Number(n) || 0));
      if (seen[e]) return;
      seen[e] = true;
      extras.push(e);
    });
    extras.sort(function (a, b) { return a - b; });
    var baseline = PayoffEngine.calculate(Object.assign({}, input, { extra: baseExtra }));
    var rows = extras.map(function (extra) {
      var plan = PayoffEngine.calculate(Object.assign({}, input, { extra: extra }));
      return {
        extra: extra,
        isCurrent: extra === Math.round(baseExtra),
        months: plan.months,
        totalInterest: plan.totalInterest,
        debtFreeDate: plan.debtFreeDate,
        monthsSaved: Math.max(0, baseline.months - plan.months),
        interestSaved: Math.round((baseline.totalInterest - plan.totalInterest) * 100) / 100,
        hitCap: !!plan.hitCap
      };
    });
    return { baseExtra: baseExtra, baseline: baseline, rows: rows };
  }

  function comparePartnerExtra(input, partnerAmount) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.comparePartnerExtra: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.comparePartnerExtra: debts array required');
    }
    var partner = Math.max(0, Number(partnerAmount) || 0);
    var solo = PayoffEngine.calculate(input);
    var together = PayoffEngine.calculate(Object.assign({}, input, {
      extra: Math.max(0, Number(input.extra) || 0) + partner
    }));
    return {
      partner: partner,
      solo: solo,
      together: together,
      monthsSaved: Math.max(0, solo.months - together.months),
      interestSaved: Math.round((solo.totalInterest - together.totalInterest) * 100) / 100
    };
  }

  PayoffEngine.extraLadder = extraLadder;
  PayoffEngine.comparePartnerExtra = comparePartnerExtra;
  return PayoffEngine;
});
