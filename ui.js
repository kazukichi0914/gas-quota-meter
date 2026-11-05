// GAS Quota Meter - 共通 UI（エディタ内パネルとツールバーのポップアップで共用）
var GQM_UI = (function () {
  'use strict';

  const Q = GQM_QUOTAS;

  const css = `
:host, .gqm { all: initial; }
.gqm {
  --bg: #ffffff; --fg: #1f2328; --muted: #656d76; --line: #d0d7de; --soft: #f6f8fa;
  --accent: #1a73e8; --ok: #1e8e3e; --warn: #e37400; --bad: #d93025; --track: #e8eaed;
  display: block; box-sizing: border-box; width: 100%;
  font: 13px/1.5 "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, system-ui, sans-serif;
  color: var(--fg); background: var(--bg);
}
@media (prefers-color-scheme: dark) {
  .gqm { --bg: #202124; --fg: #e8eaed; --muted: #9aa0a6; --line: #3c4043; --soft: #2a2b2e;
         --accent: #8ab4f8; --ok: #81c995; --warn: #fdd663; --bad: #f28b82; --track: #3c4043; }
}
.gqm *, .gqm *::before, .gqm *::after { box-sizing: border-box; }
.gqm-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.gqm-title { font-weight: 600; font-size: 14px; flex: 1; }
.gqm-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.gqm-seg button { border: 0; background: transparent; color: var(--muted); padding: 3px 8px; font: inherit; font-size: 12px; cursor: pointer; }
.gqm-seg button[aria-pressed="true"] { background: var(--accent); color: var(--bg); }
.gqm-icon { border: 1px solid var(--line); background: transparent; color: var(--fg); border-radius: 6px; width: 28px; height: 26px; cursor: pointer; font-size: 14px; }
.gqm-icon:disabled { opacity: .5; cursor: default; }
.gqm-body { padding: 12px 14px; display: grid; gap: 14px; }
.gqm-section h3 { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .02em; }
.gqm-meter-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.gqm-big { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.gqm-of { color: var(--muted); font-variant-numeric: tabular-nums; }
.gqm-bar { height: 8px; border-radius: 4px; background: var(--track); overflow: hidden; margin: 6px 0 4px; }
.gqm-bar > i { display: block; height: 100%; border-radius: 4px; background: var(--ok); }
.gqm-bar.warn > i { background: var(--warn); }
.gqm-bar.bad > i { background: var(--bad); }
.gqm-note { color: var(--muted); font-size: 12px; }
.gqm-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.gqm-tile { background: var(--soft); border-radius: 8px; padding: 8px; }
.gqm-tile b { display: block; font-size: 16px; font-variant-numeric: tabular-nums; }
.gqm-tile span { color: var(--muted); font-size: 11px; }
.gqm-tile.bad b { color: var(--bad); }
.gqm-tile.warn b { color: var(--warn); }
.gqm table { width: 100%; border-collapse: collapse; font-size: 12px; }
.gqm th, .gqm td { text-align: left; padding: 4px 4px; border-bottom: 1px solid var(--line); vertical-align: top; }
.gqm th { color: var(--muted); font-weight: 500; }
.gqm td.num, .gqm th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.gqm td.name { word-break: break-all; }
.gqm .na { color: var(--muted); }
.gqm .bad-text { color: var(--bad); }
.gqm-toggle { border: 0; background: none; color: var(--accent); font: inherit; font-size: 12px; cursor: pointer; padding: 0; }
.gqm-error { border: 1px solid var(--bad); border-radius: 8px; padding: 10px; }
.gqm-error b { color: var(--bad); }
.gqm-btn { margin-top: 8px; border: 0; background: var(--accent); color: var(--bg); border-radius: 6px; padding: 6px 12px; font: inherit; cursor: pointer; }
.gqm-foot { display: flex; justify-content: space-between; gap: 8px; padding: 8px 14px 12px; color: var(--muted); font-size: 11px; border-top: 1px solid var(--line); }
.gqm-foot a, .gqm-foot button { color: var(--muted); background: none; border: 0; font: inherit; cursor: pointer; padding: 0; text-decoration: underline; }
.gqm-loading { color: var(--muted); padding: 20px 0; text-align: center; }
`;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtDuration(sec) {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return `${h}時間${m}分`;
    if (m) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function fmtNum(v) {
    return typeof v === 'number' ? v.toLocaleString('ja-JP') : esc(v);
  }

  function fmtTime(ms) {
    if (!ms) return '-';
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    const sameDay = d.toDateString() === new Date().toDateString();
    return `${sameDay ? '' : `${d.getMonth() + 1}/${d.getDate()} `}${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function level(ratio) {
    if (ratio >= 1) return 'bad';
    if (ratio >= 0.8) return 'warn';
    return '';
  }

  function triggerMeter(data, plan) {
    const quota = Q.daily.find((q) => q.key === 'trigger');
    const limit = quota[plan];
    const ratio = data.triggerSeconds / limit;
    const pct = Math.min(100, ratio * 100);
    const release = data.nextReleaseAt && ratio >= 0.5
      ? `<div class="gqm-note">最も古いトリガー実行が ${fmtTime(data.nextReleaseAt)} に24時間枠から外れます</div>` : '';
    return `
      <section class="gqm-section">
        <h3>トリガーの合計実行時間（直近24時間）</h3>
        <div class="gqm-meter-top">
          <span class="gqm-big">${fmtDuration(data.triggerSeconds)}</span>
          <span class="gqm-of">/ ${fmtDuration(limit)}（${(ratio * 100).toFixed(1)}%）</span>
        </div>
        <div class="gqm-bar ${level(ratio)}" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <div class="gqm-note">残り ${fmtDuration(Math.max(0, limit - data.triggerSeconds))}</div>
        ${release}
      </section>`;
  }

  function tiles(data) {
    const longestRatio = data.longest ? data.longest.seconds / Q.RUNTIME_LIMIT_SEC : 0;
    const concRatio = data.running / Q.CONCURRENT_LIMIT;
    const tile = (value, label, cls) => `<div class="gqm-tile ${cls || ''}"><b>${value}</b><span>${label}</span></div>`;
    return `
      <section class="gqm-section">
        <h3>実行状況（直近24時間）</h3>
        <div class="gqm-tiles">
          ${tile(fmtNum(data.total), '実行回数')}
          ${tile(fmtNum(data.failed), '失敗', data.failed ? 'bad' : '')}
          ${tile(fmtNum(data.timedOut), 'タイムアウト', data.timedOut ? 'bad' : '')}
          ${tile(`${data.running}<small class="na"> / ${Q.CONCURRENT_LIMIT}</small>`, '実行中（同時実行）', level(concRatio))}
          ${tile(data.longest ? fmtDuration(data.longest.seconds) : '-', '最長実行 / 上限6分', level(longestRatio))}
          ${tile(fmtDuration(data.totalSeconds), '全実行の合計時間')}
        </div>
      </section>`;
  }

  function projects(data) {
    if (!data.byProject.length) return '';
    const rows = data.byProject.slice(0, 8).map((p) => `
      <tr>
        <td class="name">${esc(p.name)}</td>
        <td class="num">${fmtNum(p.count)}</td>
        <td class="num">${fmtDuration(p.triggerSeconds)}</td>
        <td class="num ${p.failed ? 'bad-text' : ''}">${fmtNum(p.failed)}</td>
      </tr>`).join('');
    const more = data.byProject.length > 8 ? `<div class="gqm-note">ほか ${data.byProject.length - 8} 件</div>` : '';
    return `
      <section class="gqm-section">
        <h3>プロジェクト別</h3>
        <table>
          <thead><tr><th>プロジェクト</th><th class="num">回数</th><th class="num">トリガー時間</th><th class="num">失敗</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${more}
      </section>`;
  }

  function failures(data) {
    if (!data.recentFailures.length) return '';
    const rows = data.recentFailures.map((f) => `
      <tr>
        <td class="num" style="width:1%">${fmtTime(Date.parse(f.start))}</td>
        <td class="name">${esc(f.project)}<br><span class="na">${esc(f.fn)}</span></td>
        <td class="bad-text">${f.status === 'TIMED_OUT' ? 'タイムアウト' : '失敗'}</td>
      </tr>`).join('');
    return `
      <section class="gqm-section">
        <h3>最近の失敗</h3>
        <table><tbody>${rows}</tbody></table>
      </section>`;
  }

  function limitsTable(plan, data, open) {
    if (!open) {
      return `<section class="gqm-section"><button class="gqm-toggle" data-action="limits">▸ 割り当て・上限の一覧を表示</button></section>`;
    }
    const daily = Q.daily.map((q) => {
      let used = '<span class="na">取得不可</span>';
      if (q.key === 'trigger' && data) used = fmtDuration(data.triggerSeconds);
      const limit = q.unit === 'sec' ? fmtDuration(q[plan]) : fmtNum(q[plan]);
      const tip = q.tip ? `<br><span class="na">${esc(q.tip)}</span>` : '';
      return `<tr><td class="name">${esc(q.label)}${tip}</td><td class="num">${used}</td><td class="num">${limit}</td></tr>`;
    }).join('');
    const limits = Q.limits.map((l) => {
      let used = '';
      if (l.key === 'concurrent' && data) used = `${data.running} / `;
      if (l.key === 'runtime' && data && data.longest) used = `最長 ${fmtDuration(data.longest.seconds)} / `;
      return `<tr><td class="name">${esc(l.label)}</td><td class="num" colspan="2">${used}${fmtNum(l.value)}</td></tr>`;
    }).join('');
    return `
      <section class="gqm-section">
        <button class="gqm-toggle" data-action="limits">▾ 割り当て・上限の一覧を隠す</button>
        <h3 style="margin-top:8px">1日あたりの割り当て（${plan === 'workspace' ? 'Google Workspace' : '無料アカウント'}）</h3>
        <table>
          <thead><tr><th>項目</th><th class="num">使用量</th><th class="num">上限</th></tr></thead>
          <tbody>${daily}</tbody>
        </table>
        <h3 style="margin-top:12px">その他の上限</h3>
        <table><tbody>${limits}</tbody></table>
        <div class="gqm-note" style="margin-top:6px">メール・URL Fetch などの使用量は Google が API で公開していないため表示できません。</div>
      </section>`;
  }

  function errorBox(err) {
    const needsLogin = err.code === 'AUTH';
    return `
      <div class="gqm-error">
        <b>${esc(err.message)}</b>
        ${err.hint ? `<div class="gqm-note" style="margin-top:4px">${esc(err.hint)}</div>` : ''}
        ${needsLogin ? '<button class="gqm-btn" data-action="login">Google でログイン</button>' : '<button class="gqm-btn" data-action="refresh">再試行</button>'}
      </div>`;
  }

  function html(state) {
    const { plan, data, error, loading, showLimits } = state;
    let body;
    if (error) body = errorBox(error);
    else if (!data) body = '<div class="gqm-loading">読み込み中…</div>';
    else body = triggerMeter(data, plan) + tiles(data) + projects(data) + failures(data);
    body += limitsTable(plan, data, showLimits);

    const foot = data
      ? `<span>${fmtTime(data.fetchedAt)} 時点・直近24時間${data.truncated ? '（2000件で打ち切り）' : ''}</span>`
      : '<span></span>';

    return `
      <style>${css}</style>
      <div class="gqm">
        <div class="gqm-head">
          <span class="gqm-title">GAS Quota Meter</span>
          <span class="gqm-seg" role="group" aria-label="アカウント種別">
            <button data-action="plan" data-plan="consumer" aria-pressed="${plan === 'consumer'}">無料</button>
            <button data-action="plan" data-plan="workspace" aria-pressed="${plan === 'workspace'}">Workspace</button>
          </span>
          <button class="gqm-icon" data-action="refresh" title="更新" ${loading ? 'disabled' : ''}>${loading ? '…' : '↻'}</button>
        </div>
        <div class="gqm-body">${body}</div>
        <div class="gqm-foot">
          ${foot}
          <span><a href="${Q.docsUrl}" target="_blank" rel="noopener">公式の上限値</a> · <button data-action="signout">ログアウト</button></span>
        </div>
      </div>`;
  }

  // root にパネルを描画し、操作を処理する。onData(data, plan) は取得のたびに呼ばれる。
  function mount(root, options) {
    const opts = options || {};
    const state = { plan: 'workspace', data: null, error: null, loading: false, showLimits: false };

    const draw = () => {
      root.innerHTML = html(state);
      if (opts.onData) opts.onData(state.data, state.plan);
    };

    const load = (force, interactive) => {
      if (state.loading) return;
      state.loading = true;
      draw();
      chrome.runtime.sendMessage({ type: 'getUsage', force: !!force, interactive: !!interactive }, (res) => {
        state.loading = false;
        if (chrome.runtime.lastError || !res) {
          state.error = { message: '拡張機能と通信できませんでした', hint: chrome.runtime.lastError && chrome.runtime.lastError.message, code: 'RUNTIME' };
        } else if (res.ok) {
          state.data = res.data;
          state.error = null;
        } else {
          state.error = res;
        }
        draw();
      });
    };

    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'refresh') load(true, false);
      if (action === 'login') load(true, true);
      if (action === 'limits') { state.showLimits = !state.showLimits; draw(); }
      if (action === 'plan') {
        state.plan = el.dataset.plan;
        chrome.storage.sync.set({ plan: state.plan });
        draw();
      }
      if (action === 'signout') {
        chrome.runtime.sendMessage({ type: 'signOut' }, () => {
          state.data = null;
          state.error = { message: 'ログアウトしました', code: 'AUTH' };
          draw();
        });
      }
    });

    chrome.storage.sync.get({ plan: 'workspace' }, (v) => {
      state.plan = v.plan;
      draw();
      load(false, false);
    });

    return { refresh: (force) => load(force, false) };
  }

  return { mount, html, css, fmtDuration };
})();
