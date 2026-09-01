/**
 * Extends PayoffEngine with holidayMonths wrap, annual raise,
 * compareAprShock, comparePaymentHoliday, compareRaise.
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

  function raiseDeltas(extra, pct, cap) {
    var out = [];
    var e = Math.max(0, Number(extra) || 0);
    var p = Math.max(0, Number(pct) || 0);
    if (!e || !p) return out;
    for (var m = 13; m <= cap; m++) {
      var years = Math.floor((m - 1) / 12);
      var live = e * Math.pow(1 + p / 100, years);
      var delta = live - e;
      if (delta > 0.0001) out.push({ month: m, amount: delta });
    }
    return out;
  }

  PE.calculate = function (input) {
    if (!input || typeof input !== 'object') return origCalculate.call(PE, input);
    var raisePct = Math.max(0, Number(input.annualRaisePercent) || 0);
    var extra = Math.max(0, Number(input.extra) || 0);
    var flakes = (input.snowflakes || []).slice();
    if (raisePct > 0 && extra > 0) {
      flakes = flakes.concat(raiseDeltas(extra, raisePct, PE.MAX_MONTHS || 720));
    }
    var holiday = Math.max(0, parseInt(input.holidayMonths, 10) || 0);
    if (!holiday && raisePct <= 0) return origCalculate.call(PE, input);
    if (!holiday) {
      return origCalculate.call(PE, Object.assign({}, input, {
        snowflakes: flakes,
        annualRaisePercent: 0
      }));
    }
    if (extra > 0) {
      var cap = PE.MAX_MONTHS || 720;
      for (var m = holiday + 1; m <= cap; m++) flakes.push({ month: m, amount: extra });
    }
    return origCalculate.call(PE, Object.assign({}, input, {
      extra: 0,
      snowflakes: flakes,
      holidayMonths: 0,
      annualRaisePercent: 0
    }));
  };

  PE.compareRaise = function (input, raisePercent) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareRaise: debts array required');
    var pct = Math.max(0, Number(raisePercent) || 0);
    var stay = PE.calculate(Object.assign({}, input, { annualRaisePercent: 0 }));
    var raised = PE.calculate(Object.assign({}, input, { annualRaisePercent: pct }));
    return {
      stay: stay,
      raised: raised,
      raisePercent: pct,
      monthsSaved: Math.max(0, stay.months - raised.months),
      interestSaved: Math.round((stay.totalInterest - raised.totalInterest) * 100) / 100
    };
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
      holidayMonths: input.holidayMonths,
      annualRaisePercent: input.annualRaisePercent
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
