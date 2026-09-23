/**
 * Promo-cliff hunter: aim extra at 0%/intro-APR debts before the rate resets.
 * Public seam: calculatePromoFirst, comparePromoCliff
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
    if (debt.promoMonths > 0) {
      if (month <= debt.promoMonths) return debt.promoApr == null ? debt.apr : debt.promoApr;
      return debt.regularApr == null ? debt.apr : debt.regularApr;
    }
    return debt.apr;
  }

  function regularRate(d) {
    if (d.regularApr != null) return d.regularApr;
    return d.apr;
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

  function promoSort(a, b) {
    var aPromo = a.promoMonths > 0 ? 1 : 0;
    var bPromo = b.promoMonths > 0 ? 1 : 0;
    if (aPromo !== bPromo) return bPromo - aPromo;
    if (aPromo && a.promoMonths !== b.promoMonths) return a.promoMonths - b.promoMonths;
    return regularRate(b) - regularRate(a) || a.balance - b.balance;
  }

  function calculatePromoFirst(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculatePromoFirst: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var snowflakes = (input.snowflakes || [])
      .map(function (f) {
        return { amount: Math.max(0, Number(f.amount) || 0), month: Math.max(0, parseInt(f.month, 10) || 0) };
      })
      .filter(function (f) { return f.amount > 0 && f.month > 0; });

    var debts = cloneDebts(input);
    debts.sort(promoSort);

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, payoffOrder = [];
    var cliffs = debts.filter(function (d) { return d.promoMonths > 0; }).map(function (d) {
      return { name: d.name, promoMonths: d.promoMonths, startingBalance: d.balance, paidBeforeCliff: false, leftoverAtCliff: null };
    });

    if (startingTotal <= 0) {
      return {
        months: 0, totalInterest: 0, payoffOrder: [], debtFreeDate: asOf, startingTotal: 0,
        strategy: 'promo', cliffs: [], promoCount: 0, allClearedBeforeCliff: true
      };
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
      });
      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({ name: d.name, month: month, date: addMonths(asOf, month), minPayment: d.minPayment });
          }
          d.balance = 0;
        }
      });
      cliffs.forEach(function (c) {
        if (c.leftoverAtCliff != null) return;
        if (month === c.promoMonths) {
          var live = debts.filter(function (d) { return d.name === c.name; })[0];
          c.leftoverAtCliff = live ? Math.round(live.balance * 100) / 100 : 0;
          c.paidBeforeCliff = c.leftoverAtCliff <= EPS;
        }
      });
    }

    var allCleared = cliffs.length === 0 || cliffs.every(function (c) { return c.paidBeforeCliff; });
    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      startingTotal: startingTotal,
      strategy: 'promo',
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; }),
      cliffs: cliffs,
      promoCount: cliffs.length,
      allClearedBeforeCliff: allCleared
    };
  }

  function extraToClearPromo(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.extraToClearPromo: debts array required');
    }
    var promo = input.debts.filter(function (d) {
      return (parseInt(d.promoMonths, 10) || 0) > 0 && (Number(d.balance) || 0) > 0;
    });
    if (!promo.length) return { extra: 0, needed: false };
    var lo = 0, hi = 20000, best = hi;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      var r = calculatePromoFirst(Object.assign({}, input, { extra: mid }));
      if (r.allClearedBeforeCliff) { best = mid; hi = mid; }
      else lo = mid;
    }
    return { extra: Math.ceil(best), needed: true };
  }

  function comparePromoCliff(input) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.comparePromoCliff: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.comparePromoCliff: debts array required');
    }
    var snow = PayoffEngine.calculate(Object.assign({}, input, { strategy: 'snowball' }));
    var aval = PayoffEngine.calculate(Object.assign({}, input, { strategy: 'avalanche' }));
    var promo = calculatePromoFirst(input);
    var solve = extraToClearPromo(input);
    return {
      snowball: snow,
      avalanche: aval,
      promo: promo,
      extraToClear: solve.extra,
      hasPromo: promo.promoCount > 0,
      allClearedBeforeCliff: promo.allClearedBeforeCliff,
      interestSavedVsAvalanche: Math.round((aval.totalInterest - promo.totalInterest) * 100) / 100,
      monthsDeltaVsAvalanche: aval.months - promo.months
    };
  }

  PayoffEngine.calculatePromoFirst = calculatePromoFirst;
  PayoffEngine.comparePromoCliff = comparePromoCliff;
  PayoffEngine.extraToClearPromo = extraToClearPromo;
  return PayoffEngine;
});
