/**
 * Calendar framing + missed-payment shock.
 * Public seam: daysBoughtBack, missedPaymentShock
 * Turns months saved into days, weekends, and birthdays, and prices
 * a skipped minimum plus a one-time late fee on the highest-APR debt.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var DAYS_PER_MONTH = 30.437;

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function daysBoughtBack(planMonths, minimumMonths) {
    var monthsSaved = Math.max(0, (Number(minimumMonths) || 0) - (Number(planMonths) || 0));
    var days = Math.round(monthsSaved * DAYS_PER_MONTH);
    return {
      monthsSaved: monthsSaved,
      days: days,
      weekends: Math.round(days / 7),
      birthdays: Math.floor(monthsSaved / 12)
    };
  }

  function pickTarget(debts, name) {
    var open = (debts || []).filter(function (d) { return (Number(d.balance) || 0) > 0; });
    if (!open.length) return null;
    if (name) {
      for (var i = 0; i < open.length; i++) {
        if (open[i].name === name) return open[i].name;
      }
    }
    var best = open[0];
    for (var j = 1; j < open.length; j++) {
      if ((Number(open[j].apr) || 0) > (Number(best.apr) || 0)) best = open[j];
    }
    return best.name;
  }

  function withShock(debts, target, fee) {
    return (debts || []).map(function (d) {
      var copy = {
        name: d.name,
        balance: Math.max(0, Number(d.balance) || 0),
        apr: d.apr,
        minPayment: d.minPayment,
        promoMonths: d.promoMonths,
        promoApr: d.promoApr,
        regularApr: d.regularApr
      };
      if (d.name === target) copy.balance = round2(copy.balance + Math.max(0, Number(fee) || 0));
      return copy;
    });
  }

  function missedPaymentShock(calculate, debts, extra, strategy, opts) {
    var calc = calculate || (PayoffEngine && PayoffEngine.calculate);
    if (typeof calc !== 'function') throw new Error('missedPaymentShock: calculate required');
    opts = opts || {};
    var monthsMissed = Math.max(0, parseInt(opts.monthsMissed, 10) || 0);
    var fee = Math.max(0, Number(opts.fee) || 0);
    var mode = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var baseExtra = Math.max(0, Number(extra) || 0);
    var target = pickTarget(debts, opts.target);
    var baseline = calc({ debts: debts, extra: baseExtra, strategy: mode });
    var shockedDebts = withShock(debts, target, fee);
    var shocked = simulateSkip(calc, shockedDebts, baseExtra, mode, target, monthsMissed);
    return {
      target: target,
      fee: fee,
      monthsMissed: monthsMissed,
      baselineMonths: baseline.months,
      baselineInterest: baseline.totalInterest,
      shockMonths: shocked.months,
      shockInterest: shocked.totalInterest,
      monthsAdded: Math.max(0, shocked.months - baseline.months),
      interestAdded: round2(shocked.totalInterest - baseline.totalInterest)
    };
  }

  function simulateSkip(calculate, debts, extra, strategy, target, monthsMissed) {
    if (!monthsMissed) return calculate({ debts: debts, extra: extra, strategy: strategy });
    var live = debts.map(function (d) {
      return {
        name: d.name,
        balance: Math.max(0, Number(d.balance) || 0),
        apr: Math.max(0, Number(d.apr) || 0),
        minPayment: Math.max(0, Number(d.minPayment) || 0)
      };
    });
    var month = 0;
    var totalInterest = 0;
    while (live.some(function (d) { return d.balance > 0.005; }) && month < monthsMissed && month < 720) {
      month++;
      live.forEach(function (d) {
        if (d.balance <= 0) return;
        var interest = d.balance * (d.apr / 100 / 12);
        d.balance += interest;
        totalInterest += interest;
        if (d.name === target) return;
        d.balance -= Math.min(d.minPayment, d.balance);
        if (d.balance < 0.005) d.balance = 0;
      });
    }
    var rest = calculate({
      debts: live.map(function (d) {
        return { name: d.name, balance: d.balance, apr: d.apr, minPayment: d.minPayment };
      }),
      extra: extra,
      strategy: strategy
    });
    return {
      months: month + rest.months,
      totalInterest: round2(totalInterest + rest.totalInterest)
    };
  }

  if (PayoffEngine) {
    PayoffEngine.daysBoughtBack = daysBoughtBack;
    PayoffEngine.missedPaymentShock = function (debts, extra, strategy, opts) {
      return missedPaymentShock(PayoffEngine.calculate, debts, extra, strategy, opts);
    };
  }
  return { daysBoughtBack: daysBoughtBack, missedPaymentShock: missedPaymentShock };
});
