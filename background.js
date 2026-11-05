// GAS Quota Meter - service worker
// Apps Script API (processes.list) から直近24時間の実行履歴を取得し、使用量を集計する。

const API_URL = 'https://script.googleapis.com/v1/processes';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 割り当ては「最初の実行から24時間」で回復するため、直近24時間で集計
const MAX_PAGES = 40;                  // 50件 x 40ページ = 最大2000件
const CACHE_MS = 60 * 1000;
const TRIGGER_TYPES = new Set(['TIME_DRIVEN', 'TRIGGER', 'SIMPLE_TRIGGER']);
const FAILED_STATUSES = new Set(['FAILED', 'TIMED_OUT']);

class QuotaError extends Error {
  constructor(message, code, hint) {
    super(message);
    this.code = code;
    this.hint = hint;
  }
}

function getToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (result) => {
      const err = chrome.runtime.lastError;
      const token = typeof result === 'string' ? result : result && result.token;
      if (err || !token) {
        const msg = (err && err.message) || 'アクセストークンを取得できませんでした';
        const badClient = /client id|oauth2|bad client/i.test(msg);
        reject(new QuotaError(
          badClient ? 'OAuth クライアントIDが正しく設定されていません' : 'Google アカウントへのログインが必要です',
          badClient ? 'SETUP' : 'AUTH',
          badClient ? 'manifest.json の oauth2.client_id を README の手順で設定してください。' : msg
        ));
      } else {
        resolve(token);
      }
    });
  });
}

function removeToken(token) {
  return new Promise((resolve) => chrome.identity.removeCachedAuthToken({ token }, resolve));
}

async function toApiError(res) {
  let message = `Apps Script API エラー (${res.status})`;
  try {
    const body = await res.json();
    if (body && body.error && body.error.message) message = body.error.message;
  } catch (_) { /* ignore */ }

  if (res.status === 401) return new QuotaError(message, 'AUTH');
  if (res.status === 403 && /Apps Script API/i.test(message) && /enable|not been used|disabled/i.test(message)) {
    const userSetting = /User has not enabled/i.test(message);
    return new QuotaError(
      userSetting ? 'Apps Script API がユーザー設定でオフになっています' : 'GCP プロジェクトで Apps Script API が有効になっていません',
      'API_DISABLED',
      userSetting
        ? 'https://script.google.com/home/usersettings で「Google Apps Script API」をオンにしてください。'
        : 'Google Cloud Console で OAuth クライアントのプロジェクトに Apps Script API を追加してください。'
    );
  }
  return new QuotaError(message, 'API');
}

async function fetchProcesses(token, since) {
  const all = [];
  let pageToken = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = new URL(API_URL);
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('userProcessFilter.startTime', since.toISOString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw await toApiError(res);
    const body = await res.json();
    all.push(...(body.processes || []));
    pageToken = body.nextPageToken || '';
    if (!pageToken) return { processes: all, truncated: false };
  }
  return { processes: all, truncated: true };
}

function aggregate(processes, now, since, truncated) {
  const seconds = (p) => {
    if (p.duration) return parseFloat(p.duration) || 0; // "12.345s"
    if (p.processStatus === 'RUNNING' && p.startTime) return Math.max(0, (now - Date.parse(p.startTime)) / 1000);
    return 0;
  };

  const byProject = new Map();
  const byType = {};
  const failures = [];
  let triggerSeconds = 0;
  let totalSeconds = 0;
  let running = 0;
  let failed = 0;
  let timedOut = 0;
  let longest = null;
  let oldestTriggerStart = null;

  for (const p of processes) {
    const s = seconds(p);
    const name = p.projectName || '(不明なプロジェクト)';
    const type = p.processType || 'UNKNOWN';
    const isTrigger = TRIGGER_TYPES.has(type);

    totalSeconds += s;
    byType[type] = (byType[type] || 0) + 1;
    if (p.processStatus === 'RUNNING') running++;
    if (p.processStatus === 'TIMED_OUT') timedOut++;
    if (FAILED_STATUSES.has(p.processStatus)) {
      failed++;
      failures.push({ project: name, fn: p.functionName || '', status: p.processStatus, start: p.startTime, type });
    }
    if (isTrigger) {
      triggerSeconds += s;
      const t = Date.parse(p.startTime);
      if (!Number.isNaN(t) && (oldestTriggerStart === null || t < oldestTriggerStart)) oldestTriggerStart = t;
    }
    if (!longest || s > longest.seconds) longest = { seconds: s, project: name, fn: p.functionName || '' };

    const proj = byProject.get(name) || { name, count: 0, seconds: 0, triggerSeconds: 0, failed: 0 };
    proj.count++;
    proj.seconds += s;
    if (isTrigger) proj.triggerSeconds += s;
    if (FAILED_STATUSES.has(p.processStatus)) proj.failed++;
    byProject.set(name, proj);
  }

  failures.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));

  return {
    fetchedAt: now,
    since: since.getTime(),
    truncated,
    total: processes.length,
    running,
    failed,
    timedOut,
    triggerSeconds,
    totalSeconds,
    longest,
    // 直近24時間ウィンドウで最も古いトリガー実行が枠から外れる時刻
    nextReleaseAt: oldestTriggerStart === null ? null : oldestTriggerStart + WINDOW_MS,
    byType,
    byProject: [...byProject.values()].sort((a, b) => b.seconds - a.seconds),
    recentFailures: failures.slice(0, 5),
  };
}

async function getUsage({ force, interactive }) {
  if (!force) {
    const { cache } = await chrome.storage.session.get('cache');
    if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache;
  }

  let token = await getToken(!!interactive);
  const now = Date.now();
  const since = new Date(now - WINDOW_MS);
  let result;
  try {
    result = await fetchProcesses(token, since);
  } catch (e) {
    if (e.code !== 'AUTH') throw e;
    // トークン失効時は1回だけ取り直す
    await removeToken(token);
    token = await getToken(!!interactive);
    result = await fetchProcesses(token, since);
  }

  const data = aggregate(result.processes, now, since, result.truncated);
  await chrome.storage.session.set({ cache: data });
  return data;
}

async function signOut() {
  try {
    const token = await getToken(false);
    await removeToken(token);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
  } catch (_) { /* 未ログインなら何もしない */ }
  await chrome.storage.session.remove('cache');
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'getUsage') {
    getUsage(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, message: e.message, code: e.code || 'UNKNOWN', hint: e.hint || '' }));
    return true;
  }
  if (msg && msg.type === 'signOut') {
    signOut().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
