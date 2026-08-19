    function renderSingle(result, label, colorClass) {
      return `<div class="card border-t-4 ${colorClass}">
        <div class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">${label}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">${formatDate(result.debtFreeDate)}</div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><div class="text-slate-500 dark:text-slate-400">Total Interest</div><div class="font-semibold">${formatCurrency(result.totalInterest)}</div></div>
          <div><div class="text-slate-500 dark:text-slate-400">Months</div><div class="font-semibold">${result.months}</div></div>
        </div></div>`;
    }

    function updateProgress(result) {
      if (!result || !result.startingTotal) { progressCard.classList.add('hidden'); return; }
      const maxMonths = 120;
      const pct = Math.max(0, Math.min(100, Math.round((1 - result.months / maxMonths) * 100)));
      progressCard.classList.remove('hidden');
      progressBar.style.width = pct + '%';
      progressPct.textContent = pct + '%';
      if (result.months <= 12) {
        progressMsg.textContent = 'You’re under a year away. Keep going!';
        progressBar.classList.add('bg-emerald-500');
        progressBar.classList.remove('bg-indigo-500');
      } else if (result.months <= 36) {
        progressMsg.textContent = 'Solid progress — under 3 years.';
        progressBar.classList.add('bg-indigo-500');
      } else {
        progressMsg.textContent = 'Every extra dollar moves this bar.';
        progressBar.classList.add('bg-indigo-500');
      }
    }

    function renderResults(snow, aval, mode) {
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      lastResults = { snow, aval, mode };

      const primary = mode === 'compare'
        ? ((snow && aval) ? (snow.totalInterest <= aval.totalInterest ? snow : aval) : (snow || aval))
        : (snow || aval);
      if (primary) {
        updateCelebration(primary);
        renderKillOrder(primary);
        const debts = getDebtsFromUI();
        const extra = parseFloat(extraSlider.value) || 0;
        saveHistoryEntry({
          debts,
          extra,
          strategy: mode,
          months: primary.months,
          totalInterest: primary.totalInterest,
          debtFreeLabel: formatDate(primary.debtFreeDate),
          ts: Date.now()
        });
      }

      game.totalCalcs += 1;
      if (game.totalCalcs === 1) unlockAchievement('first_calc');
      if (game.totalCalcs >= 10) unlockAchievement('calcs_10');
      if (mode === 'compare') { game.compared = true; unlockAchievement('compare'); }
      const extra = parseFloat(extraSlider.value) || 0;
      if (extra > game.maxExtraUsed) game.maxExtraUsed = extra;
      if (extra >= 100) unlockAchievement('extra_100');
      if (extra >= 300) unlockAchievement('extra_300');
      saveGame(game);
      addXP(10, 'Calculation');

      if (mode === 'compare' && snow && aval) {
        comparisonSummary.innerHTML = renderSingle(snow, 'Snowball', 'border-indigo-400') + renderSingle(aval, 'Avalanche', 'border-emerald-400');
        const interestDiff = snow.totalInterest - aval.totalInterest;
        const monthsDiff = snow.months - aval.months;
        let banner = '';
        if (Math.abs(interestDiff) < 1 && Math.abs(monthsDiff) < 1) {
          banner = `<p class="text-emerald-800 dark:text-emerald-300 font-medium">Both strategies finish almost the same. Pick the one that keeps you motivated.</p>`;
        } else if (interestDiff > 0) {
          banner = `<p class="text-emerald-800 dark:text-emerald-300 font-medium text-lg">Avalanche wins on cost</p>
            <p class="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Save <strong>${formatCurrency(interestDiff)}</strong> in interest${monthsDiff > 0 ? ` and finish <strong>${monthsDiff} month${monthsDiff>1?'s':''}</strong> earlier` : ''}.</p>
            <p class="text-xs text-emerald-600 dark:text-emerald-500 mt-2">Snowball can still win on motivation if quick wins matter more to you.</p>`;
        } else {
          banner = `<p class="text-emerald-800 dark:text-emerald-300 font-medium text-lg">Snowball wins on speed / motivation</p>
            <p class="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Finish <strong>${Math.abs(monthsDiff)} month${Math.abs(monthsDiff)!==1?'s':''}</strong> sooner${interestDiff < 0 ? ` (Avalanche saves ${formatCurrency(-interestDiff)} in interest)` : ''}.</p>`;
        }
        winnerBanner.innerHTML = banner;
        winnerBanner.classList.remove('hidden');
        const best = snow.totalInterest <= aval.totalInterest ? snow : aval;
        drawChart([
          { label: 'Snowball', data: snow.history, color: '#6366f1' },
          { label: 'Avalanche', data: aval.history, color: '#10b981' }
        ]);
        renderSchedule(best);
        updateProgress(best);
      } else {
        const result = snow || aval;
        const label = mode === 'snowball' ? 'Snowball' : 'Avalanche';
        comparisonSummary.innerHTML = renderSingle(result, label, mode === 'snowball' ? 'border-indigo-400' : 'border-emerald-400');
        winnerBanner.classList.add('hidden');
        drawChart([{ label, data: result.history, color: mode === 'snowball' ? '#6366f1' : '#10b981' }]);
        renderSchedule(result);
        updateProgress(result);
      }
    }

    function drawChart(datasets) {
      const ctx = document.getElementById('debt-chart').getContext('2d');
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: datasets[0].data.map(h => h.month),
          datasets: datasets.map(ds => ({
            label: ds.label,
            data: ds.data.map(h => h.totalBalance),
            borderColor: ds.color,
            backgroundColor: ds.color + '22',
            fill: true,
            tension: 0.25,
            pointRadius: 0
          }))
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { ticks: { callback: v => '$' + v.toLocaleString() } },
            x: { title: { display: true, text: 'Month' } }
          }
        }
      });
    }

    function renderSchedule(result) {
      if (!result || !result.history) { scheduleEl.innerHTML = ''; return; }
      let html = `<table class="w-full text-left"><thead><tr class="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700"><th class="py-2 pr-2">Month</th><th class="py-2 pr-2">Balance</th><th class="py-2">Interest</th></tr></thead><tbody>`;
      result.history.slice(0, 36).forEach(h => {
        html += `<tr class="border-b border-slate-50 dark:border-slate-800"><td class="py-1.5 pr-2">${h.month}</td><td class="py-1.5 pr-2">${formatCurrency(h.totalBalance)}</td><td class="py-1.5">${formatCurrency(h.interest)}</td></tr>`;
      });
      if (result.history.length > 36) html += `<tr><td colspan="3" class="py-3 text-slate-400 text-center">… and ${result.history.length-36} more months</td></tr>`;
      html += '</tbody></table>';
      scheduleEl.innerHTML = html;
    }

    function runCalc() {
      const debts = getDebtsFromUI();
      if (!debts.length) { showToast('Add at least one debt with a balance'); return; }
      const extra = parseFloat(extraSlider.value) || 0;
      const strategy = document.getElementById('strategy').value;
      if (strategy === 'compare') {
        renderResults(calculatePayoff(debts, extra, 'snowball'), calculatePayoff(debts, extra, 'avalanche'), 'compare');
      } else {
        const r = calculatePayoff(debts, extra, strategy);
        renderResults(strategy === 'snowball' ? r : null, strategy === 'avalanche' ? r : null, strategy);
      }
    }

    document.getElementById('calculate').addEventListener('click', runCalc);

    extraSlider.addEventListener('input', () => {
      extraDisplay.textContent = '$' + extraSlider.value;
      if (!resultsSection.classList.contains('hidden')) runCalc();
    });

    document.querySelectorAll('.what-if').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseInt(btn.dataset.amount, 10);
        if (amt === 0) extraSlider.value = 100;
        else extraSlider.value = Math.min(1000, parseInt(extraSlider.value,10) + amt);
        extraDisplay.textContent = '$' + extraSlider.value;
        if (!resultsSection.classList.contains('hidden')) runCalc();
      });
    });

    document.getElementById('save-debts').addEventListener('click', () => {
      localStorage.setItem('debtPayoffDebts', JSON.stringify(getDebtsFromUI()));
      localStorage.setItem('debtPayoffExtra', extraSlider.value);
      showToast('Debts saved in your browser');
    });

    document.getElementById('clear-all').addEventListener('click', () => {
      if (confirm('Clear debts and results? (Gamification progress is kept)')) {
        debtsContainer.innerHTML = '';
        debtsContainer.appendChild(createDebtRow());
        debtsContainer.appendChild(createDebtRow());
        localStorage.removeItem('debtPayoffDebts');
        localStorage.removeItem('debtPayoffExtra');
        resultsSection.classList.add('hidden');
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      }
    });

    document.getElementById('share-btn').addEventListener('click', () => {
      const text = 'I just calculated my debt-free date with this free private calculator.';
      if (navigator.share) navigator.share({ title: 'Debt Payoff Calculator', text, url: location.href }).catch(()=>{});
      else navigator.clipboard.writeText(location.href).then(() => showToast('Link copied!'));
    });

    document.getElementById('copy-summary').addEventListener('click', () => {
      if (!lastResults) return;
      const r = lastResults.mode === 'compare'
        ? (lastResults.snow.totalInterest <= lastResults.aval.totalInterest ? lastResults.snow : lastResults.aval)
        : (lastResults.snow || lastResults.aval);
      const text = `Debt-free date: ${formatDate(r.debtFreeDate)}\nMonths: ${r.months}\nTotal interest: ${formatCurrency(r.totalInterest)}\nCalculated with a free private tool.`;
      navigator.clipboard.writeText(text).then(() => showToast('Summary copied'));
    });

    renderGameUI();
    renderAchievements();
    renderHistory();

    (function load() {
      const saved = localStorage.getItem('debtPayoffDebts');
      const extra = localStorage.getItem('debtPayoffExtra');
      if (extra) { extraSlider.value = extra; extraDisplay.textContent = '$' + extra; }
      if (saved) {
        try {
          const list = JSON.parse(saved);
          if (Array.isArray(list) && list.length) {
            list.forEach(d => debtsContainer.appendChild(createDebtRow(d)));
            return;
          }
        } catch(e){}
      }
      debtsContainer.appendChild(createDebtRow());
      debtsContainer.appendChild(createDebtRow());
    })();
