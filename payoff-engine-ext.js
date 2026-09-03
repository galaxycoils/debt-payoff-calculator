/**
 * Extends PayoffEngine with holidayMonths wrap, annual raise,
 * compareAprShock, comparePaymentHoliday, compareRaise,
 * irregularSnowflakes, compareIrregularIncome, compareHourValue.
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

  PE.irregularSnowflakes = function (leanExtra, flushExtra, flushEvery, cap) {
    var lean = Math.max(0, Number(leanExtra) || 0);
    var flush = Math.max(0, Number(flushExtra) || 0);
    var every = Math.max(2, parseInt(flushEvery, 10) || 2);
    var max = Math.max(1, parseInt(cap, 10) || (PE.MAX_MONTHS || 720));
    var delta = flush - lean;
    if (Math.abs(delta) < 0.0001) return [];
    var out = [];
    for (var m = every; m <= max; m += every) {
      out.push({ month: m, amount: delta });
    }
    return out;
  };

  PE.compareIrregularIncome = function (input, opts) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareIrregularIncome: debts array required');
    opts = opts || {};
    var lean = Math.max(0, Number(opts.leanExtra != null ? opts.leanExtra : input.extra) || 0);
    var flush = Math.max(0, Number(opts.flushExtra != null ? opts.flushExtra : lean) || 0);
    var every = Math.max(2, parseInt(opts.flushEvery, 10) || 2);
    var stay = PE.calculate(Object.assign({}, input, { extra: lean }));
    var flakes = (input.snowflakes || []).concat(
      PE.irregularSnowflakes(lean, flush, every, PE.MAX_MONTHS || 720)
    );
    var irregular = PE.calculate(Object.assign({}, input, {
      extra: lean,
      snowflakes: flakes
    }));
    return {
      stay: stay,
      steady: stay,
      irregular: irregular,
      leanExtra: lean,
      flushExtra: flush,
      flushEvery: every,
      monthsSaved: stay.months - irregular.months,
      interestSaved: Math.round((stay.totalInterest - irregular.totalInterest) * 100) / 100
    };
  };

  function hoursPath(input, extraMonthly, hoursPerMonth, stay) {
    var extra = Math.max(0, Number(input.extra) || 0) + extraMonthly;
    var plan = PE.calculate(Object.assign({}, input, { extra: extra }));
    var hours = Math.max(0, Number(hoursPerMonth) || 0);
    var monthsSaved = stay.months - plan.months;
    var interestSaved = Math.round((stay.totalInterest - plan.totalInterest) * 100) / 100;
    var totalHours = hours * plan.months;
    var interestSavedPerHour = totalHours > 0
      ? Math.round((interestSaved / totalHours) * 100) / 100
      : 0;
    var monthsSavedPerHour = totalHours > 0
      ? Math.round((monthsSaved / totalHours) * 1000) / 1000
      : 0;
    return {
      extraMonthly: extraMonthly,
      hoursPerMonth: hours,
      plan: plan,
      monthsSaved: monthsSaved,
      interestSaved: interestSaved,
      interestSavedPerHour: interestSavedPerHour,
      monthsSavedPerHour: monthsSavedPerHour
    };
  }

  PE.compareHourValue = function (input, opts) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareHourValue: debts array required');
    opts = opts || {};
    var otRate = Math.max(0, Number(opts.overtimeRate) || 0);
    var otHours = Math.max(0, Number(opts.overtimeHours) || 0);
    var huRate = Math.max(0, Number(opts.hustleRate) || 0);
    var huHours = Math.max(0, Number(opts.hustleHours) || 0);
    var stay = PE.calculate(input);
    var overtime = hoursPath(input, Math.round(otRate * otHours * 100) / 100, otHours, stay);
    var hustle = hoursPath(input, Math.round(huRate * huHours * 100) / 100, huHours, stay);
    var winner = 'stay';
    if (overtime.extraMonthly <= 0 && hustle.extraMonthly <= 0) {
      winner = 'stay';
    } else if (overtime.interestSavedPerHour > hustle.interestSavedPerHour) {
      winner = 'overtime';
    } else if (hustle.interestSavedPerHour > overtime.interestSavedPerHour) {
      winner = 'hustle';
    } else if (overtime.monthsSavedPerHour > hustle.monthsSavedPerHour) {
      winner = 'overtime';
    } else if (hustle.monthsSavedPerHour > overtime.monthsSavedPerHour) {
      winner = 'hustle';
    } else if (overtime.extraMonthly > 0 && hustle.extraMonthly > 0) {
      winner = 'tie';
    } else if (overtime.extraMonthly > 0) {
      winner = 'overtime';
    } else if (hustle.extraMonthly > 0) {
      winner = 'hustle';
    }
    return {
      stay: stay,
      overtime: overtime,
      hustle: hustle,
      winner: winner,
      overtimeRate: otRate,
      overtimeHours: otHours,
      hustleRate: huRate,
      hustleHours: huHours
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
