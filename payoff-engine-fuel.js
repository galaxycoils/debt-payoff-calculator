/**
 * Snowball fuel + named debt-free date.
 * Public seam: snowballFuel, freedomName
 * Freed minimums roll into extra at each kill. The date gets a weekday and season.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function snowballFuel(calculate, debts, extra, strategy) {
    var calc = calculate || (PayoffEngine && PayoffEngine.calculate);
    if (typeof calc !== 'function') throw new Error('snowballFuel: calculate required');
    var extraN = Math.max(0, Number(extra) || 0);
    var mode = strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var plan = calc({ debts: debts, extra: extraN, strategy: mode });
    var kills = [];
    var freed = 0;
    (plan.payoffOrder || []).forEach(function (k) {
      var min = round2(Math.max(0, Number(k.minPayment) || 0));
      freed = round2(freed + min);
      kills.push({
        name: k.name,
        month: k.month,
        freed: min,
        extraAfter: round2(extraN + freed)
      });
    });
    var doubleAtMonth = null;
    if (extraN > 0) {
      var acc = 0;
      for (var i = 0; i < kills.length; i++) {
        acc = round2(acc + kills[i].freed);
        if (acc + 0.001 >= extraN) {
          doubleAtMonth = kills[i].month;
          break;
        }
      }
    }
    return {
      extra: extraN,
      months: plan.months,
      debtFreeDate: plan.debtFreeDate,
      kills: kills,
      freedTotal: round2(freed),
      extraAtEnd: round2(extraN + freed),
      doubleAtMonth: doubleAtMonth
    };
  }

  function freedomName(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return { weekday: '', band: '', season: '', phrase: '' };
    }
    var day = date.getDate();
    var band = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
    var m = date.getMonth();
    var season = (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall';
    var weekday = WEEKDAYS[date.getDay()];
    return { weekday: weekday, band: band, season: season, phrase: weekday + ' in ' + band + ' ' + season };
  }

  if (PayoffEngine) {
    PayoffEngine.snowballFuel = function (debts, extra, strategy) {
      return snowballFuel(PayoffEngine.calculate, debts, extra, strategy);
    };
    PayoffEngine.freedomName = freedomName;
  }
  return { snowballFuel: snowballFuel, freedomName: freedomName };
});
