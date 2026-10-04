/**
 * Next-dollar curve — months and interest bought by the next bumps of extra.
 * Seam: nextDollarCurve(calculate, input, bumps)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    var api = factory();
    var host = root.PayoffEngine || (root.PayoffEngine = {});
    host.nextDollarCurve = api.nextDollarCurve;
    host.sharpestStep = api.sharpestStep;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function nextDollarCurve(calculate, input, bumps) {
    if (typeof calculate !== 'function') throw new Error('nextDollarCurve: calculate required');
    if (!input || !Array.isArray(input.debts)) throw new Error('nextDollarCurve: debts array required');
    var steps = (bumps && bumps.length) ? bumps : [0, 25, 50, 100];
    var baseExtra = Math.max(0, Number(input.extra) || 0);
    var rows = steps.map(function (bump) {
      var add = Math.max(0, Number(bump) || 0);
      var plan = calculate(Object.assign({}, input, { extra: baseExtra + add }));
      return {
        bump: add,
        extra: baseExtra + add,
        months: plan.months,
        totalInterest: plan.totalInterest
      };
    });
    var base = rows[0];
    var shaped = rows.map(function (r) {
      return {
        bump: r.bump,
        extra: r.extra,
        months: r.months,
        totalInterest: r.totalInterest,
        monthsSaved: base.months - r.months,
        interestSaved: Math.round((base.totalInterest - r.totalInterest) * 100) / 100
      };
    });
    return { baseExtra: baseExtra, rows: shaped, sharpest: sharpestStep(shaped) };
  }

  function sharpestStep(rows) {
    var best = null;
    (rows || []).forEach(function (r) {
      if (!r || r.bump <= 0) return;
      var score = r.monthsSaved / r.bump;
      if (!best || score > best.score) best = { bump: r.bump, monthsSaved: r.monthsSaved, interestSaved: r.interestSaved, score: score };
    });
    return best;
  }

  return { nextDollarCurve: nextDollarCurve, sharpestStep: sharpestStep };
});
