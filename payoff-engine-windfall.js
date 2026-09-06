/**
 * Windfall allocator on PayoffEngine: windfallFlakes + compareWindfall.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareWindfall) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  PE.windfallFlakes = function (amount, months, startMonth) {
    var amt = Math.max(0, Number(amount) || 0);
    var n = Math.max(1, parseInt(months, 10) || 1);
    var start = Math.max(1, parseInt(startMonth, 10) || 1);
    if (amt <= 0) return [];
    var each = Math.floor((amt / n) * 100) / 100;
    var out = [];
    var allocated = 0;
    for (var i = 0; i < n; i++) {
      var piece = (i === n - 1) ? Math.round((amt - allocated) * 100) / 100 : each;
      allocated += piece;
      if (piece > 0) out.push({ month: start + i, amount: piece });
    }
    return out;
  };

  PE.compareWindfall = function (input, opts) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareWindfall: debts array required');
    opts = opts || {};
    var amount = Math.max(0, Number(opts.amount) || 0);
    var dripMonths = Math.max(1, parseInt(opts.dripMonths, 10) || 3);
    var stay = PE.calculate(input);
    var baseFlakes = input.snowflakes || [];
    var nowPlan = PE.calculate(Object.assign({}, input, {
      snowflakes: baseFlakes.concat(amount > 0 ? [{ month: 1, amount: amount }] : [])
    }));
    var dripFlakes = PE.windfallFlakes(amount, dripMonths, 1);
    var dripPlan = PE.calculate(Object.assign({}, input, {
      snowflakes: baseFlakes.concat(dripFlakes)
    }));
    function pack(plan) {
      return {
        plan: plan,
        monthsSaved: stay.months - plan.months,
        interestSaved: Math.round((stay.totalInterest - plan.totalInterest) * 100) / 100
      };
    }
    var now = pack(nowPlan);
    var drip = pack(dripPlan);
    var winner = 'stay';
    if (amount > 0) {
      if (now.interestSaved > drip.interestSaved) winner = 'now';
      else if (drip.interestSaved > now.interestSaved) winner = 'drip';
      else if (now.monthsSaved > drip.monthsSaved) winner = 'now';
      else if (drip.monthsSaved > now.monthsSaved) winner = 'drip';
      else if (now.monthsSaved > 0 || drip.monthsSaved > 0) winner = 'now';
    }
    return {
      stay: stay,
      now: now,
      drip: drip,
      amount: amount,
      dripMonths: dripMonths,
      winner: winner
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
