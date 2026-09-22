/**
 * Cash-flow first (highest minimum payment first) vs snowball / avalanche.
 * Public seam: calculateCashflowFirst, compareCashflowFirst
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var MAX_MONTHS = (PayoffEngine && PayoffEngine.MAX_MONTHS) || 720;
  var EPS = 0.005;

  function addMonths(date, months) {
    if (PayoffEngine && typeof PayoffEngine.addMonths === 'function') return PayoffEngine.addMonths(date, months);
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function currentApr(debt, month) {
    if (PayoffEngine && typeof PayoffEngine.currentApr === 'function') return PayoffEngine.currentApr(debt, month);
    return debt.apr;
  }

  function cloneDebts(input) {
    return input.debts.map(function (d) {
      return {
        name: (d.name && String(d.name).trim()) || 'Debt',
        balance: Math.max(0, Number(d.balance) || 0),
        apr: Math.max(0, Number(d.apr) || 0),
        promoMonths: Math.max(0, parseInt(d.promoMonths, 10) || 0),
        promoApr: d.promoApr == null ? null : Math.max(0, Number(d.promoApr) || 0),
        regularApr: d.regularApr == null ? null : Math.max(0, Number(d.regularApr) || 0),
        minPayment: Math.max(0, Number(d.minPayment) || 0),
        paidOffMonth: null
      };
    }).filter(function (d) { return d.balance > 0; });
  }

  function calculateCashflowFirst(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculateCashflowFirst: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var snowflakes = (input.snowflakes || [])
      .map(function (f) {
        return { amount: Math.max(0, Number(f.amount) || 0), month: Math.max(0, parseInt(f.month, 10) || 0) };
      })
      .filter(function (f) { return f.amount > 0 && f.month > 0; });

    var debts = cloneDebts(input);
    debts.sort(function (a, b) { return b.minPayment - a.minPayment || a.balance - b.balance; });

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, payoffOrder = [];
    if (startingTotal <= 0) {
      return { months: 0, totalInterest: 0, payoffOrder: [], debtFreeDate: asOf, startingTotal: 0, strategy: 'cashflow' };
    }

    while (debts.some(function (d) { return d.balance > EPS; }) && month < MAX_MONTHS) {
      month++;
      var remainingExtra = extra;
      snowflakes.forEach(function (f) { if (f.month === month) remainingExtra += f.amount; });

      debts.forEach(function (d) {
        if (d.balance > 0) {
          var interest = d.balance * (currentApr(d, month) / 100 / 12);
          d.balance += interest;
          totalInterest += interest;
        }
      });
      debts.forEach(function (d) {
        if (d.balance > 0) d.balance -= Math.min(d.minPayment, d.balance);
      });
      for (var i = 0; i < debts.length && remainingExtra > EPS; i++) {
        if (debts[i].balance > EPS) {
          var p = Math.min(remainingExtra, debts[i].balance);
          debts[i].balance -= p;
          remainingExtra -= p;
        }
      }
      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({ name: d.name, month: month, date: addMonths(asOf, month), minPayment: d.minPayment });
          }
          d.balance = 0;
        }
      });
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      startingTotal: startingTotal,
      strategy: 'cashflow',
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; })
    };
  }

  function firstKill(result) {
    if (!result || !result.payoffOrder || !result.payoffOrder.length) {
      return { month: result ? result.months : 0, freedMonthly: 0, name: null };
    }
    var ev = result.payoffOrder[0];
    return { month: ev.month, freedMonthly: Math.max(0, Number(ev.minPayment) || 0), name: ev.name };
  }

  function monthsUntilFreed(result, targetMonthly) {
    var want = Math.max(0, Number(targetMonthly) || 0);
    if (!result || !result.payoffOrder) return result ? result.months : 0;
    var sum = 0;
    for (var i = 0; i < result.payoffOrder.length; i++) {
      sum += Math.max(0, Number(result.payoffOrder[i].minPayment) || 0);
      if (sum + 1e-9 >= want) return result.payoffOrder[i].month;
    }
    return result.months;
  }

  function compareCashflowFirst(input) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.compareCashflowFirst: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareCashflowFirst: debts array required');
    }
    var snow = PayoffEngine.calculate(Object.assign({}, input, { strategy: 'snowball' }));
    var aval = PayoffEngine.calculate(Object.assign({}, input, { strategy: 'avalanche' }));
    var cash = calculateCashflowFirst(input);
    var plans = [
      { key: 'snowball', label: 'Snowball', plan: snow },
      { key: 'avalanche', label: 'Avalanche', plan: aval },
      { key: 'cashflow', label: 'Highest min', plan: cash }
    ];
    var fastest = plans.slice().sort(function (a, b) {
      if (a.plan.months !== b.plan.months) return a.plan.months - b.plan.months;
      return a.plan.totalInterest - b.plan.totalInterest;
    })[0];
    var cashFirst = firstKill(cash);
    var snowFirst = firstKill(snow);
    var avalFirst = firstKill(aval);
    var firstCashWins = cashFirst.month < snowFirst.month && cashFirst.month < avalFirst.month;
    return {
      snowball: snow,
      avalanche: aval,
      cashflow: cash,
      fastestKey: fastest.key,
      firstKillCashflow: cashFirst,
      firstKillSnowball: snowFirst,
      firstKillAvalanche: avalFirst,
      firstCashWins: firstCashWins,
      monthsToFree100: monthsUntilFreed(cash, 100),
      monthsSavedVsSnowball: snow.months - cash.months,
      interestDeltaVsAvalanche: Math.round((cash.totalInterest - aval.totalInterest) * 100) / 100
    };
  }

  PayoffEngine.calculateCashflowFirst = calculateCashflowFirst;
  PayoffEngine.compareCashflowFirst = compareCashflowFirst;
  PayoffEngine.monthsUntilFreed = monthsUntilFreed;
  return PayoffEngine;
});
