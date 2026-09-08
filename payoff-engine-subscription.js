/**
 * Redirect a monthly subscription into extra debt payments.
 * Public seam: PayoffEngine.compareSubscriptionCut
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareSubscriptionCut) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  PE.compareSubscriptionCut = function (input, monthlyCut) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareSubscriptionCut: debts array required');
    }
    var cut = Math.max(0, Number(monthlyCut) || 0);
    var stay = PE.calculate(input);
    var extra = Math.max(0, Number(input.extra) || 0);
    var redirected = PE.calculate(Object.assign({}, input, { extra: extra + cut }));
    return {
      stay: stay,
      redirected: redirected,
      monthlyCut: cut,
      monthsSaved: Math.max(0, stay.months - redirected.months),
      interestSaved: Math.round((stay.totalInterest - redirected.totalInterest) * 100) / 100,
      extraAfter: extra + cut
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
