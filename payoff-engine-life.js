/**
 * Life equivalents + pinned-plan duel.
 * Public seam: lifeEquivalents, beatPin
 * Turns interest avoided into rent months, grocery weeks, and flights,
 * and scores a later plan against a pinned baseline.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var DEFAULTS = { rent: 1500, groceryWeek: 150, flight: 400 };

  function round1(n) {
    return Math.round((Number(n) || 0) * 10) / 10;
  }
  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }
  function positive(n, fallback) {
    var v = Number(n);
    return v > 0 ? v : fallback;
  }

  function lifeEquivalents(interestSaved, rates) {
    var saved = Math.max(0, Number(interestSaved) || 0);
    var rent = positive(rates && rates.rent, DEFAULTS.rent);
    var groceryWeek = positive(rates && rates.groceryWeek, DEFAULTS.groceryWeek);
    var flight = positive(rates && rates.flight, DEFAULTS.flight);
    var rentMonths = round1(saved / rent);
    var groceryWeeks = round1(saved / groceryWeek);
    var flights = round1(saved / flight);
    var headline = rentMonths.toFixed(1).replace(/\.0$/, '') + (rentMonths === 1 ? ' month of rent' : ' months of rent');
    if (rentMonths > 0 && rentMonths < 10) headline = rentMonths.toFixed(1).replace(/\.0$/, '') + (rentMonths === 1 ? ' month of rent' : ' months of rent');
    return {
      interestSaved: round2(saved),
      rent: rent,
      groceryWeek: groceryWeek,
      flight: flight,
      rentMonths: rentMonths,
      groceryWeeks: groceryWeeks,
      flights: flights,
      headline: headline
    };
  }

  function beatPin(current, pin) {
    var curMonths = Math.max(0, Number(current && current.months) || 0);
    var pinMonths = Math.max(0, Number(pin && pin.months) || 0);
    var curInterest = Math.max(0, Number(current && current.totalInterest) || 0);
    var pinInterest = Math.max(0, Number(pin && pin.totalInterest) || 0);
    var monthsBeaten = pinMonths - curMonths;
    var interestBeaten = round2(pinInterest - curInterest);
    return {
      monthsBeaten: monthsBeaten,
      interestBeaten: interestBeaten,
      won: monthsBeaten > 0 || interestBeaten > 0
    };
  }

  if (PayoffEngine) {
    PayoffEngine.lifeEquivalents = lifeEquivalents;
    PayoffEngine.beatPin = beatPin;
  }
  return PayoffEngine;
});
