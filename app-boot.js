/**
 * app-boot.js — adapter layer after payoff-engine, persistence, gamification load.
 * Patches theme/save/checkin/calc hooks to use deep modules when present.
 */
(function () {
  'use strict';
  if (typeof Persistence === 'undefined' || typeof Gamification === 'undefined') {
    console.warn('app-boot: modules missing');
    return;
  }

  var store = Persistence.create();
  window._store = store;

  var savedTheme = store.loadTheme();
  if (savedTheme === 'dark') document.documentElement.classList.add('dark');
  if (savedTheme === 'light') document.documentElement.classList.remove('dark');

  window.persistTheme = function (mode) {
    store.saveTheme(mode === 'dark' ? 'dark' : 'light');
  };

  var game = store.loadGame(Gamification.defaultState());
  window._game = game;

  function applyEffects(result) {
    game = result.state;
    window._game = game;
    result.effects.forEach(function (e) {
      if (e.type === 'toast' && typeof showToast === 'function') showToast(e.message);
      if (e.type === 'persist') store.saveGame(game);
      if (e.type === 'render') {
        if (typeof renderGameUI === 'function') renderGameUI();
        if (typeof renderAchievements === 'function') renderAchievements();
      }
    });
  }

  window.dispatchGame = function (type, payload) {
    applyEffects(Gamification.reduce(game, { type: type, payload: payload || {} }));
  };

  function loadScriptOnce(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    document.body.appendChild(s);
  }

  function enhance() {
    var checkin = document.getElementById('checkin-btn');
    if (checkin && !checkin._bootBound) {
      checkin._bootBound = true;
      checkin.addEventListener('click', function () {
        var today = new Date().toDateString();
        var y = new Date(); y.setDate(y.getDate() - 1);
        window.dispatchGame('checkin', { today: today, yesterday: y.toDateString() });
      }, true);
    }

    var saveBtn = document.getElementById('save-debts');
    if (saveBtn && !saveBtn._bootBound) {
      saveBtn._bootBound = true;
      saveBtn.addEventListener('click', function () {
        if (typeof getDebtsFromUI === 'function') {
          store.saveDebts(getDebtsFromUI());
          var slider = document.getElementById('extra-slider');
          if (slider) store.saveExtra(slider.value);
        }
      }, true);
    }

    var container = document.getElementById('debts-container');
    if (container && typeof createDebtRow === 'function') {
      var debts = store.loadDebts();
      var extra = store.loadExtra();
      var slider = document.getElementById('extra-slider');
      var extraDisplay = document.getElementById('extra-display');
      if (extra != null && slider) {
        slider.value = extra;
        if (extraDisplay) extraDisplay.textContent = '$' + extra;
      }
      if (debts.length && container.querySelectorAll('.debt-row').length <= 2) {
        var hasValues = false;
        container.querySelectorAll('.debt-balance').forEach(function (inp) {
          if (inp.value) hasValues = true;
        });
        if (!hasValues) {
          container.innerHTML = '';
          debts.forEach(function (d) { container.appendChild(createDebtRow(d)); });
        }
      }
    }

    if (typeof renderHistory === 'function') {
      window.loadHistory = function () { return store.loadHistory(); };
    }

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && !themeBtn._bootTheme) {
      themeBtn._bootTheme = true;
      themeBtn.addEventListener('click', function () {
        setTimeout(function () {
          var isDark = document.documentElement.classList.contains('dark');
          store.saveTheme(isDark ? 'dark' : 'light');
        }, 0);
      });
    }

    loadScriptOnce('app-balance-transfer.js');
    loadScriptOnce('app-consolidation.js');
    loadScriptOnce('app-cadence.js');
    loadScriptOnce('app-stress.js');

    console.info('app-boot: Persistence + Gamification adapter active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(enhance, 0); });
  } else {
    setTimeout(enhance, 0);
  }
})();
