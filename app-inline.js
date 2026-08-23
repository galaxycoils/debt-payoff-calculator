  // Theme
  var themeToggle = document.getElementById('theme-toggle');
  function updateThemeUI() {
    var isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
    document.getElementById('theme-label').textContent = isDark ? 'Light' : 'Dark';
  }
  function setTheme(mode) {
    if (mode === 'dark') { document.documentElement.classList.add('dark'); localStorage.setItem('debtPayoffTheme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('debtPayoffTheme', 'light'); }
    updateThemeUI();
  }
  themeToggle.addEventListener('click', function () {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });
  updateThemeUI();

  var GAME_KEY = 'debtPayoffGame';
  var defaultGame = { xp: 0, level: 1, streak: 0, lastCheckin: null, achievements: {}, totalCalcs: 0, maxExtraUsed: 0 };
  function loadGame() {
    try { var raw = localStorage.getItem(GAME_KEY); if (raw) return Object.assign({}, defaultGame, JSON.parse(raw)); } catch (e) {}
    return Object.assign({}, defaultGame);
  }
  function saveGame(g) { localStorage.setItem(GAME_KEY, JSON.stringify(g)); }
  var game = loadGame();
  var ACHIEVEMENTS = [
    { id: 'first_calc', name: 'First Steps', desc: 'Run your first calculation', xp: 25 },
    { id: 'compare', name: 'Strategist', desc: 'Compare Snowball vs Avalanche', xp: 40 },
    { id: 'extra_100', name: 'Booster', desc: 'Use $100+ extra payment', xp: 30 },
    { id: 'extra_300', name: 'Aggressive', desc: 'Use $300+ extra payment', xp: 50 },
    { id: 'streak_3', name: 'Consistent', desc: '3-day check-in streak', xp: 60 },
    { id: 'streak_7', name: 'Week Warrior', desc: '7-day check-in streak', xp: 120 },
    { id: 'level_5', name: 'Rising', desc: 'Reach Level 5', xp: 80 },
    { id: 'calcs_10', name: 'Explorer', desc: 'Run 10 calculations', xp: 70 },
    { id: 'snowflake', name: 'Snowflake', desc: 'Add a one-time bonus payment', xp: 45 },
    { id: 'share_image', name: 'Show-off', desc: 'Export a shareable result image', xp: 55 }
  ];
  function xpForLevel(level) { return level * 100; }
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('opacity-0');
    t.classList.add('opacity-100');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { t.classList.add('opacity-0'); t.classList.remove('opacity-100'); }, 2800);
  }
  function renderGameUI() {
    document.getElementById('streak-count').textContent = game.streak;
    document.getElementById('level-display').textContent = game.level;
    document.getElementById('xp-display').textContent = game.xp;
    var needed = xpForLevel(game.level);
    document.getElementById('xp-bar').style.width = Math.min(100, Math.round((game.xp / needed) * 100)) + '%';
    document.getElementById('xp-next').textContent = (needed - game.xp) + ' XP to next';
    var today = new Date().toDateString();
    var btn = document.getElementById('checkin-btn');
    if (game.lastCheckin === today) { btn.textContent = 'Checked in today'; btn.disabled = true; }
    else { btn.textContent = 'Daily Check-in'; btn.disabled = false; }
  }
  function renderAchievements() {
    var unlocked = 0;
    document.getElementById('achievements-list').innerHTML = ACHIEVEMENTS.map(function (a) {
      var earned = !!game.achievements[a.id];
      if (earned) unlocked++;
      return '<span class="badge ' + (earned ? 'badge-earned' : 'badge-locked') + '" title="' + a.desc + '">' + (earned ? '✓' : '○') + ' ' + a.name + '</span>';
    }).join('');
    document.getElementById('ach-count').textContent = unlocked + ' / ' + ACHIEVEMENTS.length + ' unlocked';
  }
  function addXP(amount, reason) {
    game.xp += amount;
    while (game.xp >= xpForLevel(game.level)) { game.xp -= xpForLevel(game.level); game.level += 1; showToast('Level up! Level ' + game.level); }
    saveGame(game); renderGameUI();
    if (reason) showToast('+' + amount + ' XP — ' + reason);
  }
  function unlockAchievement(id) {
    if (game.achievements[id]) return;
    var ach = ACHIEVEMENTS.find(function (a) { return a.id === id; });
    if (!ach) return;
    game.achievements[id] = Date.now(); saveGame(game); renderAchievements(); addXP(ach.xp, ach.name);
  }
  document.getElementById('checkin-btn').addEventListener('click', function () {
    var today = new Date().toDateString();
    if (game.lastCheckin === today) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    game.streak = (game.lastCheckin === y.toDateString()) ? game.streak + 1 : 1;
    game.lastCheckin = today; saveGame(game); renderGameUI();
    if (game.streak >= 3) unlockAchievement('streak_3');
    if (game.streak >= 7) unlockAchievement('streak_7');
    addXP(15, 'Daily check-in');
  });

  var debtsContainer = document.getElementById('debts-container');
  var extraSlider = document.getElementById('extra-slider');
  var extraDisplay = document.getElementById('extra-display');
  var resultsSection = document.getElementById('results');
  var chartInstance = null;
  var lastResults = null;
  var HISTORY_KEY = 'debtPayoffHistory';

  function createDebtRow(debt) {
    debt = debt || {};
    var div = document.createElement('div');
    div.className = 'grid grid-cols-1 sm:grid-cols-5 gap-2 items-end debt-row bg-slate-50/50 dark:bg-slate-700/40 p-3 rounded-xl';
    div.innerHTML = '<div><label class="text-xs text-slate-500 dark:text-slate-400">Name</label><input class="debt-name w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (debt.name || '') + '" placeholder="Credit card"></div>' +
      '<div><label class="text-xs text-slate-500 dark:text-slate-400">Balance</label><input type="number" class="debt-balance w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (debt.balance || '') + '" placeholder="5000" min="0" step="0.01"></div>' +
      '<div><label class="text-xs text-slate-500 dark:text-slate-400">APR %</label><input type="number" class="debt-apr w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (debt.apr || '') + '" placeholder="19.9" min="0" step="0.1"></div>' +
      '<div><label class="text-xs text-slate-500 dark:text-slate-400">Min payment</label><input type="number" class="debt-min w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (debt.minPayment || '') + '" placeholder="150" min="0" step="0.01"></div>' +
      '<div><button type="button" class="remove-debt text-red-500 text-sm px-2 py-2 min-h-[44px]">Remove</button></div>';
    div.querySelector('.remove-debt').addEventListener('click', function () { div.remove(); });
    return div;
  }
  document.getElementById('add-debt').addEventListener('click', function () { debtsContainer.appendChild(createDebtRow()); });
  function getDebtsFromUI() {
    var list = [];
    document.querySelectorAll('.debt-row').forEach(function (row) {
      var balance = parseFloat(row.querySelector('.debt-balance').value) || 0;
      if (balance > 0) list.push({
        name: row.querySelector('.debt-name').value.trim() || 'Debt',
        balance: balance,
        apr: parseFloat(row.querySelector('.debt-apr').value) || 0,
        minPayment: parseFloat(row.querySelector('.debt-min').value) || 0
      });
    });
    return list;
  }
  function createSnowflakeRow(sf) {
    sf = sf || {};
    var div = document.createElement('div');
    div.className = 'snowflake-row flex flex-wrap gap-2 items-end bg-sky-50/50 dark:bg-sky-900/20 p-2 rounded-lg';
    div.innerHTML = '<div><label class="text-xs text-slate-500">Amount $</label><input type="number" class="sf-amount w-28 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (sf.amount || '') + '" min="0"></div>' +
      '<div><label class="text-xs text-slate-500">Month #</label><input type="number" class="sf-month w-24 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-800" value="' + (sf.month || '') + '" min="1"></div>' +
      '<button type="button" class="remove-sf text-red-500 text-sm min-h-[44px] px-2">Remove</button>';
    div.querySelector('.remove-sf').addEventListener('click', function () { div.remove(); });
    return div;
  }
  document.getElementById('add-snowflake').addEventListener('click', function () {
    document.getElementById('snowflakes-container').appendChild(createSnowflakeRow());
    unlockAchievement('snowflake');
  });
  function getSnowflakesFromUI() {
    var list = [];
    document.querySelectorAll('.snowflake-row').forEach(function (row) {
      var amount = parseFloat(row.querySelector('.sf-amount').value) || 0;
      var month = parseInt(row.querySelector('.sf-month').value, 10) || 0;
      if (amount > 0 && month > 0) list.push({ amount: amount, month: month });
    });
    return list;
  }
  function formatCurrency(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  function calculatePayoff(debtList, extra, strategy, snowflakes) {
    if (typeof PayoffEngine === 'undefined' || !PayoffEngine.calculate) {
      console.error('PayoffEngine missing');
      return { months: 0, totalInterest: 0, history: [], payoffOrder: [], debtFreeDate: new Date(), strategy: strategy, startingTotal: 0 };
    }
    return PayoffEngine.calculate({ debts: debtList, extra: extra, strategy: strategy, snowflakes: snowflakes || [] });
  }
  function renderSingle(result, label, colorClass) {
    return '<div class="card border-t-4 ' + colorClass + '"><div class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">' + label + '</div>' +
      '<div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">' + formatDate(result.debtFreeDate) + '</div>' +
      '<div class="grid grid-cols-2 gap-3 text-sm"><div><div class="text-slate-500 dark:text-slate-400">Total Interest</div><div class="font-semibold">' + formatCurrency(result.totalInterest) + '</div></div>' +
      '<div><div class="text-slate-500 dark:text-slate-400">Months</div><div class="font-semibold">' + result.months + '</div></div></div></div>';
  }
  function updateProgress(result) {
    var card = document.getElementById('progress-card');
    if (!result) { card.classList.add('hidden'); return; }
    var pct = Math.max(0, Math.min(100, Math.round((1 - result.months / 120) * 100)));
    card.classList.remove('hidden');
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-pct').textContent = pct + '%';
    document.getElementById('progress-msg').textContent = result.months <= 12 ? 'Under a year — keep going!' : 'Every extra dollar moves this bar.';
  }
  function renderKillOrder(result) {
    var card = document.getElementById('kill-order-card');
    var timeline = document.getElementById('kill-order-timeline');
    if (!result || !result.payoffOrder || !result.payoffOrder.length) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    timeline.innerHTML = result.payoffOrder.map(function (p, i) {
      return '<div class="text-sm"><span class="font-semibold">' + (i + 1) + '. ' + p.name + '</span> — <span class="text-indigo-600 dark:text-indigo-400">' + formatDate(p.date) + '</span> <span class="text-xs text-slate-400">(month ' + p.month + ')</span></div>';
    }).join('');
  }
  function updateCelebration(result) {
    var banner = document.getElementById('celebration-banner');
    if (!result || result.months > 18) { banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    document.getElementById('celebration-title').textContent = result.months <= 12 ? 'Under a year to debt-free!' : 'You can see the finish line';
    document.getElementById('celebration-msg').textContent = result.months + ' months remaining.';
  }
  function drawChart(datasets) {
    var ctx = document.getElementById('debt-chart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: (datasets[0] && datasets[0].data.map(function (h) { return h.month; })) || [],
        datasets: datasets.map(function (ds) {
          return { label: ds.label, data: ds.data.map(function (h) { return h.totalBalance; }), borderColor: ds.color, backgroundColor: ds.color + '22', fill: true, tension: 0.25, pointRadius: 0 };
        })
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: function (v) { return '$' + Number(v).toLocaleString(); } } } } }
    });
  }
  function renderSchedule(result) {
    var el = document.getElementById('schedule');
    if (!result || !result.history) { el.innerHTML = ''; return; }
    var html = '<table class="w-full text-left"><thead><tr class="text-slate-500 border-b border-slate-200 dark:border-slate-600"><th class="py-2 pr-2">Month</th><th class="py-2 pr-2">Balance</th><th class="py-2">Interest</th></tr></thead><tbody>';
    result.history.slice(0, 36).forEach(function (h) {
      html += '<tr class="border-b border-slate-50 dark:border-slate-800"><td class="py-1.5 pr-2">' + h.month + '</td><td class="py-1.5 pr-2">' + formatCurrency(h.totalBalance) + '</td><td class="py-1.5">' + formatCurrency(h.interest) + '</td></tr>';
    });
    if (result.history.length > 36) html += '<tr><td colspan="3" class="py-3 text-slate-400 text-center">… and ' + (result.history.length - 36) + ' more months</td></tr>';
    el.innerHTML = html + '</tbody></table>';
  }
  function saveScenarioToHistory(primary, extra) {
    try {
      var list = loadHistory();
      list.unshift({ debts: getDebtsFromUI(), extra: extra, months: primary.months, totalInterest: primary.totalInterest, strategy: primary.strategy, debtFreeDate: primary.debtFreeDate instanceof Date ? primary.debtFreeDate.toISOString() : primary.debtFreeDate, at: Date.now() });
      list = list.slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      if (window._store && typeof window._store.saveHistory === 'function') window._store.saveHistory(list);
      renderHistory();
    } catch (e) {}
  }
  function renderResults(snow, aval, mode) {
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    lastResults = { snow: snow, aval: aval, mode: mode };
    var primary = mode === 'compare' ? (snow.totalInterest <= aval.totalInterest ? snow : aval) : (snow || aval);
    updateCelebration(primary);
    renderKillOrder(primary);
    updateProgress(primary);
    game.totalCalcs += 1;
    if (game.totalCalcs === 1) unlockAchievement('first_calc');
    if (game.totalCalcs >= 10) unlockAchievement('calcs_10');
    if (mode === 'compare') unlockAchievement('compare');
    var extra = parseFloat(extraSlider.value) || 0;
    if (extra >= 100) unlockAchievement('extra_100');
    if (extra >= 300) unlockAchievement('extra_300');
    saveGame(game);
    addXP(10, 'Calculation');
    saveScenarioToHistory(primary, extra);
    var summary = document.getElementById('comparison-summary');
    var winner = document.getElementById('winner-banner');
    if (mode === 'compare' && snow && aval) {
      summary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-400') + renderSingle(aval, 'Avalanche', 'border-emerald-400');
      var interestDiff = snow.totalInterest - aval.totalInterest;
      var banner = '';
      if (Math.abs(interestDiff) < 1) banner = '<p class="text-emerald-800 dark:text-emerald-300 font-medium">Both strategies finish almost the same.</p>';
      else if (interestDiff > 0) banner = '<p class="text-emerald-800 dark:text-emerald-300 font-medium text-lg">Avalanche wins on cost</p><p class="text-sm mt-1">Save <strong>' + formatCurrency(interestDiff) + '</strong> in interest.</p>';
      else banner = '<p class="text-indigo-800 dark:text-indigo-300 font-medium text-lg">Snowball wins on cost here</p><p class="text-sm mt-1">Save <strong>' + formatCurrency(-interestDiff) + '</strong> in interest.</p>';
      winner.innerHTML = banner; winner.classList.remove('hidden');
      drawChart([{ label: 'Snowball', data: snow.history, color: '#6366f1' }, { label: 'Avalanche', data: aval.history, color: '#10b981' }]);
      renderSchedule(primary);
    } else {
      var result = snow || aval;
      var label = mode === 'snowball' ? 'Snowball' : 'Avalanche';
      summary.innerHTML = renderSingle(result, label, mode === 'snowball' ? 'border-indigo-400' : 'border-emerald-400');
      winner.classList.add('hidden');
      drawChart([{ label: label, data: result.history, color: mode === 'snowball' ? '#6366f1' : '#10b981' }]);
      renderSchedule(result);
    }
  }
  function runCalc() {
    var debts = getDebtsFromUI();
    if (!debts.length) { showToast('Add at least one debt with a balance'); return; }
    var extra = parseFloat(extraSlider.value) || 0;
    var strategy = document.getElementById('strategy').value;
    var flakes = getSnowflakesFromUI();
    if (strategy === 'compare') {
      renderResults(calculatePayoff(debts, extra, 'snowball', flakes), calculatePayoff(debts, extra, 'avalanche', flakes), 'compare');
    } else {
      var r = calculatePayoff(debts, extra, strategy, flakes);
      renderResults(strategy === 'snowball' ? r : null, strategy === 'avalanche' ? r : null, strategy);
    }
  }
  document.getElementById('calculate').addEventListener('click', runCalc);
  extraSlider.addEventListener('input', function () {
    extraDisplay.textContent = '$' + extraSlider.value;
    if (!resultsSection.classList.contains('hidden')) runCalc();
  });
  document.querySelectorAll('.what-if').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var amt = parseInt(btn.getAttribute('data-amount'), 10);
      extraSlider.value = amt === 0 ? 100 : Math.min(1000, parseInt(extraSlider.value, 10) + amt);
      extraDisplay.textContent = '$' + extraSlider.value;
      if (!resultsSection.classList.contains('hidden')) runCalc();
    });
  });
  document.getElementById('save-debts').addEventListener('click', function () {
    localStorage.setItem('debtPayoffDebts', JSON.stringify(getDebtsFromUI()));
    localStorage.setItem('debtPayoffExtra', extraSlider.value);
    showToast('Debts saved in your browser');
  });
  document.getElementById('clear-all').addEventListener('click', function () {
    if (!confirm('Clear debts and results? (Gamification is kept)')) return;
    debtsContainer.innerHTML = '';
    debtsContainer.appendChild(createDebtRow());
    debtsContainer.appendChild(createDebtRow());
    document.getElementById('snowflakes-container').innerHTML = '';
    localStorage.removeItem('debtPayoffDebts');
    resultsSection.classList.add('hidden');
  });
  document.getElementById('share-btn').addEventListener('click', function () {
    var text = 'I calculated my debt-free date with this free private tool.';
    if (navigator.share) navigator.share({ title: 'Debt Payoff Calculator', text: text, url: location.href }).catch(function () {});
    else navigator.clipboard.writeText(location.href).then(function () { showToast('Link copied'); });
  });
  document.getElementById('copy-summary').addEventListener('click', function () {
    if (!lastResults) return;
    var r = lastResults.mode === 'compare' ? (lastResults.snow.totalInterest <= lastResults.aval.totalInterest ? lastResults.snow : lastResults.aval) : (lastResults.snow || lastResults.aval);
    var text = 'Debt-free: ' + formatDate(r.debtFreeDate) + '\nMonths: ' + r.months + '\nInterest: ' + formatCurrency(r.totalInterest) + '\n\nPrivate calculator: ' + location.href;
    navigator.clipboard.writeText(text).then(function () { showToast('Summary copied'); });
  });
  function drawShareCard(r) {
    var W = 1200, H = 630;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(1, '#0f766e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, 48, 48, W - 96, H - 96, 28);
    ctx.fill();
    ctx.fillStyle = '#e0e7ff';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText('Debt Payoff Plan', 80, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText(formatDate(r.debtFreeDate), 80, 210);
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillText('Debt-free date', 80, 250);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px system-ui, sans-serif';
    ctx.fillText(String(r.months) + ' mo', 80, 360);
    ctx.fillText(formatCurrency(r.totalInterest), 360, 360);
    ctx.fillStyle = '#c7d2fe';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText('Months to free', 80, 400);
    ctx.fillText('Total interest', 360, 400);
    ctx.fillStyle = '#e0e7ff';
    ctx.font = '500 22px system-ui, sans-serif';
    var strat = (r.strategy || 'plan').charAt(0).toUpperCase() + (r.strategy || 'plan').slice(1);
    ctx.fillText(strat + ' strategy  ·  100% private in-browser', 80, 500);
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText('debt-payoff-calculator-six.vercel.app', 80, 540);
    return canvas;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  document.getElementById('share-image-btn').addEventListener('click', function () {
    if (!lastResults) { showToast('Run a calculation first'); return; }
    var r = lastResults.mode === 'compare'
      ? (lastResults.snow.totalInterest <= lastResults.aval.totalInterest ? lastResults.snow : lastResults.aval)
      : (lastResults.snow || lastResults.aval);
    var canvas = drawShareCard(r);
    canvas.toBlob(function (blob) {
      if (!blob) { showToast('Could not create image'); return; }
      var file = new File([blob], 'debt-free-date.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My debt-free date', text: 'Debt-free ' + formatDate(r.debtFreeDate) + ' · ' + r.months + ' months · Interest ' + formatCurrency(r.totalInterest) })
          .then(function () { unlockAchievement('share_image'); showToast('Shared!'); })
          .catch(function () { downloadShareImage(canvas); });
      } else {
        downloadShareImage(canvas);
      }
    }, 'image/png');
  });
  function downloadShareImage(canvas) {
    var a = document.createElement('a');
    a.download = 'debt-free-date.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    unlockAchievement('share_image');
    showToast('Image downloaded — share it!');
  }
  document.getElementById('pdf-btn').addEventListener('click', function () {
    if (!lastResults || typeof window.jspdf === 'undefined') { showToast('PDF library loading…'); return; }
    var r = lastResults.mode === 'compare' ? (lastResults.snow.totalInterest <= lastResults.aval.totalInterest ? lastResults.snow : lastResults.aval) : (lastResults.snow || lastResults.aval);
    var doc = new window.jspdf.jsPDF();
    doc.setFontSize(16); doc.text('Debt Payoff Plan', 14, 20);
    doc.setFontSize(11);
    doc.text('Debt-free: ' + formatDate(r.debtFreeDate), 14, 32);
    doc.text('Months: ' + r.months + '  |  Interest: ' + formatCurrency(r.totalInterest), 14, 40);
    doc.text('Strategy: ' + r.strategy, 14, 48);
    if (r.payoffOrder && r.payoffOrder.length) {
      doc.text('Kill order:', 14, 60);
      r.payoffOrder.forEach(function (o, i) { doc.text((i + 1) + '. ' + o.name + ' — month ' + o.month, 18, 68 + i * 8); });
    }
    doc.save('debt-payoff-plan.pdf');
    showToast('PDF downloaded');
  });
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }
  function renderHistory() {
    var list = loadHistory();
    var el = document.getElementById('history-list');
    if (!list.length) { el.innerHTML = '<span class="text-xs text-slate-400">No scenarios yet — calculate to save</span>'; return; }
    el.innerHTML = list.map(function (h, i) {
      return '<button type="button" class="history-chip" data-idx="' + i + '">' + (h.debts ? h.debts.length : '?') + ' debts · +$' + h.extra + ' · ' + h.months + ' mo</button>';
    }).join('');
    el.querySelectorAll('.history-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var h = loadHistory()[idx];
        if (!h || !h.debts) return;
        debtsContainer.innerHTML = '';
        h.debts.forEach(function (d) { debtsContainer.appendChild(createDebtRow(d)); });
        if (h.extra != null) {
          extraSlider.value = h.extra;
          extraDisplay.textContent = '$' + h.extra;
        }
        showToast('Scenario restored — hit Calculate');
      });
    });
  }
  document.getElementById('clear-history').addEventListener('click', function () {
    localStorage.removeItem(HISTORY_KEY);
    if (window._store && typeof window._store.saveHistory === 'function') window._store.saveHistory([]);
    renderHistory();
    showToast('History cleared');
  });
  renderGameUI(); renderAchievements(); renderHistory();
  (function load() {
    var saved = localStorage.getItem('debtPayoffDebts');
    var extra = localStorage.getItem('debtPayoffExtra');
    if (extra) { extraSlider.value = extra; extraDisplay.textContent = '$' + extra; }
    if (saved) {
      try {
        var list = JSON.parse(saved);
        if (Array.isArray(list) && list.length) { list.forEach(function (d) { debtsContainer.appendChild(createDebtRow(d)); }); return; }
      } catch (e) {}
    }
    debtsContainer.appendChild(createDebtRow());
    debtsContainer.appendChild(createDebtRow());
  })();
