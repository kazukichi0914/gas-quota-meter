// Apps Script の割り当て・上限値
// 出典: https://developers.google.com/apps-script/guides/services/quotas
// Google は予告なく値を変更することがあるため、正確な値は公式ドキュメントで確認してください。
// measurable: true の項目のみ Apps Script API から使用量を算出できます。
var GQM_QUOTAS = {
  docsUrl: 'https://developers.google.com/apps-script/guides/services/quotas',

  daily: [
    { key: 'trigger', label: 'トリガーの合計実行時間', consumer: 90 * 60, workspace: 6 * 60 * 60, unit: 'sec', measurable: true },
    { key: 'mail', label: 'メール受信者数', consumer: 100, workspace: 1500, tip: 'スクリプト内で MailApp.getRemainingDailyQuota() を呼ぶと残数を確認できます' },
    { key: 'urlfetch', label: 'URL Fetch 呼び出し', consumer: 20000, workspace: 100000 },
    { key: 'urlfetchData', label: 'URL Fetch 受信データ量', consumer: '100MB', workspace: '100MB' },
    { key: 'mailRw', label: 'メール読み書き（送信除く）', consumer: 20000, workspace: 50000 },
    { key: 'calendar', label: 'カレンダー予定の作成', consumer: 5000, workspace: 10000 },
    { key: 'contacts', label: '連絡先の作成', consumer: 1000, workspace: 2000 },
    { key: 'docs', label: 'ドキュメントの作成', consumer: 250, workspace: 1500 },
    { key: 'sheets', label: 'スプレッドシートの作成', consumer: 250, workspace: 3200 },
    { key: 'slides', label: 'プレゼンテーションの作成', consumer: 250, workspace: 1500 },
    { key: 'props', label: 'Properties 読み書き', consumer: 50000, workspace: 500000 },
    { key: 'groups', label: 'Groups 読み取り', consumer: 2000, workspace: 10000 },
    { key: 'jdbc', label: 'JDBC 接続', consumer: 10000, workspace: 50000 },
    { key: 'jdbcFail', label: 'JDBC 接続失敗', consumer: 100, workspace: 500 },
  ],

  limits: [
    { key: 'runtime', label: '1回あたりの実行時間', value: '6分' },
    { key: 'customFn', label: 'カスタム関数の実行時間', value: '30秒' },
    { key: 'concurrent', label: '同時実行数（ユーザーごと）', value: 30 },
    { key: 'triggers', label: 'トリガー数（ユーザー・スクリプトごと）', value: 20 },
    { key: 'attach', label: 'メールの添付ファイル数', value: 250 },
    { key: 'body', label: 'メール本文のサイズ', value: '200KB' },
    { key: 'fetchSize', label: 'URL Fetch レスポンスサイズ', value: '50MB' },
    { key: 'propValue', label: 'Properties の値サイズ', value: '9KB' },
    { key: 'propTotal', label: 'Properties の合計サイズ', value: '500KB' },
  ],

  RUNTIME_LIMIT_SEC: 6 * 60,
  CONCURRENT_LIMIT: 30,
};
