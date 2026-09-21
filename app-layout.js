/**
 * app-layout.js — restore DESIGN.md hierarchy after feature modules inject cards.
 * Core order: hero → celebration → winner → summary → progress → charts → kill → cash → schedule → share → scenarios
 * Scenario modules collapse into #scenarios-panel.
 */
(function () {
  'use strict';

  var CORE_IDS = [
    'hero-card',
    'celebration-banner',
    'winner-banner',
    'summary-cards',
    'progress-card',
    'charts-wrap',
    'kill-order-card',
    'cash-freed-card',
    'vs-minimums-card',
    'schedule-card'
  ];

  var ADVANCED_IDS = [
    'balance-transfer-section',
    'bt-card',
    'consolidation-section',
    'consol-card'
  ];

  function ensureScenariosPanel() {
    var results = document.getElementById('results');
    if (!results) return null;
    var panel = document.getElementById('scenarios-panel');
    if (panel) return panel;
    panel = document.createElement('details');
    panel.id = 'scenarios-panel';
    panel.className = 'card';
    panel.innerHTML =
      '<summary class="cursor-pointer list-none flex items-center justify-between gap-3 min-h-[44px]">' +
      '<span class="text-lg font-semibold text-accent">Explore more scenarios</span>' +
      '<span class="text-xs text-slate-500 dark:text-slate-400" id="scenarios-count">What-ifs, tools, stress tests</span>' +
      '</summary>' +
      '<div id="scenarios-body" class="mt-4 space-y-4"></div>';
    var hist = document.getElementById('history-card');
    if (hist && hist.parentNode === results) results.insertBefore(panel, hist);
    else results.appendChild(panel);
    return panel;
  }

  function ensureAdvancedShell() {
    var debtsSection = document.querySelector('section.card[aria-labelledby="debts-heading"]');
    if (!debtsSection) return null;
    var shell = document.getElementById('advanced-tools');
    if (shell) return shell;
    shell = document.createElement('details');
    shell.id = 'advanced-tools';
    shell.className = 'mt-6 pt-4 border-t border-[var(--line)]';
    shell.innerHTML =
      '<summary class="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300 min-h-[44px] flex items-center">' +
      'Advanced tools <span class="text-xs text-slate-400 font-normal ml-2">Balance transfer · Consolidation</span></summary>' +
      '<div id="advanced-tools-body" class="mt-3 space-y-4"></div>';
    var strat = debtsSection.querySelector('#strategy');
    if (strat) {
      var row = strat.closest('.flex') || strat.parentNode;
      debtsSection.insertBefore(shell, row);
    } else {
      debtsSection.appendChild(shell);
    }
    return shell;
  }

  function demoteGameBar() {
    var bar = document.getElementById('game-bar');
    var header = document.querySelector('header');
    if (!bar || !header || bar._demoted) return;
    bar._demoted = true;
    bar.classList.add('opacity-95');
    if (header.nextSibling) header.parentNode.insertBefore(bar, header.nextSibling);
    else header.parentNode.appendChild(bar);
    bar.classList.add('text-sm');
  }

  function moveAdvancedTools() {
    var shell = ensureAdvancedShell();
    if (!shell) return;
    var body = document.getElementById('advanced-tools-body');
    if (!body) return;
    var debtsSection = document.querySelector('section.card[aria-labelledby="debts-heading"]');
    if (!debtsSection) return;
    var nodes = Array.prototype.slice.call(debtsSection.children);
    nodes.forEach(function (node) {
      if (node.id === 'advanced-tools') return;
      var text = (node.innerText || '').slice(0, 120).toLowerCase();
      if (
        text.indexOf('balance-transfer') !== -1 ||
        text.indexOf('balance transfer') !== -1 ||
        text.indexOf('consolidation loan') !== -1 ||
        (node.id && ADVANCED_IDS.indexOf(node.id) !== -1)
      ) {
        body.appendChild(node);
      }
    });
  }

  function layoutCoreResults() {
    var results = document.getElementById('results');
    if (!results || results.classList.contains('hidden')) return;

    var panel = ensureScenariosPanel();
    var body = document.getElementById('scenarios-body');
    if (!body) return;

    var coreNodes = [];
    CORE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) coreNodes.push(el);
    });

    var shareRow = null;
    results.querySelectorAll(':scope > .flex.flex-wrap').forEach(function (row) {
      if (row.querySelector('#copy-summary-btn, #share-btn, #pdf-btn')) shareRow = row;
    });

    var keepOut = {
      'scenarios-panel': 1,
      'history-card': 1,
      'monetization-card': 1,
      'achievements-panel': 1
    };
    CORE_IDS.forEach(function (id) { keepOut[id] = 1; });

    var extras = [];
    Array.prototype.slice.call(results.children).forEach(function (child) {
      if (child === panel || child === shareRow) return;
      if (child.id && keepOut[child.id]) return;
      if (child.id === 'history-card' || child.id === 'monetization-card') return;
      if (
        child.classList.contains('card') ||
        (child.id && /-card$/.test(child.id)) ||
        child.tagName === 'SECTION'
      ) {
        extras.push(child);
      }
    });

    var hist = document.getElementById('history-card');
    var mon = document.getElementById('monetization-card');

    coreNodes.forEach(function (n) { results.appendChild(n); });
    if (shareRow) results.appendChild(shareRow);

    extras.forEach(function (n) {
      if (n.id === 'vs-minimums-card') return;
      body.appendChild(n);
    });
    results.appendChild(panel);
    if (hist) results.appendChild(hist);
    if (mon) results.appendChild(mon);

    var countEl = document.getElementById('scenarios-count');
    if (countEl) {
      var n = body.children.length;
      countEl.textContent = n ? n + ' tools & what-ifs' : 'What-ifs, tools, stress tests';
    }
  }

  window.layoutCoreResults = layoutCoreResults;

  function boot() {
    demoteGameBar();
    ensureScenariosPanel();
    moveAdvancedTools();
    setTimeout(moveAdvancedTools, 400);
    setTimeout(moveAdvancedTools, 1200);
    var calc = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calc && !calc._layoutBound) {
      calc._layoutBound = true;
      calc.addEventListener('click', function () {
        setTimeout(layoutCoreResults, 50);
        setTimeout(layoutCoreResults, 400);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
