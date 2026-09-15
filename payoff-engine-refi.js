/**
 * Refinance / rate-cut compare — stay at current APRs vs roll selected
 * debts into a lower APR after a closing fee (percent + flat).
 * Extends PayoffEngine.compareRefinance.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareRefinance) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  PE.compareRefinance = function (input, offer) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareRefinance: debts array required');
    }
    offer = offer || {};
    var stay = PE.calculate(input);
    var newApr = offer.apr == null ? 8 : Math.max(0, Number(offer.apr) || 0);
    var feePercent = Math.max(0, Number(offer.feePercent) || 0);
    var feeFlat = Math.max(0, Number(offer.feeFlat) || 0);
    var names = offer.names;
    var feePaid = 0;
    var rolledBal = 0;
    var rolledMin = 0;
    var leftover = [];

    input.debts.forEach(function (d) {
      var match = !names || !names.length || names.indexOf(d.name) !== -1;
      var bal = Math.max(0, Number(d.balance) || 0);
      var minP = Math.max(0, Number(d.minPayment) || 0);
      if (!match || bal <= 0) {
        leftover.push(d);
        return;
      }
      rolledBal += bal;
      rolledMin += minP;
    });

    var fee = Math.round((rolledBal * (feePercent / 100) + feeFlat) * 100) / 100;
    feePaid = fee;
    var newBal = Math.round((rolledBal + fee) * 100) / 100;
    var refiDebts = leftover.slice();
    if (newBal > 0) {
      refiDebts.push({
        name: offer.name || 'Refinanced',
        balance: newBal,
        apr: newApr,
        minPayment: Math.max(rolledMin, offer.minPayment == null ? 0 : Number(offer.minPayment) || 0)
      });
    }

    var refi = PE.calculate({
      debts: refiDebts,
      extra: input.extra,
      strategy: input.strategy,
      snowflakes: input.snowflakes,
      asOf: input.asOf,
      cadence: input.cadence
    });

    var monthsSaved = stay.months - refi.months;
    var interestSaved = Math.round((stay.totalInterest - refi.totalInterest) * 100) / 100;
    var net = Math.round((interestSaved - feePaid) * 100) / 100;
    return {
      stay: stay,
      refinance: refi,
      feePaid: feePaid,
      newBalance: newBal,
      newApr: newApr,
      monthsSaved: monthsSaved,
      interestSaved: interestSaved,
      netSaved: net,
      worthIt: net > 0
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
