    // ========== THEME ==========
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');

    function updateThemeUI() {
      const isDark = document.documentElement.classList.contains('dark');
      themeIcon.textContent = isDark ? '☀️' : '🌙';
      themeLabel.textContent = isDark ? 'Light' : 'Dark';
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
    }

    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'light' : 'dark');
    });

    updateThemeUI();

    // ========== GAME STATE ==========
    const GAME_KEY = 'debtPayoffGame';
    const defaultGame = {
      xp: 0, level: 1, streak: 0, lastCheckin: null,
      achievements: {}, totalCalcs: 0, maxExtraUsed: 0, compared: false
    };

    function loadGame() {
      try {
        const raw = localStorage.getItem(GAME_KEY);
        if (raw) return { ...defaultGame, ...JSON.parse(raw) };
      } catch (e) {}
      return { ...defaultGame };
    }

    function saveGame(g) { localStorage.setItem(GAME_KEY, JSON.stringify(g)); }
    let game = loadGame();

    const ACHIEVEMENTS = [
      { id: 'first_calc', name: 'First Steps', desc: 'Run your first calculation', xp: 25 },
      { id: 'compare', name: 'Strategist', desc: 'Compare Snowball vs Avalanche', xp: 40 },
      { id: 'extra_100', name: 'Booster', desc: 'Use $100+ extra payment', xp: 30 },
      { id: 'extra_300', name: 'Aggressive', desc: 'Use $300+ extra payment', xp: 50 },
      { id: 'streak_3', name: 'Consistent', desc: '3-day check-in streak', xp: 60 },
      { id: 'streak_7', name: 'Week Warrior', desc: '7-day check-in streak', xp: 120 },
      { id: 'level_5', name: 'Rising', desc: 'Reach Level 5', xp: 80 },
      { id: 'calcs_10', name: 'Explorer', desc: 'Run 10 calculations', xp: 70 },
      { id: 'snowflake', name: 'Snowflake', desc: 'Add a one-time bonus payment', xp: 45 },
      { id: 'history_5', name: 'Time Traveler', desc: 'Save 5 calculation scenarios', xp: 55 },
      { id: 'kill_order', name: 'Debt Slayer', desc: 'View a multi-debt kill order', xp: 35 }
    ];

    function xpForLevel(level) { return level * 100; }

    function addXP(amount, reason) {
      game.xp += amount;
      let leveled = false;
      while (game.xp >= xpForLevel(game.level)) {
        game.xp -= xpForLevel(game.level);
        game.level += 1;
        leveled = true;
      }
      saveGame(game);
      renderGameUI();
      if (leveled) {
        showToast(`Level up! You are now Level ${game.level}`);
        unlockAchievement('level_5');
      }
      if (reason) showToast(`+${amount} XP — ${reason}`);
    }

    function unlockAchievement(id) {
      if (game.achievements[id]) return;
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (!ach) return;
      game.achievements[id] = Date.now();
      saveGame(game);
      renderAchievements();
      addXP(ach.xp, ach.name);
      showToast(`Achievement unlocked: ${ach.name}`);
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.remove('opacity-0');
      t.classList.add('opacity-100', 'pop-in');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => {
        t.classList.remove('opacity-100');
        t.classList.add('opacity-0');
      }, 2800);
    }

    function renderGameUI() {
      document.getElementById('streak-count').textContent = game.streak;
      document.getElementById('level-display').textContent = game.level;
      document.getElementById('xp-display').textContent = game.xp;
      const needed = xpForLevel(game.level);
      const pct = Math.min(100, Math.round((game.xp / needed) * 100));
      document.getElementById('xp-bar').style.width = pct + '%';
      document.getElementById('xp-next').textContent = (needed - game.xp) + ' XP to next';
      const today = new Date().toDateString();
      const btn = document.getElementById('checkin-btn');
      if (game.lastCheckin === today) {
        btn.textContent = 'Checked in today';
        btn.disabled = true;
        btn.classList.add('opacity-60', 'cursor-not-allowed');
      } else {
        btn.textContent = 'Daily Check-in';
        btn.disabled = false;
        btn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    }

    function renderAchievements() {
      const list = document.getElementById('achievements-list');
      let unlocked = 0;
      list.innerHTML = ACHIEVEMENTS.map(a => {
        const earned = !!game.achievements[a.id];
        if (earned) unlocked++;
        return `<span class="badge ${earned ? 'badge-earned' : 'badge-locked'}" title="${a.desc}">${earned ? '✓' : '○'} ${a.name}</span>`;
      }).join('');
      document.getElementById('ach-count').textContent = unlocked + ' / ' + ACHIEVEMENTS.length + ' unlocked';
    }

    document.getElementById('toggle-achievements').addEventListener('click', () => {
      const list = document.getElementById('achievements-list');
      list.classList.toggle('hidden');
    });

    function doCheckin() {
      const today = new Date().toDateString();
      if (game.lastCheckin === today) return;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (game.lastCheckin === yesterday.toDateString()) game.streak += 1;
      else game.streak = 1;
      game.lastCheckin = today;
      saveGame(game);
      renderGameUI();
      if (game.streak >= 3) unlockAchievement('streak_3');
      if (game.streak >= 7) unlockAchievement('streak_7');
      addXP(15, 'Daily check-in');
    }
    document.getElementById('checkin-btn').addEventListener('click', doCheckin);

    // ========== DEBTS UI & CALC ==========
    let chartInstance = null;
    let lastResults = null;

    const debtsContainer = document.getElementById('debts-container');
    const extraSlider = document.getElementById('extra-slider');
    const extraDisplay = document.getElementById('extra-display');
    const resultsSection = document.getElementById('results');
    const comparisonSummary = document.getElementById('comparison-summary');
    const winnerBanner = document.getElementById('winner-banner');
    const scheduleEl = document.getElementById('schedule');
    const progressCard = document.getElementById('progress-card');
    const progressBar = document.getElementById('progress-bar');
    const progressPct = document.getElementById('progress-pct');
    const progressMsg = document.getElementById('progress-msg');
    const strategySelect = document.getElementById('strategy');

    function createDebtRow(debt = { name: '', balance: '', apr: '', minPayment: '' }) {
      const div = document.createElement('div');
      div.className = 'grid grid-cols-1 sm:grid-cols-5 gap-2 items-end debt-row bg-slate-50/50 dark:bg-slate-700/40 p-3 rounded-xl';
      div.innerHTML = `
        <div><label class="text-xs text-slate-500 dark:text-slate-400">Name</label><input class="debt-name w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800" value="${debt.name||''}" placeholder="Credit card"></div>
        <div><label class="text-xs text-slate-500 dark:text-slate-400">Balance</label><input type="number" class="debt-balance w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800" value="${debt.balance||''}" placeholder="5000" min="0" step="0.01"></div>
        <div><label class="text-xs text-slate-500 dark:text-slate-400">APR %</label><input type="number" class="debt-apr w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800" value="${debt.apr||''}" placeholder="19.9" min="0" step="0.1"></div>
        <div><label class="text-xs text-slate-500 dark:text-slate-400">Min payment</label><input type="number" class="debt-min w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800" value="${debt.minPayment||''}" placeholder="150" min="0" step="0.01"></div>
        <div><button type="button" class="remove-debt text-red-500 hover:text-red-700 text-sm px-2 py-1.5">Remove</button></div>`;
      div.querySelector('.remove-debt').addEventListener('click', () => div.remove());
      return div;
    }

    document.getElementById('add-debt').addEventListener('click', () => debtsContainer.appendChild(createDebtRow()));

    function getDebtsFromUI() {
      const list = [];
      document.querySelectorAll('.debt-row').forEach(row => {
        const name = row.querySelector('.debt-name').value.trim() || 'Debt';
        const balance = parseFloat(row.querySelector('.debt-balance').value) || 0;
        const apr = parseFloat(row.querySelector('.debt-apr').value) || 0;
        const minPayment = parseFloat(row.querySelector('.debt-min').value) || 0;
        if (balance > 0) list.push({ name, balance, apr, minPayment });
      });
      return list;
    }

    function getSnowflakesFromUI() {
      const list = [];
      document.querySelectorAll('.snowflake-row').forEach(row => {
        const amount = parseFloat(row.querySelector('.sf-amount').value) || 0;
        const month = parseInt(row.querySelector('.sf-month').value, 10) || 0;
        if (amount > 0 && month > 0) list.push({ amount, month });
      });
      return list;
    }

    function calculatePayoff(debtList, extra, strategy, snowflakes) {
      let debts = debtList.map(d => ({ name: d.name, balance: Math.max(0,d.balance), apr: Math.max(0,d.apr), minPayment: Math.max(0,d.minPayment), paidOffMonth: null }));
      if (strategy === 'snowball') debts.sort((a,b) => a.balance - b.balance || b.apr - a.apr);
      else if (strategy === 'avalanche') debts.sort((a,b) => b.apr - a.apr || a.balance - b.balance);
      const flakes = (snowflakes || []).slice().sort((a,b) => a.month - b.month);
      let month = 0, totalInterest = 0;
      const history = [];
      const payoffOrder = [];
      const maxMonths = 720;
      const startingTotal = debts.reduce((s,d) => s + d.balance, 0);
      while (debts.some(d => d.balance > 0.005) && month < maxMonths) {
        month++;
        let remainingExtra = extra;
        flakes.forEach(f => { if (f.month === month) remainingExtra += f.amount; });
        let monthInterest = 0;
        debts.forEach(d => {
          if (d.balance > 0) {
            const interest = d.balance * (d.apr / 100 / 12);
            d.balance += interest;
            monthInterest += interest;
            totalInterest += interest;
          }
        });
        debts.forEach(d => {
          if (d.balance > 0) {
            const pay = Math.min(d.minPayment, d.balance);
            d.balance -= pay;
          }
        });
        for (const d of debts) {
          if (d.balance > 0.005 && remainingExtra > 0) {
            const pay = Math.min(remainingExtra, d.balance);
            d.balance -= pay;
            remainingExtra -= pay;
          }
        }
        debts.forEach(d => {
          if (d.balance < 0.005) {
            if (d.paidOffMonth === null && d.balance >= 0) {
              d.paidOffMonth = month;
              payoffOrder.push({ name: d.name, month, date: addMonths(new Date(), month) });
            }
            d.balance = 0;
          }
        });
        const totalBal = debts.reduce((s,d) => s + d.balance, 0);
        history.push({ month, totalBalance: Math.round(totalBal*100)/100, interest: Math.round(monthInterest*100)/100 });
        if (totalBal < 0.01) break;
      }
      return { months: month, totalInterest: Math.round(totalInterest*100)/100, history, payoffOrder, debtFreeDate: addMonths(new Date(), month), strategy, startingTotal };
    }

    function addMonths(date, months) {
      const d = new Date(date.getTime());
      d.setMonth(d.getMonth() + months);
      return d;
    }
    function formatCurrency(n) {
      return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function formatDate(d) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    // ========== CALC HISTORY ==========
    const HISTORY_KEY = 'debtPayoffHistory';
    function loadHistory() {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) return JSON.parse(raw);
      } catch(e) {}
      return [];
    }
    function saveHistoryEntry(entry) {
      let list = loadHistory();
      list.unshift(entry);
      list = list.slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      renderHistory();
    }
    function renderHistory() {
      const list = loadHistory();
      const el = document.getElementById('history-list');
      if (!list.length) {
        el.innerHTML = '<span class="text-xs text-slate-400">No scenarios yet — run a calculation to save one.</span>';
        return;
      }
      el.innerHTML = list.map((h, i) => {
        const label = `${h.debts.length} debt${h.debts.length!==1?'s':''} · +$${h.extra} · ${h.months} mo · ${h.strategy}`;
        return `<button type="button" class="history-chip" data-idx="${i}" title="Debt-free: ${h.debtFreeLabel}">${label}</button>`;
      }).join('');
      el.querySelectorAll('.history-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const h = loadHistory()[idx];
          if (!h) return;
          debtsContainer.innerHTML = '';
          h.debts.forEach(d => debtsContainer.appendChild(createDebtRow(d)));
          extraSlider.value = h.extra;
          extraDisplay.textContent = '$' + h.extra;
          strategySelect.value = h.strategy === 'compare' ? 'compare' : h.strategy;
          showToast('Scenario restored — hit Calculate to re-run');
        });
      });
    }
    document.getElementById('clear-history').addEventListener('click', () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      showToast('History cleared');
    });

    // ========== CONFETTI ==========
    function launchConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
      const pieces = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.15 + Math.random() * 0.3
      }));
      let frames = 0;
      function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          ctx.restore();
        });
        frames++;
        if (frames < 160) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(frame);
    }

    function updateCelebration(result) {
      const banner = document.getElementById('celebration-banner');
      if (!result || result.months > 18) {
        banner.classList.add('hidden');
        return;
      }
      banner.classList.remove('hidden');
      const title = document.getElementById('celebration-title');
      const msg = document.getElementById('celebration-msg');
      if (result.months <= 3) {
        title.textContent = 'Debt freedom is right around the corner!';
        msg.textContent = `Only ${result.months} month${result.months===1?'':'s'} left. You are crushing it.`;
        launchConfetti();
      } else if (result.months <= 12) {
        title.textContent = 'Under a year to debt-free!';
        msg.textContent = `${result.months} months left — every extra dollar shortens this.`;
        launchConfetti();
      } else {
        title.textContent = 'You can see the finish line';
        msg.textContent = `${result.months} months remaining. Keep the momentum.`;
      }
    }

    function renderKillOrder(result) {
      const card = document.getElementById('kill-order-card');
      const timeline = document.getElementById('kill-order-timeline');
      if (!result || !result.payoffOrder || !result.payoffOrder.length) {
        card.classList.add('hidden');
        return;
      }
      card.classList.remove('hidden');
      timeline.innerHTML = result.payoffOrder.map((p, i) => `
        <div class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="flex flex-wrap items-baseline justify-between gap-1">
            <span class="font-semibold text-slate-800 dark:text-slate-100">${i+1}. ${p.name}</span>
            <span class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">${formatDate(p.date)}</span>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Month ${p.month}</div>
        </div>`).join('');
    }
