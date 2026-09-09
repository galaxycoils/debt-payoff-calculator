/**
 * Emergency-fund vs extra-payment + daily-leak compare.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareEmergencyFund) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  function growSavings(monthly, apy, months) {
    var pmt = Math.max(0, Number(monthly) || 0);
    var r = (Math.max(0, Number(apy) || 0) / 100) / 12;
    var n = Math.max(0, parseInt(months, 10) || 0);
    var bal = 0;
    for (var i = 0; i < n; i++) {
      bal = (bal + pmt) * (1 + r);
    }
    return Math.round(bal * 100) / 100;
  }

  PE.dailyToMonthly = function (daily) {
    var d = Math.max(0, Number(daily) || 0);
    return Math.round(d * 30.437 * 100) / 100;
  };

  PE.compareDailyLeak = function (input, dailySpend) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareDailyLeak: debts array required');
    var daily = Math.max(0, Number(dailySpend) || 0);
    var monthly = PE.dailyToMonthly(daily);
    var stay = PE.calculate(input);
    var extra = Math.max(0, Number(input.extra) || 0) + monthly;
    var redirected = PE.calculate(Object.assign({}, input, { extra: extra }));
    return {
      stay: stay,
      redirected: redirected,
      dailySpend: daily,
      monthlyCut: monthly,
      extraAfter: extra,
      monthsSaved: Math.max(0, stay.months - redirected.months),
      interestSaved: Math.round((stay.totalInterest - redirected.totalInterest) * 100) / 100
    };
  };

  PE.compareEmergencyFund = function (input, opts) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareEmergencyFund: debts array required');
    opts = opts || {};
    var monthly = Math.max(0, Number(opts.monthlyCushion) || 0);
    var apy = Math.max(0, Number(opts.apy) || 0);
    var stayExtra = Math.max(0, Number(input.extra) || 0);
    var stay = PE.calculate(input);
    var diverted = Math.min(monthly, stayExtra);
    var cushionExtra = Math.max(0, stayExtra - diverted);
    var cushion = PE.calculate(Object.assign({}, input, { extra: cushionExtra }));
    var monthsDelayed = Math.max(0, cushion.months - stay.months);
    var extraInterest = Math.round((cushion.totalInterest - stay.totalInterest) * 100) / 100;
    var savingsBalance = growSavings(diverted, apy, cushion.months);
    var contributions = Math.round(diverted * cushion.months * 100) / 100;
    var savingsInterest = Math.round((savingsBalance - contributions) * 100) / 100;
    var netCost = Math.round((extraInterest - savingsInterest) * 100) / 100;
    return {
      stay: stay,
      cushion: cushion,
      monthlyCushion: diverted,
      requestedCushion: monthly,
      apy: apy,
      extraAfter: cushionExtra,
      monthsDelayed: monthsDelayed,
      extraInterest: extraInterest,
      savingsBalance: savingsBalance,
      savingsInterest: savingsInterest,
      netCost: netCost,
      debtWins: netCost > 0
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
