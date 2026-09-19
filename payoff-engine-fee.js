/**
 * PayoffEngine.calculateWithAnnualFee / compareAnnualFee
 * Charges an annual fee onto every still-open debt on months 12, 24, 36…
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

  function sortDebts(debts, strategy) {
    if (strategy === 'avalanche') {
      debts.sort(function (a, b) { return b.apr - a.apr || a.balance - b.balance; });
    } else {
      debts.sort(function (a, b) { return a.balance - b.balance || b.apr - a.apr; });
    }
  }

  function money(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function calculateWithAnnualFee(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculateWithAnnualFee: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var fee = Math.max(0, Number(input.annualFee) || 0);
    var strategy = input.strategy === 'avalanche' ? 'avalanche' : 'snowball';
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
      var ownFee = d.annualFee == null ? fee : Math.max(0, Number(d.annualFee) || 0);
      return {
        name: (d.name && String(d.name).trim()) || 'Debt',
        balance: Math.max(0, Number(d.balance) || 0),
        apr: Math.max(0, Number(d.apr) || 0),
        promoMonths: Math.max(0, parseInt(d.promoMonths, 10) || 0),
        promoApr: d.promoApr == null ? null : Math.max(0, Number(d.promoApr) || 0),
        regularApr: d.regularApr == null ? null : Math.max(0, Number(d.regularApr) || 0),
        minPayment: Math.max(0, Number(d.minPayment) || 0),
        annualFee: ownFee,
        paidOffMonth: null,
        feesCharged: 0
      };
    }).filter(function (d) { return d.balance > 0; });

    sortDebts(debts, strategy);

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, totalFees = 0, history = [], payoffOrder = [];

    if (startingTotal <= 0) {
      return {
        months: 0, totalInterest: 0, totalFees: 0, feesCharged: 0,
        history: [], payoffOrder: [], debtFreeDate: asOf,
        strategy: strategy, startingTotal: 0, annualFee: fee
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

      if (month % 12 === 0) {
        debts.forEach(function (d) {
          if (d.balance > EPS && d.annualFee > 0) {
            d.balance += d.annualFee;
            d.feesCharged += d.annualFee;
            totalFees += d.annualFee;
          }
        });
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
      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({
              name: d.name, month: month,
              date: addMonths(asOf, month), minPayment: d.minPayment,
              feesCharged: money(d.feesCharged)
            });
          }
          d.balance = 0;
        }
      });
      var totalBal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
      history.push({
        month: month,
        totalBalance: money(totalBal),
        interest: money(monthInterest),
        feesToDate: money(totalFees)
      });
      if (totalBal < 0.01) break;
    }

    return {
      months: month,
      totalInterest: money(totalInterest),
      totalFees: money(totalFees),
      feesCharged: money(totalFees),
      history: history,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      strategy: strategy,
      startingTotal: startingTotal,
      annualFee: fee,
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; })
    };
  }

  function compareAnnualFee(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareAnnualFee: debts array required');
    }
    var fee = Math.max(0, Number(input.annualFee) || 0);
    var clean = E.calculate(Object.assign({}, input, { annualFee: 0 }));
    var withFee = calculateWithAnnualFee(input);
    return {
      withoutFees: clean,
      withFees: withFee,
      extraMonths: withFee.months - clean.months,
      extraInterest: money(withFee.totalInterest - clean.totalInterest),
      feesPaid: withFee.totalFees,
      totalDrag: money(withFee.totalInterest - clean.totalInterest + withFee.totalFees),
      annualFee: fee
    };
  }

  E.calculateWithAnnualFee = calculateWithAnnualFee;
  E.compareAnnualFee = compareAnnualFee;

  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : this);
