/**
 * PayoffEngine.calculateHybrid / compareHybrid
 * Snowball until the first debt dies, then avalanche the rest.
 */
(function (root) {
  'use strict';
  var E = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!E || typeof E.calculate !== 'function') return;

  var MAX_MONTHS = E.MAX_MONTHS || 720;
  var EPS = 0.005;

  function currentApr(debt, month) {
    if (typeof E.currentApr === 'function') return E.currentApr(debt, month);
    return debt.apr;
  }

  function addMonths(date, months) {
    if (typeof E.addMonths === 'function') return E.addMonths(date, months);
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function sortSnowball(debts) {
    debts.sort(function (a, b) { return a.balance - b.balance || b.apr - a.apr; });
  }
  function sortAvalanche(debts) {
    debts.sort(function (a, b) { return b.apr - a.apr || a.balance - b.balance; });
  }

  function calculateHybrid(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculateHybrid: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var cadence = input.cadence === 'biweekly' ? 'biweekly' : 'monthly';
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var snowflakes = (input.snowflakes || [])
      .map(function (f) {
        return {
          amount: Math.max(0, Number(f.amount) || 0),
          month: Math.max(0, parseInt(f.month, 10) || 0)
        };
      })
      .filter(function (f) { return f.amount > 0 && f.month > 0; });

    var debts = input.debts.map(function (d) {
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

    sortSnowball(debts);

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, history = [], payoffOrder = [];
    var switched = false;
    var switchMonth = null;
    var firstKill = null;

    if (startingTotal <= 0) {
      return {
        months: 0, totalInterest: 0, history: [], payoffOrder: [],
        debtFreeDate: asOf, strategy: 'hybrid', startingTotal: 0,
        cadence: cadence, switched: false, switchMonth: null, firstKill: null
      };
    }

    while (debts.some(function (d) { return d.balance > EPS; }) && month < MAX_MONTHS) {
      month++;
      var remainingExtra = extra;
      for (var fi = 0; fi < snowflakes.length; fi++) {
        if (snowflakes[fi].month === month) remainingExtra += snowflakes[fi].amount;
      }
      if (cadence === 'biweekly') {
        var liveMins = 0;
        debts.forEach(function (d) { if (d.balance > EPS) liveMins += d.minPayment; });
        remainingExtra += (liveMins + extra) / 12;
      }
      var monthInterest = 0;
      debts.forEach(function (d) {
        if (d.balance > 0) {
          var interest = d.balance * (currentApr(d, month) / 100 / 12);
          d.balance += interest;
          monthInterest += interest;
          totalInterest += interest;
        }
      });
      debts.forEach(function (d) {
        if (d.balance > 0) d.balance -= Math.min(d.minPayment, d.balance);
      });
      for (var i = 0; i < debts.length; i++) {
        var d = debts[i];
        if (d.balance > EPS && remainingExtra > 0) {
          var p = Math.min(remainingExtra, d.balance);
          d.balance -= p;
          remainingExtra -= p;
        }
      }
      var justKilled = false;
      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({
              name: d.name, month: month,
              date: addMonths(asOf, month), minPayment: d.minPayment
            });
            if (!firstKill) firstKill = d.name;
            justKilled = true;
          }
          d.balance = 0;
        }
      });
      if (justKilled && !switched && debts.some(function (d) { return d.balance > EPS; })) {
        sortAvalanche(debts);
        switched = true;
        switchMonth = month;
      }
      var totalBal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
      history.push({
        month: month,
        totalBalance: Math.round(totalBal * 100) / 100,
        interest: Math.round(monthInterest * 100) / 100
      });
      if (totalBal < 0.01) break;
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      history: history,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      strategy: 'hybrid',
      startingTotal: startingTotal,
      cadence: cadence,
      switched: switched,
      switchMonth: switchMonth,
      firstKill: firstKill,
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; })
    };
  }

  function money(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function compareHybrid(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareHybrid: debts array required');
    }
    var snow = E.calculate(Object.assign({}, input, { strategy: 'snowball' }));
    var aval = E.calculate(Object.assign({}, input, { strategy: 'avalanche' }));
    var hybrid = calculateHybrid(input);
    return {
      snowball: snow,
      avalanche: aval,
      hybrid: hybrid,
      vsSnowballMonths: snow.months - hybrid.months,
      vsSnowballInterest: money(snow.totalInterest - hybrid.totalInterest),
      vsAvalancheMonths: aval.months - hybrid.months,
      vsAvalancheInterest: money(aval.totalInterest - hybrid.totalInterest),
      closestToAvalanche: Math.abs(hybrid.totalInterest - aval.totalInterest) <= Math.abs(hybrid.totalInterest - snow.totalInterest)
    };
  }

  E.calculateHybrid = calculateHybrid;
  E.compareHybrid = compareHybrid;

  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : this);
