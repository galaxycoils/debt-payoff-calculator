/**
 * app-inline.js — full client-side UI for Debt Payoff Calculator
 * Depends on: PayoffEngine, Persistence (via app-boot), Gamification, Chart.js, jsPDF
 * Design: DESIGN.md operate mode + hero debt-free date
 */
(function () {
  'use strict';

  // ---- Theme ----
  var themeToggle = document.getElementById('theme-toggle');
  function updateThemeUI() {
    var isDark = document.documentElement.classList.contains('dark');
    var icon = document.getElementById('theme-icon');
    var label = document.getElementById('theme-label');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
  }
  function setTheme(mode) {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('debtPayoffTheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('debtPayoffTheme', 'light');
    }
    updateThemeUI();
    if (typeof window.persistTheme === 'function') window.persistTheme(mode);
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    });
  }
  updateThemeUI();

  // ---- Toast ----
  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('opacity-0', 'pointer-events-none');
    t.classList.add('opacity-100');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
      t.classList.add('opacity-0', 'pointer-events-none');
      t.classList.remove('opacity-100');
    }, 2800);
  }
  window.showToast = showToast;

  // ---- Game UI (works with app-boot dispatchGame or local fallback) ----
  var GAME_KEY = 'debtPayoffGame';
  var defaultGame = { xp: 0, level: 1, streak: 0, lastCheckin: null, achievements: {}, totalCalcs: 0, maxExtraUsed: 0 };
  function loadGameLocal() {
    try {
      var raw = localStorage.getItem(GAME_KEY);
      if (raw) return Object.assign({}, defaultGame, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, defaultGame);
  }
  function saveGameLocal(g) {
    try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) {}
  }
  if (!window._game) window._game = loadGameLocal();

  var ACHIEVEMENTS = (typeof Gamification !== 'undefined' && Gamification.ACHIEVEMENTS) ? Gamification.ACHIEVEMENTS : [
    { id: 'first_calc', name: 'First Steps', desc: 'Run your first calculation', xp: 25 },
    { id: 'compare', name: 'Strategist', desc: 'Compare Snowball vs Avalanche', xp: 40 },
    { id: 'extra_100', name: 'Booster', desc: 'Use $100+ extra payment', xp: 30 },
    { id: 'extra_300', name: 'Aggressive', desc: 'Use $300+ extra payment', xp: 50 },
    { id: 'streak_3', name: 'Consistent', desc: '3-day check-in streak', xp: 60 },
    { id: 'streak_7', name: 'Week Warrior', desc: '7-day check-in streak', xp: 120 },
    { id: 'level_5', name: 'Rising', desc: 'Reach Level 5', xp: 80 },
    { id: 'calcs_10', name: 'Explorer', desc: 'Run 10 calculations', xp: 70 },
    { id: 'snowflake', name: 'Snowflake', desc: 'Add a one-time bonus payment', xp: 45 },
    { id: 'share_image', name: 'Show-off', desc: 'Export a shareable result image', xp: 55 },
    { id: 'finish_line', name: 'Finish Line', desc: 'Plan with 3 months or fewer remaining', xp: 90 }
  ];

  function xpForLevel(level) { return level * 100; }

  function renderGameUI() {
    var g = window._game || loadGameLocal();
    var streakEl = document.getElementById('streak-count');
    var levelEl = document.getElementById('level-display');
    var xpEl = document.getElementById('xp-display');
    var xpBar = document.getElementById('xp-bar');
    var xpNext = document.getElementById('xp-next');
    if (streakEl) streakEl.textContent = g.streak || 0;
    if (levelEl) levelEl.textContent = g.level || 1;
    if (xpEl) xpEl.textContent = g.xp || 0;
    var need = xpForLevel(g.level || 1);
    var pct = Math.min(100, Math.round(((g.xp || 0) / need) * 100));
    if (xpBar) xpBar.style.width = pct + '%';
    if (xpNext) xpNext.textContent = (need - (g.xp || 0)) + ' XP to next';
  }
  window.renderGameUI = renderGameUI;

  function renderAchievements() {
    var list = document.getElementById('achievements-list');
    var countEl = document.getElementById('ach-count');
    if (!list) return;
    var g = window._game || loadGameLocal();
    var unlocked = 0;
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(function (a) {
      var earned = !!(g.achievements && g.achievements[a.id]);
      if (earned) unlocked++;
      var span = document.createElement('span');
      span.className = 'badge ' + (earned ? 'badge-earned' : 'badge-locked');
      span.setAttribute('role', 'listitem');
      span.title = a.desc;
      span.textContent = (earned ? '✓ ' : '') + a.name;
      list.appendChild(span);
    });
    if (countEl) countEl.textContent = unlocked + ' unlocked';
  }
  window.renderAchievements = renderAchievements;

  function unlockAchievement(id) {
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('unlock', { id: id });
      return;
    }
    var g = window._game || loadGameLocal();
    if (g.achievements[id]) return;
    var ach = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) { ach = ACHIEVEMENTS[i]; break; }
    }
    if (!ach) return;
    g.achievements[id] = Date.now();
    g.xp = (g.xp || 0) + ach.xp;
    while (g.xp >= xpForLevel(g.level)) {
      g.xp -= xpForLevel(g.level);
      g.level += 1;
      showToast('Level up! Level ' + g.level);
    }
    window._game = g;
    saveGameLocal(g);
    showToast('Achievement unlocked: ' + ach.name);
    renderGameUI();
    renderAchievements();
  }
  window.unlockAchievement = unlockAchievement;

  var checkinBtn = document.getElementById('checkin-btn');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', function () {
      if (typeof window.dispatchGame === 'function') {
        var today = new Date().toDateString();
        var y = new Date(); y.setDate(y.getDate() - 1);
        window.dispatchGame('checkin', { today: today, yesterday: y.toDateString() });
        renderGameUI();
        renderAchievements();
        return;
      }
      var g = window._game || loadGameLocal();
      var today = new Date().toDateString();
      if (g.lastCheckin === today) {
        showToast('Already checked in today');
        return;
      }
      var y = new Date(); y.setDate(y.getDate() - 1);
      g.streak = g.lastCheckin === y.toDateString() ? (g.streak || 0) + 1 : 1;
      g.lastCheckin = today;
      g.xp = (g.xp || 0) + 15;
      while (g.xp >= xpForLevel(g.level)) {
        g.xp -= xpForLevel(g.level);
        g.level += 1;
        showToast('Level up! Level ' + g.level);
      }
      if (g.streak >= 3) unlockAchievement('streak_3');
      if (g.streak >= 7) unlockAchievement('streak_7');
      window._game = g;
      saveGameLocal(g);
      showToast('+15 XP — Daily check-in');
      renderGameUI();
      renderAchievements();
    });
  }

  var toggleAch = document.getElementById('toggle-achievements');
  if (toggleAch) {
    toggleAch.addEventListener('click', function () {
      var list = document.getElementById('achievements-list');
      if (list) list.classList.toggle('hidden');
    });
  }

  // ---- Debt rows ----
  function createDebtRow(data) {
    data = data || {};
    var row = document.createElement('div');
    row.className = 'debt-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600';
    row.innerHTML =
      '<div class="sm:col-span-3">' +
      '<label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Name</label>' +
      '<input type="text" class="debt-name w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700" placeholder="Credit card" value="' + (data.name || '').replace(/"/g, '&quot;') + '" />' +
      '</div>' +
      '<div class="sm:col-span-3">' +
      '<label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Balance ($)</label>' +
      '<input type="number" min="0" step="0.01" class="debt-balance w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700" placeholder="5000" value="' + (data.balance != null ? data.balance : '') + '" />' +
      '</div>' +
      '<div class="sm:col-span-2">' +
      '<label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">APR %</label>' +
      '<input type="number" min="0" step="0.01" class="debt-apr w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700" placeholder="19.9" value="' + (data.apr != null ? data.apr : '') + '" />' +
      '</div>' +
      '<div class="sm:col-span-3">' +
      '<label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Min payment ($)</label>' +
      '<input type="number" min="0" step="0.01" class="debt-min w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700" placeholder="150" value="' + (data.minPayment != null ? data.minPayment : '') + '" />' +
      '</div>' +
      '<div class="sm:col-span-1 flex justify-end">' +
      '<button type="button" class="remove-debt text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg px-2 py-2 min-h-[44px] text-sm" aria-label="Remove debt">✕</button>' +
      '</div>';
    row.querySelector('.remove-debt').addEventListener('click', function () {
      row.remove();
    });
    return row;
  }
  window.createDebtRow = createDebtRow;

  function getDebtsFromUI() {
    var rows = document.querySelectorAll('.debt-row');
    var debts = [];
    rows.forEach(function (row) {
      var name = (row.querySelector('.debt-name') || {}).value || 'Debt';
      var balance = parseFloat((row.querySelector('.debt-balance') || {}).value) || 0;
      var apr = parseFloat((row.querySelector('.debt-apr') || {}).value) || 0;
      var minPayment = parseFloat((row.querySelector('.debt-min') || {}).value) || 0;
      if (balance > 0) debts.push({ name: name.trim() || 'Debt', balance: balance, apr: apr, minPayment: minPayment });
    });
    return debts;
  }
  window.getDebtsFromUI = getDebtsFromUI;

  var debtsContainer = document.getElementById('debts-container');
  var addDebtBtn = document.getElementById('add-debt');
  if (addDebtBtn && debtsContainer) {
    addDebtBtn.addEventListener('click', function () {
      debtsContainer.appendChild(createDebtRow());
    });
  }

  // Seed one empty row if empty
  if (debtsContainer && debtsContainer.children.length === 0) {
    debtsContainer.appendChild(createDebtRow({ name: 'Credit Card', balance: 4500, apr: 22.9, minPayment: 120 }));
    debtsContainer.appendChild(createDebtRow({ name: 'Car Loan', balance: 12000, apr: 6.5, minPayment: 280 }));
  }

  // ---- Extra slider + what-if ----
  var extraSlider = document.getElementById('extra-slider');
  var extraDisplay = document.getElementById('extra-display');
  function syncExtraDisplay() {
    if (extraSlider && extraDisplay) extraDisplay.textContent = '$' + extraSlider.value;
  }
  if (extraSlider) {
    extraSlider.addEventListener('input', function () {
      syncExtraDisplay();
      if (window._lastResultsShown) runCalc(true);
    });
    syncExtraDisplay();
  }
  document.querySelectorAll('.what-if').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var amt = parseInt(btn.getAttribute('data-amount'), 10) || 0;
      if (!extraSlider) return;
      if (amt === 0) {
        extraSlider.value = 0;
      } else {
        extraSlider.value = Math.min(1000, parseInt(extraSlider.value, 10) + amt);
      }
      syncExtraDisplay();
      if (window._lastResultsShown) runCalc(true);
    });
  });

  // ---- Snowflakes ----
  var snowflakesContainer = document.getElementById('snowflakes-container');
  var addSnowflakeBtn = document.getElementById('add-snowflake');
  function createSnowflakeRow(data) {
    data = data || {};
    var row = document.createElement('div');
    row.className = 'snowflake-row flex flex-wrap gap-2 items-center';
    row.innerHTML =
      '<input type="number" min="1" max="720" class="sf-month w-20 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700" placeholder="Month" value="' + (data.month || '') + '" />' +
      '<span class="text-xs text-slate-400">mo</span>' +
      '<input type="number" min="0" step="10" class="sf-amount w-28 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700" placeholder="Amount" value="' + (data.amount || '') + '" />' +
      '<button type="button" class="remove-sf text-red-500 text-sm px-2 min-h-[44px]">Remove</button>';
    row.querySelector('.remove-sf').addEventListener('click', function () { row.remove(); });
    return row;
  }
  function getSnowflakesFromUI() {
    var list = [];
    if (!snowflakesContainer) return list;
    snowflakesContainer.querySelectorAll('.snowflake-row').forEach(function (row) {
      var month = parseInt((row.querySelector('.sf-month') || {}).value, 10) || 0;
      var amount = parseFloat((row.querySelector('.sf-amount') || {}).value) || 0;
      if (month > 0 && amount > 0) list.push({ month: month, amount: amount });
    });
    return list;
  }
  if (addSnowflakeBtn && snowflakesContainer) {
    addSnowflakeBtn.addEventListener('click', function () {
      snowflakesContainer.appendChild(createSnowflakeRow({ month: 3, amount: 500 }));
      if (typeof window.dispatchGame === 'function') window.dispatchGame('snowflake_added');
      else unlockAchievement('snowflake');
    });
  }

  // ---- History ----
  function loadHistory() {
    if (window._store && typeof window._store.loadHistory === 'function') return window._store.loadHistory();
    try {
      var raw = localStorage.getItem('debtPayoffHistory');
      if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    return [];
  }
  window.loadHistory = loadHistory;

  function saveHistoryEntry(entry) {
    if (window._store && typeof window._store.pushHistory === 'function') {
      window._store.pushHistory(entry, 8);
      return;
    }
    var list = loadHistory();
    list.unshift(entry);
    list = list.slice(0, 8);
    try { localStorage.setItem('debtPayoffHistory', JSON.stringify(list)); } catch (e) {}
  }

  function renderHistory() {
    var listEl = document.getElementById('history-list');
    if (!listEl) return;
    var list = loadHistory();
    listEl.innerHTML = '';
    if (!list.length) {
      listEl.innerHTML = '<span class="text-xs text-slate-400">No scenarios yet — run a calculation</span>';
      return;
    }
    list.forEach(function (h, idx) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'history-chip';
      var dateStr = h.debtFreeDate ? new Date(h.debtFreeDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';
      chip.textContent = (h.strategy || 'plan') + ' · ' + (h.months || '?') + ' mo · free ' + dateStr;
      chip.title = 'Restore this scenario';
      chip.addEventListener('click', function () {
        if (h.extra != null && extraSlider) {
          extraSlider.value = h.extra;
          syncExtraDisplay();
        }
        if (h.debts && debtsContainer) {
          debtsContainer.innerHTML = '';
          h.debts.forEach(function (d) { debtsContainer.appendChild(createDebtRow(d)); });
        }
        var strat = document.getElementById('strategy');
        if (strat && h.mode) strat.value = h.mode;
        runCalc(false);
        showToast('Scenario restored');
      });
      listEl.appendChild(chip);
    });
  }
  window.renderHistory = renderHistory;

  var clearHistoryBtn = document.getElementById('clear-history');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', function () {
      if (window._store && window._store.clearHistory) window._store.clearHistory();
      else try { localStorage.removeItem('debtPayoffHistory'); } catch (e) {}
      renderHistory();
      showToast('History cleared');
    });
  }

  // ---- Chart ----
  var chartInstance = null;
  function drawChart(snow, aval) {
    var canvas = document.getElementById('debt-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstance) chartInstance.destroy();
    var labels = [];
    var maxM = Math.max(
      (snow && snow.history && snow.history.length) || 0,
      (aval && aval.history && aval.history.length) || 0
    );
    for (var i = 0; i <= maxM; i++) labels.push(i === 0 ? 'Now' : 'M' + i);
    function balSeries(res) {
      if (!res || !res.history) return [];
      var arr = [res.startingTotal || 0];
      res.history.forEach(function (p) { arr.push(p.totalBalance); });
      while (arr.length < labels.length) arr.push(0);
      return arr;
    }
    var datasets = [];
    if (snow) {
      datasets.push({
        label: 'Snowball',
        data: balSeries(snow),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        tension: 0.25,
        fill: false,
        pointRadius: 0
      });
    }
    if (aval) {
      datasets.push({
        label: 'Avalanche',
        data: balSeries(aval),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        tension: 0.25,
        fill: false,
        pointRadius: 0
      });
    }
    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (v) { return '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v); }
            }
          }
        }
      }
    });
  }

  // ---- Format helpers ----
  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---- Progress + celebration ----
  function updateProgress(result) {
    var card = document.getElementById('progress-card');
    var bar = document.getElementById('progress-bar');
    var pctEl = document.getElementById('progress-pct');
    var msg = document.getElementById('progress-msg');
    if (!card || !result) return;
    card.classList.remove('hidden');
    // Progress = how far through the plan (inverse of remaining months vs a soft max)
    var months = result.months || 0;
    var start = result.startingTotal || 1;
    // Use interest avoided feel: closer to free = higher %
    var softMax = Math.max(months, 36);
    var pct = months <= 0 ? 100 : Math.max(0, Math.min(99, Math.round((1 - months / softMax) * 100)));
    if (months <= 3) pct = 95 + Math.max(0, 3 - months) * 1;
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (msg) {
      if (months <= 0) msg.textContent = 'You are debt-free!';
      else if (months <= 3) msg.textContent = 'Finish line — only ' + months + ' month' + (months === 1 ? '' : 's') + ' left.';
      else if (months <= 12) msg.textContent = months + ' months to freedom. Keep the momentum.';
      else msg.textContent = months + ' months remaining on this plan.';
    }

    var celeb = document.getElementById('celebration-banner');
    var celebTitle = document.getElementById('celebration-title');
    var celebMsg = document.getElementById('celebration-msg');
    if (celeb) {
      if (months > 0 && months <= 18) {
        celeb.classList.remove('hidden');
        if (celebTitle) celebTitle.textContent = months <= 3 ? 'Finish line in sight!' : months <= 12 ? 'Almost debt-free!' : 'You are on the path!';
        if (celebMsg) celebMsg.textContent = 'Only ' + months + ' month' + (months === 1 ? '' : 's') + ' until ' + fmtDate(result.debtFreeDate) + '.';
        if (months <= 3 && typeof unlockAchievement === 'function') unlockAchievement('finish_line');
      } else {
        celeb.classList.add('hidden');
      }
    }
  }

  // ---- Kill order ----
  function renderKillOrder(result) {
    var card = document.getElementById('kill-order-card');
    var timeline = document.getElementById('kill-order-timeline');
    if (!card || !timeline || !result || !result.payoffOrder) return;
    if (!result.payoffOrder.length) {
      card.classList.add('hidden');
      return;
    }
    card.classList.remove('hidden');
    timeline.innerHTML = '';
    result.payoffOrder.forEach(function (ev, i) {
      var div = document.createElement('div');
      div.className = 'flex items-start gap-3';
      div.innerHTML =
        '<div class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">' + (i + 1) + '</div>' +
        '<div>' +
        '<div class="font-medium text-slate-800 dark:text-slate-100">' + (ev.name || 'Debt') + '</div>' +
        '<div class="text-xs text-slate-500 dark:text-slate-400">Month ' + ev.month + ' · ' + fmtDate(ev.date) + '</div>' +
        '</div>';
      timeline.appendChild(div);
    });
  }

  // ---- Schedule ----
  function renderSchedule(result) {
    var el = document.getElementById('schedule');
    if (!el || !result || !result.history) return;
    var rows = result.history.slice(0, 24);
    if (!rows.length) {
      el.innerHTML = '<p class="text-slate-400 text-sm">No schedule</p>';
      return;
    }
    var html = '<table class="w-full text-left text-sm"><thead><tr class="border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">' +
      '<th class="py-2 pr-3">Month</th><th class="py-2 pr-3">Balance</th><th class="py-2">Interest</th></tr></thead><tbody>';
    rows.forEach(function (p) {
      html += '<tr class="border-b border-slate-100 dark:border-slate-700">' +
        '<td class="py-1.5 pr-3">' + p.month + '</td>' +
        '<td class="py-1.5 pr-3">' + fmtMoney(p.totalBalance) + '</td>' +
        '<td class="py-1.5">' + fmtMoney(p.interest) + '</td></tr>';
    });
    if (result.history.length > 24) {
      html += '<tr><td colspan="3" class="py-2 text-xs text-slate-400">… +' + (result.history.length - 24) + ' more months</td></tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ---- Results rendering (hero date per DESIGN.md) ----
  function renderSingle(result, label, colorClass) {
    if (!result) return '';
    var freeDate = fmtDate(result.debtFreeDate);
    return (
      '<div class="card border-l-4 ' + (colorClass || 'border-indigo-500') + '">' +
      '<div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">' + label + '</div>' +
      '<div class="hero-date text-2xl md:text-3xl font-bold text-teal-700 dark:text-teal-300 tracking-tight mb-2">' + freeDate + '</div>' +
      '<div class="text-sm text-slate-600 dark:text-slate-300 space-y-1">' +
      '<div><span class="text-slate-400">Months:</span> <strong>' + result.months + '</strong></div>' +
      '<div><span class="text-slate-400">Total interest:</span> <strong>' + fmtMoney(result.totalInterest) + '</strong></div>' +
      '</div></div>'
    );
  }

  function renderResults(snow, aval, mode) {
    var results = document.getElementById('results');
    if (!results) return;
    results.classList.remove('hidden');
    window._lastResultsShown = true;
    window._lastSnow = snow;
    window._lastAval = aval;
    window._lastMode = mode;

    var summary = document.getElementById('comparison-summary');
    if (summary) {
      if (mode === 'compare' && snow && aval) {
        summary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-500') + renderSingle(aval, 'Avalanche', 'border-emerald-500');
      } else if (mode === 'snowball' && snow) {
        summary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-500');
      } else if (aval) {
        summary.innerHTML = renderSingle(aval, 'Avalanche', 'border-emerald-500');
      }
    }

    var banner = document.getElementById('winner-banner');
    if (banner && mode === 'compare' && snow && aval) {
      var better = aval.totalInterest <= snow.totalInterest ? aval : snow;
      var worse = better === aval ? snow : aval;
      var interestSaved = Math.round((worse.totalInterest - better.totalInterest) * 100) / 100;
      var monthsSaved = worse.months - better.months;
      banner.classList.remove('hidden');
      banner.innerHTML =
        '<div class="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Winner: ' + (better.strategy === 'avalanche' ? 'Avalanche' : 'Snowball') + '</div>' +
        '<p class="text-sm text-emerald-900/90 dark:text-emerald-100/90">Saves <strong>' + fmtMoney(interestSaved) + '</strong> in interest' +
        (monthsSaved > 0 ? ' and <strong>' + monthsSaved + ' month' + (monthsSaved === 1 ? '' : 's') + '</strong>' : '') + ' vs the other method.</p>';
    } else if (banner) {
      banner.classList.add('hidden');
    }

    var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
    if (primary) {
      updateProgress(primary);
      renderKillOrder(primary);
      renderSchedule(primary);
    }
    drawChart(snow, aval);

    // History entry
    if (primary) {
      saveHistoryEntry({
        strategy: primary.strategy,
        mode: mode,
        months: primary.months,
        totalInterest: primary.totalInterest,
        debtFreeDate: primary.debtFreeDate,
        extra: extraSlider ? parseFloat(extraSlider.value) : 0,
        debts: getDebtsFromUI(),
        ts: Date.now()
      });
      renderHistory();
    }

    // Gamification
    var extraVal = extraSlider ? parseFloat(extraSlider.value) || 0 : 0;
    if (typeof window.dispatchGame === 'function') {
      window.dispatchGame('calculation', { compared: mode === 'compare', extra: extraVal });
    } else {
      var g = window._game || loadGameLocal();
      g.totalCalcs = (g.totalCalcs || 0) + 1;
      if (g.totalCalcs === 1) unlockAchievement('first_calc');
      if (g.totalCalcs >= 10) unlockAchievement('calcs_10');
      if (mode === 'compare') unlockAchievement('compare');
      if (extraVal >= 100) unlockAchievement('extra_100');
      if (extraVal >= 300) unlockAchievement('extra_300');
      g.xp = (g.xp || 0) + 10;
      if (extraVal > (g.maxExtraUsed || 0)) g.maxExtraUsed = extraVal;
      while (g.xp >= xpForLevel(g.level)) {
        g.xp -= xpForLevel(g.level);
        g.level += 1;
        showToast('Level up! Level ' + g.level);
      }
      window._game = g;
      saveGameLocal(g);
      showToast('+10 XP — Calculation');
      renderGameUI();
      renderAchievements();
    }

    // Scroll to results on first show
    if (!window._scrolledToResults) {
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window._scrolledToResults = true;
    }
  }

  // ---- Calculate ----
  function runCalc(quiet) {
    var debts = getDebtsFromUI();
    if (!debts.length) {
      if (!quiet) showToast('Add at least one debt with a balance');
      return;
    }
    var extra = extraSlider ? parseFloat(extraSlider.value) || 0 : 0;
    var modeEl = document.getElementById('strategy');
    var mode = modeEl ? modeEl.value : 'compare';
    var snowflakes = getSnowflakesFromUI();
    var engine = typeof PayoffEngine !== 'undefined' ? PayoffEngine : null;
    if (!engine || typeof engine.calculate !== 'function') {
      showToast('Calculation engine missing');
      return;
    }

    var snow = null;
    var aval = null;
    if (mode === 'compare' || mode === 'snowball') {
      snow = engine.calculate({ debts: debts, extra: extra, strategy: 'snowball', snowflakes: snowflakes });
    }
    if (mode === 'compare' || mode === 'avalanche') {
      aval = engine.calculate({ debts: debts, extra: extra, strategy: 'avalanche', snowflakes: snowflakes });
    }
    renderResults(snow, aval, mode);
  }
  window.runCalc = runCalc;

  var calcBtn = document.getElementById('calculate');
  if (calcBtn) calcBtn.addEventListener('click', function () { runCalc(false); });

  // ---- Save / Clear ----
  var saveBtn = document.getElementById('save-debts');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var debts = getDebtsFromUI();
      if (window._store && window._store.saveDebts) {
        window._store.saveDebts(debts);
        if (extraSlider) window._store.saveExtra(extraSlider.value);
      } else {
        try {
          localStorage.setItem('debtPayoffDebts', JSON.stringify(debts));
          if (extraSlider) localStorage.setItem('debtPayoffExtra', extraSlider.value);
        } catch (e) {}
      }
      showToast('Debts saved on this device');
    });
  }

  var clearBtn = document.getElementById('clear-all');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (debtsContainer) {
        debtsContainer.innerHTML = '';
        debtsContainer.appendChild(createDebtRow());
      }
      if (extraSlider) { extraSlider.value = 0; syncExtraDisplay(); }
      if (snowflakesContainer) snowflakesContainer.innerHTML = '';
      var results = document.getElementById('results');
      if (results) results.classList.add('hidden');
      window._lastResultsShown = false;
      showToast('Cleared');
    });
  }

  // ---- Copy summary ----
  var copyBtn = document.getElementById('copy-summary');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var snow = window._lastSnow;
      var aval = window._lastAval;
      var mode = window._lastMode || 'compare';
      var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
      if (!primary) { showToast('Run a calculation first'); return; }
      var lines = [
        'Debt Payoff Plan',
        'Debt-free date: ' + fmtDate(primary.debtFreeDate),
        'Months: ' + primary.months,
        'Total interest: ' + fmtMoney(primary.totalInterest),
        'Strategy: ' + (primary.strategy || mode)
      ];
      if (mode === 'compare' && snow && aval) {
        var better = aval.totalInterest <= snow.totalInterest ? 'Avalanche' : 'Snowball';
        lines.push('Winner: ' + better);
      }
      lines.push('Calculated privately at debt-payoff-calculator');
      var text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showToast('Summary copied'); }).catch(function () {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Summary copied'); } catch (e) { showToast('Copy failed'); }
    document.body.removeChild(ta);
  }

  // ---- Share link ----
  var shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var url = window.location.href.split('#')[0];
      if (navigator.share) {
        navigator.share({ title: 'Debt Payoff Calculator', text: 'Private snowball vs avalanche planner', url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { showToast('Link copied'); });
      } else {
        showToast(url);
      }
    });
  }

  // ---- Share image (canvas 1200x630) ----
  var shareImageBtn = document.getElementById('share-image-btn');
  if (shareImageBtn) {
    shareImageBtn.addEventListener('click', function () {
      var snow = window._lastSnow;
      var aval = window._lastAval;
      var mode = window._lastMode || 'compare';
      var primary = (mode === 'avalanche' ? aval : snow) || snow || aval;
      if (!primary) { showToast('Run a calculation first'); return; }
      var canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      var ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#0f1419';
      ctx.fillRect(0, 0, 1200, 630);
      // Accent bar
      ctx.fillStyle = '#0d6e6e';
      ctx.fillRect(0, 0, 1200, 8);
      // Title
      ctx.fillStyle = '#e8eaed';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText('Debt-Free Date', 64, 120);
      // Hero date
      ctx.fillStyle = '#3dbdbd';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.fillText(fmtDate(primary.debtFreeDate), 64, 220);
      // Stats
      ctx.fillStyle = '#9aa3b2';
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillText(primary.months + ' months  ·  ' + fmtMoney(primary.totalInterest) + ' interest  ·  ' + (primary.strategy || ''), 64, 300);
      if (mode === 'compare' && snow && aval) {
        var better = aval.totalInterest <= snow.totalInterest ? 'Avalanche' : 'Snowball';
        var saved = Math.abs(snow.totalInterest - aval.totalInterest);
        ctx.fillStyle = '#34d399';
        ctx.font = '26px system-ui, sans-serif';
        ctx.fillText('Winner: ' + better + ' — saves ' + fmtMoney(saved) + ' in interest', 64, 360);
      }
      // Footer
      ctx.fillStyle = '#5c6578';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('Private · debt-payoff-calculator  ·  Your data never leaves the browser', 64, 560);

      canvas.toBlob(function (blob) {
        if (!blob) { showToast('Image failed'); return; }
        var file = new File([blob], 'debt-free.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'My debt-free date' }).then(function () {
            unlockAchievement('share_image');
          }).catch(function () { downloadBlob(blob); });
        } else {
          downloadBlob(blob);
          unlockAchievement('share_image');
        }
      }, 'image/png');
    });
  }
  function downloadBlob(blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debt-free-date.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Image downloaded');
  }

  // ---- PDF ----
  var pdfBtn = document.getElementById('pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function () {
      var primary = window._lastSnow || window._lastAval;
      if (!primary || typeof jspdf === 'undefined') {
        showToast(primary ? 'PDF library missing' : 'Run a calculation first');
        return;
      }
      var doc = new jspdf.jsPDF();
      doc.setFontSize(18);
      doc.text('Debt Payoff Plan', 20, 20);
      doc.setFontSize(12);
      doc.text('Debt-free: ' + fmtDate(primary.debtFreeDate), 20, 35);
      doc.text('Months: ' + primary.months, 20, 45);
      doc.text('Total interest: ' + fmtMoney(primary.totalInterest), 20, 55);
      doc.text('Strategy: ' + (primary.strategy || ''), 20, 65);
      if (primary.payoffOrder && primary.payoffOrder.length) {
        doc.text('Kill order:', 20, 80);
        primary.payoffOrder.forEach(function (ev, i) {
          doc.text((i + 1) + '. ' + ev.name + ' — month ' + ev.month, 25, 90 + i * 8);
        });
      }
      doc.save('debt-payoff-plan.pdf');
      showToast('PDF downloaded');
    });
  }

  // ---- Init ----
  function init() {
    renderGameUI();
    renderAchievements();
    renderHistory();
    // Load saved debts if present and rows are still defaults
    try {
      var saved = null;
      if (window._store) saved = window._store.loadDebts();
      else {
        var raw = localStorage.getItem('debtPayoffDebts');
        if (raw) saved = JSON.parse(raw);
      }
      if (saved && saved.length && debtsContainer) {
        debtsContainer.innerHTML = '';
        saved.forEach(function (d) { debtsContainer.appendChild(createDebtRow(d)); });
      }
      var extraSaved = window._store ? window._store.loadExtra() : (localStorage.getItem('debtPayoffExtra') != null ? parseFloat(localStorage.getItem('debtPayoffExtra')) : null);
      if (extraSaved != null && extraSlider) {
        extraSlider.value = extraSaved;
        syncExtraDisplay();
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
