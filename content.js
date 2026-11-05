// GAS Quota Meter - script.google.com 上に右下のボタンとパネルを表示する
(function () {
  'use strict';
  if (window.__gqmInjected) return;
  window.__gqmInjected = true;

  const REFRESH_MS = 2 * 60 * 1000;

  const host = document.createElement('div');
  host.id = 'gas-quota-meter';
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .fab { all: initial; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
        font: 600 12px "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif;
        background: #1a73e8; color: #fff; border-radius: 18px; padding: 8px 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,.25); }
      .fab.warn { background: #e37400; }
      .fab.bad { background: #d93025; }
      .panel { position: absolute; right: 0; bottom: 46px; width: 400px; max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px); overflow: auto; border-radius: 12px;
        box-shadow: 0 8px 28px rgba(0,0,0,.28); }
      .panel[hidden] { display: none; }
    </style>
    <div class="panel" hidden></div>
    <button class="fab" title="Apps Script の割り当てと使用量">⏱ <span class="label">Quota</span></button>
  `;

  const fab = shadow.querySelector('.fab');
  const label = shadow.querySelector('.label');
  const panel = shadow.querySelector('.panel');
  let controller = null;
  let timer = null;

  function onData(data, plan) {
    fab.classList.remove('warn', 'bad');
    if (!data) { label.textContent = 'Quota'; return; }
    const limit = GQM_QUOTAS.daily.find((q) => q.key === 'trigger')[plan];
    const ratio = data.triggerSeconds / limit;
    label.textContent = `Quota ${Math.round(ratio * 100)}%`;
    if (ratio >= 1 || data.timedOut > 0) fab.classList.add('bad');
    else if (ratio >= 0.8) fab.classList.add('warn');
  }

  fab.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      if (!controller) controller = GQM_UI.mount(panel, { onData });
      else controller.refresh(false);
      timer = setInterval(() => controller.refresh(false), REFRESH_MS);
    } else {
      clearInterval(timer);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) fab.click();
  });
})();
