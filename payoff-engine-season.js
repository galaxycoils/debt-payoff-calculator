/**
 * Gift-month dip + awkward balance cliff.
 * Public seam: giftMonthCost, balanceCliff
 * Prices a yearly month where extra shrinks (gifts, travel) and the
 * one-time payment that knocks a balance to the next round step.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function giftMonthCost(calculate, debts, extra, strategy, opts) {
    var calc = calculate || (PayoffEngine && PayoffEngine.calculate);
    if (typeof calc !== 'function') throw new Error('giftMonthCost: calculate required');
    opts = opts || {};
    var asOf = opts.asOf instanceof Date ? opts.asOf : new Date();
    var giftMonth = Math.min(12, Math.max(1, parseInt(opts.monthOfYear, 10) || 12));
    var extraN = Math.max(0, Number(extra) || 0);
    var requested = opts.dip == null ? extraN : Math.max(0, Number(opts.dip) || 0);
    var dip = Math.min(extraN, requested);
    var mode = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var baseline = calc({ debts: debts, extra: extraN, strategy: mode, asOf: asOf });
    var steady = round2(extraN - dip);
    var flakes = [];
    if (dip > 0) {
      for (var m = 1; m <= 720; m++) {
        var d = new Date(asOf.getTime());
        d.setMonth(d.getMonth() + m);
        if (d.getMonth() + 1 !== giftMonth) flakes.push({ amount: dip, month: m });
      }
    }
    var dipped = calc({ debts: debts, extra: steady, strategy: mode, asOf: asOf, snowflakes: flakes });
    return {
      giftMonth: giftMonth,
      dip: dip,
      baselineMonths: baseline.months,
      baselineInterest: baseline.totalInterest,
      dippedMonths: dipped.months,
      dippedInterest: dipped.totalInterest,
      monthsAdded: Math.max(0, dipped.months - baseline.months),
      interestAdded: round2(dipped.totalInterest - baseline.totalInterest)
    };
  }

  function cliffAmount(balance, step) {
    var b = Math.max(0, Number(balance) || 0);
    var size = Math.max(1, Number(step) || 100);
    if (b <= 0) return { target: 0, cliff: 0 };
    var target = Math.floor(b / size) * size;
    if (Math.abs(target - b) < 0.005) target = Math.max(0, target - size);
    return { target: round2(target), cliff: round2(b - target) };
  }

  function pickAwkward(debts, name) {
    var open = (debts || []).filter(function (d) { return (Number(d.balance) || 0) > 0; });
    if (!open.length) return null;
    if (name) {
      for (var i = 0; i < open.length; i++) {
        if (open[i].name === name) return open[i];
      }
    }
    var best = open[0];
    for (var j = 1; j < open.length; j++) {
      var b = Number(open[j].balance) || 0;
      var bestBal = Number(best.balance) || 0;
      if (b < bestBal || (b === bestBal && (Number(open[j].apr) || 0) > (Number(best.apr) || 0))) best = open[j];
    }
    return best;
  }

  function balanceCliff(calculate, debts, extra, strategy, opts) {
    var calc = calculate || (PayoffEngine && PayoffEngine.calculate);
    if (typeof calc !== 'function') throw new Error('balanceCliff: calculate required');
    opts = opts || {};
    var step = Math.max(1, Number(opts.step) || 100);
    var mode = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var extraN = Math.max(0, Number(extra) || 0);
    var target = pickAwkward(debts, opts.name);
    if (!target) {
      return { name: null, step: step, targetBalance: 0, cliff: 0, monthsSaved: 0, interestSaved: 0 };
    }
    var cliff = cliffAmount(target.balance, step);
    var baseline = calc({ debts: debts, extra: extraN, strategy: mode });
    var rushed = cliff.cliff > 0
      ? calc({ debts: debts, extra: extraN, strategy: mode, snowflakes: [{ amount: cliff.cliff, month: 1 }] })
      : baseline;
    return {
      name: target.name,
      step: step,
      balance: round2(target.balance),
      targetBalance: cliff.target,
      cliff: cliff.cliff,
      baselineMonths: baseline.months,
      rushedMonths: rushed.months,
      monthsSaved: Math.max(0, baseline.months - rushed.months),
      interestSaved: round2(baseline.totalInterest - rushed.totalInterest)
    };
  }

  if (PayoffEngine) {
    PayoffEngine.giftMonthCost = function (debts, extra, strategy, opts) {
      return giftMonthCost(PayoffEngine.calculate, debts, extra, strategy, opts);
    };
    PayoffEngine.balanceCliff = function (debts, extra, strategy, opts) {
      return balanceCliff(PayoffEngine.calculate, debts, extra, strategy, opts);
    };
    PayoffEngine.cliffAmount = cliffAmount;
  }
  return { giftMonthCost: giftMonthCost, balanceCliff: balanceCliff, cliffAmount: cliffAmount };
});
