/**
 * Persistence — storage seam for debts, theme, game, history.
 * Default adapter: localStorage. Tests inject memoryMap backend.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Persistence = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = {
    debts: 'debtPayoffDebts',
    extra: 'debtPayoffExtra',
    theme: 'debtPayoffTheme',
    game: 'debtPayoffGame',
    history: 'debtPayoffHistory'
  };

  function createMemoryBackend() {
    var store = Object.create(null);
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    };
  }

  function create(backend) {
    var b = backend || (typeof localStorage !== 'undefined' ? localStorage : createMemoryBackend());

    function readJSON(key, fallback) {
      try {
        var raw = b.getItem(key);
        if (raw == null || raw === '') return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }

    function writeJSON(key, value) {
      b.setItem(key, JSON.stringify(value));
    }

    return {
      KEYS: KEYS,
      loadDebts: function () {
        var list = readJSON(KEYS.debts, []);
        return Array.isArray(list) ? list : [];
      },
      saveDebts: function (debts) { writeJSON(KEYS.debts, debts || []); },
      clearDebts: function () { b.removeItem(KEYS.debts); },
      loadExtra: function () {
        var v = b.getItem(KEYS.extra);
        if (v == null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
      },
      saveExtra: function (extra) { b.setItem(KEYS.extra, String(extra)); },
      loadTheme: function () {
        var t = b.getItem(KEYS.theme);
        return t === 'dark' || t === 'light' ? t : null;
      },
      saveTheme: function (mode) { b.setItem(KEYS.theme, mode === 'dark' ? 'dark' : 'light'); },
      loadGame: function (defaults) {
        var g = readJSON(KEYS.game, null);
        if (!g || typeof g !== 'object') return Object.assign({}, defaults || {});
        return Object.assign({}, defaults || {}, g);
      },
      saveGame: function (game) { writeJSON(KEYS.game, game); },
      loadHistory: function () {
        var list = readJSON(KEYS.history, []);
        return Array.isArray(list) ? list : [];
      },
      pushHistory: function (entry, max) {
        max = max || 8;
        var list = this.loadHistory();
        list.unshift(entry);
        list = list.slice(0, max);
        writeJSON(KEYS.history, list);
        return list;
      },
      clearHistory: function () { b.removeItem(KEYS.history); },
      _backend: b
    };
  }

  return { create: create, createMemoryBackend: createMemoryBackend, KEYS: KEYS };
});
