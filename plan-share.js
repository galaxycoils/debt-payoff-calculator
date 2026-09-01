/**
 * PlanShare — encode/decode a calculator plan for hash URLs.
 * No DOM. Adapter applies hash to UI.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlanShare = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function b64urlEncode(str) {
    var b64;
    if (typeof Buffer !== 'undefined') b64 = Buffer.from(str, 'utf8').toString('base64');
    else b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(token) {
    var b64 = String(token || '').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    return decodeURIComponent(escape(atob(b64)));
  }

  function encode(plan) {
    var payload = {
      v: 1,
      extra: Math.max(0, Number(plan && plan.extra) || 0),
      strategy: plan && plan.strategy === 'avalanche' ? 'avalanche' : 'snowball',
      debts: ((plan && plan.debts) || []).map(function (d) {
        return {
          n: (d.name && String(d.name).trim()) || 'Debt',
          b: Math.max(0, Number(d.balance) || 0),
          a: Math.max(0, Number(d.apr) || 0),
          m: Math.max(0, Number(d.minPayment) || 0)
        };
      })
    };
    return b64urlEncode(JSON.stringify(payload));
  }

  function decode(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      var raw = JSON.parse(b64urlDecode(token));
      if (!raw || typeof raw !== 'object') return null;
      return {
        extra: Math.max(0, Number(raw.extra) || 0),
        strategy: raw.strategy === 'avalanche' ? 'avalanche' : 'snowball',
        debts: Array.isArray(raw.debts) ? raw.debts.map(function (d) {
          return {
            name: (d.n && String(d.n).trim()) || 'Debt',
            balance: Math.max(0, Number(d.b) || 0),
            apr: Math.max(0, Number(d.a) || 0),
            minPayment: Math.max(0, Number(d.m) || 0)
          };
        }) : []
      };
    } catch (e) {
      return null;
    }
  }

  function toHash(plan) {
    return '#p=' + encode(plan);
  }

  function fromHash(hash) {
    var h = String(hash || '');
    var idx = h.indexOf('#p=');
    if (idx === -1) return null;
    var token = h.slice(idx + 3).split('&')[0];
    return decode(token);
  }

  return { encode: encode, decode: decode, toHash: toHash, fromHash: fromHash };
});
