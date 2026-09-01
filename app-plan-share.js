/**
 * Load #p= plans into the form and copy shareable scenario links.
 */
(function () {
  'use strict';

  function applyPlan(plan) {
    if (!plan || typeof createDebtRow !== 'function') return false;
    var container = document.getElementById('debts-container');
    if (!container) return false;
    if (plan.debts && plan.debts.length) {
      container.innerHTML = '';
      plan.debts.forEach(function (d) { container.appendChild(createDebtRow(d)); });
    }
    var slider = document.getElementById('extra-slider');
    var extraDisplay = document.getElementById('extra-display');
    if (slider && plan.extra != null) {
      var max = parseFloat(slider.max) || 1000;
      if (plan.extra > max) slider.max = String(Math.ceil(plan.extra / 100) * 100);
      slider.value = String(plan.extra);
      if (extraDisplay) extraDisplay.textContent = '$' + plan.extra;
    }
    var strategy = document.getElementById('strategy');
    if (strategy && plan.strategy) strategy.value = plan.strategy === 'avalanche' ? 'avalanche' : 'compare';
    var calc = document.getElementById('calculate-btn');
    if (calc) calc.click();
    if (typeof showToast === 'function') showToast('Loaded shared plan');
    return true;
  }

  function currentPlan() {
    if (typeof getDebtsFromUI !== 'function') return null;
    var debts = getDebtsFromUI();
    var slider = document.getElementById('extra-slider');
    var strategy = document.getElementById('strategy');
    return {
      debts: debts,
      extra: slider ? parseFloat(slider.value) || 0 : 0,
      strategy: strategy && strategy.value === 'avalanche' ? 'avalanche' : 'snowball'
    };
  }

  function copyLink() {
    if (typeof PlanShare === 'undefined') return;
    var plan = currentPlan();
    if (!plan || !plan.debts.length) {
      if (typeof showToast === 'function') showToast('Add debts first');
      return;
    }
    var url = location.origin + location.pathname + PlanShare.toHash(plan);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (typeof showToast === 'function') showToast('Scenario link copied');
      }).catch(function () {
        window.prompt('Copy this link', url);
      });
    } else {
      window.prompt('Copy this link', url);
    }
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'share_plan' });
  }

  function ensureButton() {
    if (document.getElementById('copy-plan-link-btn')) return;
    var share = document.getElementById('share-btn');
    if (!share || !share.parentNode) return;
    var btn = document.createElement('button');
    btn.id = 'copy-plan-link-btn';
    btn.type = 'button';
    btn.className = 'px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:opacity-90';
    btn.textContent = 'Copy scenario link';
    share.parentNode.insertBefore(btn, share.nextSibling);
    btn.addEventListener('click', copyLink);
  }

  function boot() {
    ensureButton();
    if (typeof PlanShare === 'undefined') return;
    var plan = PlanShare.fromHash(location.hash);
    if (plan && plan.debts && plan.debts.length) {
      setTimeout(function () { applyPlan(plan); }, 50);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
