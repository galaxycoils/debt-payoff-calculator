/**
 * Extends PayoffEngine with holidayMonths wrap, compareAprShock, comparePaymentHoliday.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE._stressExt) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }
  PE._stressExt = true;
  var origCalculate = PE.calculate;

  PE.calculate = function (input) {
    if (!input || typeof input !== 'object') return origCalculate.call(PE, input);
    var holiday = Math.max(0, parseInt(input.holidayMonths, 10) || 0);
    if (!holiday) return origCalculate.call(PE, input);
    var extra = Math.max(0, Number(input.extra) || 0);
    var flakes = (input.snowflakes || []).slice();
    if (extra > 0) {
      var cap = PE.MAX_MONTHS || 720;
      for (var m = holiday + 1; m <= cap; m++) flakes.push({ month: m, amount: extra });
    }
    return origCalculate.call(PE, Object.assign({}, input, {
      extra: 0,
      snowflakes: flakes,
      holidayMonths: 0
    }));
  };

  PE.bumpAprs = function (debts, extraApr) {
    var delta = Number(extraApr) || 0;
    return (debts || []).map(function (d) {
      var copy = {};
      for (var k in d) if (Object.prototype.hasOwnProperty.call(d, k)) copy[k] = d[k];
      copy.apr = Math.max(0, (Number(d.apr) || 0) + delta);
      if (d.regularApr != null) copy.regularApr = Math.max(0, (Number(d.regularApr) || 0) + delta);
      if (d.promoApr != null) copy.promoApr = Math.max(0, (Number(d.promoApr) || 0) + delta);
      return copy;
    });
  };

  PE.compareAprShock = function (input, extraApr) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareAprShock: debts array required');
    var delta = Math.max(0, Number(extraApr) || 0);
    var stay = PE.calculate(input);
    var shock = PE.calculate({
      debts: PE.bumpAprs(input.debts, delta),
      extra: input.extra,
      strategy: input.strategy,
      snowflakes: input.snowflakes,
      asOf: input.asOf,
      cadence: input.cadence,
      holidayMonths: input.holidayMonths
    });
    return {
      stay: stay,
      shock: shock,
      extraApr: delta,
      extraMonths: shock.months - stay.months,
      extraInterest: Math.round((shock.totalInterest - stay.totalInterest) * 100) / 100
    };
  };

  PE.comparePaymentHoliday = function (input, skipMonths) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.comparePaymentHoliday: debts array required');
    var n = Math.max(0, parseInt(skipMonths, 10) || 0);
    var stay = PE.calculate(input);
    var holiday = PE.calculate(Object.assign({}, input, { holidayMonths: n }));
    return {
      stay: stay,
      holiday: holiday,
      skipMonths: n,
      extraMonths: holiday.months - stay.months,
      extraInterest: Math.round((holiday.totalInterest - stay.totalInterest) * 100) / 100
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
