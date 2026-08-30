/**
 * PayoffEngine — pure debt amortization (no DOM, no storage).
 * Public seam: calculate, compareToMinimums, extraNeededForDate,
 * cashFreedTimeline, repeatingSnowflakes, compareBalanceTransfer,
 * amortizingPayment, compareConsolidation
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PayoffEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MAX_MONTHS = 720;
  var EPS = 0.005;

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function currentApr(debt, month) {
    if (debt.promoMonths > 0) {
      if (month <= debt.promoMonths) return debt.promoApr == null ? debt.apr : debt.promoApr;
      return debt.regularApr == null ? debt.apr : debt.regularApr;
    }
    return debt.apr;
  }

  function repeatingSnowflakes(amount, everyMonths, times) {
    var amt = Math.max(0, Number(amount) || 0);
    var every = Math.max(1, parseInt(everyMonths, 10) || 12);
    var n = Math.max(0, parseInt(times, 10) || 0);
    var out = [];
    for (var i = 1; i <= n; i++) out.push({ amount: amt, month: i * every });
    return out;
  }

  function calculate(input) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.calculate: debts array required');
    var strategy = input.strategy === 'avalanche' ? 'avalanche' : 'snowball';
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
      .filter(function (f) { return f.amount > 0 && f.month > 0; })
      .sort(function (a, b) { return a.month - b.month; });

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

    if (strategy === 'snowball') debts.sort(function (a, b) { return a.balance - b.balance || b.apr - a.apr; });
    else debts.sort(function (a, b) { return b.apr - a.apr || a.balance - b.balance; });

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, history = [], payoffOrder = [];
    if (startingTotal <= 0) {
      return { months: 0, totalInterest: 0, history: [], payoffOrder: [], debtFreeDate: asOf, strategy: strategy, startingTotal: 0, cadence: cadence };
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
      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({ name: d.name, month: month, date: addMonths(asOf, month), minPayment: d.minPayment });
          }
          d.balance = 0;
        }
      });
      var totalBal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
      history.push({ month: month, totalBalance: Math.round(totalBal * 100) / 100, interest: Math.round(monthInterest * 100) / 100 });
      if (totalBal < 0.01) break;
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      history: history,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      strategy: strategy,
      startingTotal: startingTotal,
      cadence: cadence,
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; })
    };
  }

  function cashFreedTimeline(result) {
    if (!result || !Array.isArray(result.payoffOrder)) return [];
    var cumulative = 0;
    return result.payoffOrder.map(function (ev) {
      var freed = Math.max(0, Number(ev.minPayment) || 0);
      cumulative += freed;
      return { name: ev.name, month: ev.month, date: ev.date, freedMonthly: Math.round(freed * 100) / 100, cumulativeFreed: Math.round(cumulative * 100) / 100 };
    });
  }

  function monthsUntil(asOf, targetDate) {
    var start = asOf instanceof Date ? asOf : new Date();
    var target = targetDate instanceof Date ? targetDate : new Date(targetDate);
    if (isNaN(target.getTime())) return 1;
    var n = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
    if (target.getDate() > start.getDate()) n += 1;
    return Math.max(1, n);
  }

  function extraNeededForDate(input, targetDate) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.extraNeededForDate: debts array required');
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var monthsWanted = monthsUntil(asOf, targetDate);
    var zero = calculate({ debts: input.debts, extra: 0, strategy: input.strategy, snowflakes: input.snowflakes, asOf: asOf, cadence: input.cadence });
    if (!zero.hitCap && zero.months <= monthsWanted) {
      return { extra: 0, monthsWanted: monthsWanted, plan: zero, reachable: true, alreadyOnTrack: true };
    }
    var lo = 0, hi = Math.max(1, Math.ceil(zero.startingTotal || 1)), best = null;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var plan = calculate({ debts: input.debts, extra: mid, strategy: input.strategy, snowflakes: input.snowflakes, asOf: asOf, cadence: input.cadence });
      if (!plan.hitCap && plan.months <= monthsWanted) { best = { extra: mid, plan: plan }; hi = mid - 1; }
      else lo = mid + 1;
    }
    if (!best) {
      var maxPlan = calculate({ debts: input.debts, extra: lo, strategy: input.strategy, snowflakes: input.snowflakes, asOf: asOf, cadence: input.cadence });
      return { extra: lo, monthsWanted: monthsWanted, plan: maxPlan, reachable: !maxPlan.hitCap && maxPlan.months <= monthsWanted, alreadyOnTrack: false };
    }
    return { extra: best.extra, monthsWanted: monthsWanted, plan: best.plan, reachable: true, alreadyOnTrack: false };
  }

  function compareToMinimums(input) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareToMinimums: debts array required');
    var plan = calculate(input);
    var minimums = calculate({ debts: input.debts, extra: 0, strategy: input.strategy === 'avalanche' ? 'avalanche' : 'snowball', snowflakes: [], asOf: input.asOf, cadence: input.cadence });
    return {
      plan: plan,
      minimums: minimums,
      monthsSaved: Math.max(0, minimums.months - plan.months),
      interestSaved: Math.round((minimums.totalInterest - plan.totalInterest) * 100) / 100
    };
  }

  function compareBalanceTransfer(input, offer) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareBalanceTransfer: debts array required');
    offer = offer || {};
    var feePercent = Math.max(0, Number(offer.feePercent) || 0);
    var promoApr = offer.promoApr == null ? 0 : Math.max(0, Number(offer.promoApr) || 0);
    var promoMonths = Math.max(0, parseInt(offer.promoMonths, 10) || 0);
    var names = offer.names;
    var stay = calculate(input);
    var feePaid = 0;
    var transferred = input.debts.map(function (d) {
      var match = !names || !names.length || names.indexOf(d.name) !== -1;
      if (!match) return d;
      var bal = Math.max(0, Number(d.balance) || 0);
      var fee = Math.round(bal * (feePercent / 100) * 100) / 100;
      feePaid += fee;
      var post = offer.postPromoApr == null ? d.apr : offer.postPromoApr;
      return { name: d.name, balance: bal + fee, apr: promoApr, minPayment: d.minPayment, promoMonths: promoMonths, promoApr: promoApr, regularApr: post };
    });
    var transfer = calculate({ debts: transferred, extra: input.extra, strategy: input.strategy, snowflakes: input.snowflakes, asOf: input.asOf, cadence: input.cadence });
    var monthsSaved = stay.months - transfer.months;
    var interestSaved = Math.round((stay.totalInterest - transfer.totalInterest) * 100) / 100;
    var net = Math.round((interestSaved - feePaid) * 100) / 100;
    return { stay: stay, transfer: transfer, feePaid: Math.round(feePaid * 100) / 100, monthsSaved: monthsSaved, interestSaved: interestSaved, netSaved: net, worthIt: net > 0 && monthsSaved >= 0 };
  }

  function amortizingPayment(principal, apr, months) {
    var p = Math.max(0, Number(principal) || 0);
    var n = Math.max(1, parseInt(months, 10) || 1);
    var r = (Math.max(0, Number(apr) || 0) / 100) / 12;
    if (r === 0) return Math.round((p / n) * 100) / 100;
    return Math.round((p * r / (1 - Math.pow(1 + r, -n))) * 100) / 100;
  }

  function compareConsolidation(input, loan) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareConsolidation: debts array required');
    loan = loan || {};
    var stay = calculate(input);
    var principal = input.debts.reduce(function (s, d) { return s + Math.max(0, Number(d.balance) || 0); }, 0);
    var oldMins = input.debts.reduce(function (s, d) { return s + Math.max(0, Number(d.minPayment) || 0); }, 0);
    var feePercent = Math.max(0, Number(loan.feePercent) || 0);
    var feeFlat = Math.max(0, Number(loan.feeFlat) || 0);
    var feePaid = Math.round((principal * (feePercent / 100) + feeFlat) * 100) / 100;
    var newBal = Math.round((principal + feePaid) * 100) / 100;
    var apr = loan.apr == null ? 8 : Math.max(0, Number(loan.apr) || 0);
    var term = Math.max(1, parseInt(loan.termMonths, 10) || 36);
    var scheduled = amortizingPayment(newBal, apr, term);
    var keepBudget = loan.keepBudget !== false;
    var extra = Math.max(0, Number(input.extra) || 0);
    var minPayment = scheduled;
    var loanExtra = extra;
    if (keepBudget) {
      var budget = oldMins + extra;
      minPayment = Math.min(scheduled, budget);
      loanExtra = Math.max(0, budget - minPayment);
    }
    var consol = calculate({
      debts: [{ name: loan.name || 'Consolidation loan', balance: newBal, apr: apr, minPayment: minPayment }],
      extra: loanExtra,
      strategy: 'snowball',
      snowflakes: input.snowflakes,
      asOf: input.asOf,
      cadence: input.cadence
    });
    var monthsSaved = stay.months - consol.months;
    var interestSaved = Math.round((stay.totalInterest - consol.totalInterest) * 100) / 100;
    var net = Math.round((interestSaved - feePaid) * 100) / 100;
    return {
      stay: stay,
      loan: consol,
      feePaid: feePaid,
      newBalance: newBal,
      scheduledPayment: scheduled,
      monthsSaved: monthsSaved,
      interestSaved: interestSaved,
      netSaved: net,
      worthIt: net > 0
    };
  }

  return {
    calculate: calculate,
    compareToMinimums: compareToMinimums,
    extraNeededForDate: extraNeededForDate,
    cashFreedTimeline: cashFreedTimeline,
    repeatingSnowflakes: repeatingSnowflakes,
    compareBalanceTransfer: compareBalanceTransfer,
    amortizingPayment: amortizingPayment,
    compareConsolidation: compareConsolidation,
    currentApr: currentApr,
    monthsUntil: monthsUntil,
    addMonths: addMonths,
    MAX_MONTHS: MAX_MONTHS
  };
});
