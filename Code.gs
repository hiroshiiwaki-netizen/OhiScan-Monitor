// ============================================================
// OhiScan Monitor - FAXSCAN移動大作戦 監視アプリ
// ============================================================
// バージョン: 2.0.0
// 更新日: 2026-03-09
// 説明: OhiScanアプリの稼働状況をデポ別に監視し、異常時にGoogle Chatに通知
// 変更: v2.0.0 - デポ別フォルダ構造（保存/デポ名/YYYYMM/DD/）に対応
// ============================================================

/**
 * 設定
 */
const CONFIG = {
  // 共有ドライブの「保存」フォルダID
  // フォルダ構造: 保存/ → デポ名/ → YYYYMM/ → DD/ → YYYYMMDD処理結果.xlsx
  SAVE_FOLDER_ID: '17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs',
  
  // 監視対象デポ一覧
  DEPOTS: ['垂水', '西宮', '寝屋川'],
  
  // Google Chat Webhook URL
  CHAT_WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/AAQASmNTeFA/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=n0uleAPPFirRtYAKNeLQUjcHavhqGOlKDCZxu_m7bYg',
  
  // 監視間隔（分）
  CHECK_INTERVAL_MINUTES: 15,
  
  // アラート閾値（分） - この時間以上更新がなければアラート
  ALERT_THRESHOLD_MINUTES: 60,
  
  // ログエラーキーワード
  LOG_ERROR_KEYWORDS: ['ERROR', 'CRITICAL', 'FAIL', 'Exception'],
  
  // タイムゾーン
  TIMEZONE: 'Asia/Tokyo'
};

/**
 * メイン監視関数 - 定期実行トリガーから呼ばれる
 */
function main() {
  Logger.log('=== OhiScan Monitor v2.0.0 開始 ===');
  
  try {
    // デポ別にスプレッドシート監視
    checkAllDepots();
    
    Logger.log('=== OhiScan Monitor 完了 ===');
  } catch (error) {
    Logger.log('エラー発生: ' + error.toString());
    sendAlert('監視システムエラー', 'OhiScan Monitorでエラーが発生しました:\n' + error.toString());
  }
}

/**
 * 全デポの監視を実行
 */
function checkAllDepots() {
  Logger.log('--- 全デポ監視開始 ---');
  
  const today = new Date();
  const yearMonth = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyyMM');
  const day = Utilities.formatDate(today, CONFIG.TIMEZONE, 'dd');
  const fileName = yearMonth + day + '処理結果';
  
  Logger.log(`監視対象ファイル名: ${fileName}`);
  
  // ベースフォルダ（保存フォルダ）を取得
  let baseFolder;
  try {
    baseFolder = DriveApp.getFolderById(CONFIG.SAVE_FOLDER_ID);
  } catch (error) {
    Logger.log('❌ 保存フォルダにアクセスできません: ' + error.toString());
    sendAlert('保存フォルダアクセスエラー', '保存フォルダにアクセスできません:\n' + error.toString());
    return;
  }
  
  // 各デポを個別にチェック
  for (const depot of CONFIG.DEPOTS) {
    try {
      checkDepotSpreadsheet(baseFolder, depot, yearMonth, day, fileName);
    } catch (error) {
      Logger.log(`❌ ${depot}のチェックでエラー: ${error.toString()}`);
      sendAlert(
        `${depot} 監視エラー`,
        `${depot}のスプレッドシート監視でエラーが発生しました:\n${error.toString()}`
      );
    }
  }
}

/**
 * デポ別のスプレッドシート監視
 * @param {Folder} baseFolder - 保存フォルダ
 * @param {string} depot - デポ名（例: "垂水"）
 * @param {string} yearMonth - 年月（例: "202603"）
 * @param {string} day - 日（例: "09"）
 * @param {string} fileName - 処理結果ファイル名
 */
function checkDepotSpreadsheet(baseFolder, depot, yearMonth, day, fileName) {
  Logger.log(`--- ${depot} チェック開始 ---`);
  
  // 1. デポフォルダを探す
  const depotFolders = baseFolder.getFoldersByName(depot);
  if (!depotFolders.hasNext()) {
    Logger.log(`⚠️ ${depot}のフォルダが見つかりません`);
    sendAlert(
      `${depot} フォルダ未作成`,
      `🏥 デポ: ${depot}\n📁 フォルダが見つかりません\n\nOhiScanが${depot}の処理を開始していない可能性があります。`
    );
    return;
  }
  
  const depotFolder = depotFolders.next();
  
  // 2. 年月フォルダを探す
  const yearMonthFolders = depotFolder.getFoldersByName(yearMonth);
  if (!yearMonthFolders.hasNext()) {
    const hour = new Date().getHours();
    // 深夜0-1時は猶予期間とする
    if (hour >= 0 && hour < 1) {
      Logger.log(`${depot}: 深夜0時台のためスキップ`);
      return;
    }
    
    Logger.log(`⚠️ ${depot}の年月フォルダが見つかりません: ${yearMonth}`);
    sendAlert(
      `${depot} フォルダ未作成`,
      `🏥 デポ: ${depot}\n📁 年月フォルダが見つかりません: ${yearMonth}\n\nOhiScanが${depot}の処理を開始していない可能性があります。`
    );
    return;
  }
  
  const yearMonthFolder = yearMonthFolders.next();
  
  // 3. 日フォルダを探す
  const dayFolders = yearMonthFolder.getFoldersByName(day);
  if (!dayFolders.hasNext()) {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 1) {
      Logger.log(`${depot}: 深夜0時台のためスキップ`);
      return;
    }
    
    // まだFAXが来ていないだけの可能性もあるため、午前中はアラートしない
    if (hour < 10) {
      Logger.log(`${depot}: 午前${hour}時のため日フォルダ未作成は許容`);
      return;
    }
    
    Logger.log(`⚠️ ${depot}の日フォルダが見つかりません: ${day}`);
    sendAlert(
      `${depot} 日フォルダ未作成`,
      `🏥 デポ: ${depot}\n📁 日フォルダが見つかりません: ${yearMonth}/${day}\n\n本日${depot}のFAXがまだ処理されていない可能性があります。`
    );
    return;
  }
  
  const dayFolder = dayFolders.next();
  
  // 4. 処理結果スプレッドシートを探す
  const sheets = dayFolder.getFilesByName(fileName);
  if (!sheets.hasNext()) {
    const hour = new Date().getHours();
    if (hour < 10) {
      Logger.log(`${depot}: 午前${hour}時のためスプレッドシート未作成は許容`);
      return;
    }
    
    Logger.log(`🚨 ${depot}のスプレッドシートが見つかりません: ${fileName}`);
    sendAlert(
      `${depot} スプレッドシート未作成`,
      `🏥 デポ: ${depot}\n📄 ファイル: ${fileName}\n\nスプレッドシートが見つかりません。\nOhiScanが${depot}の処理を行っていない可能性があります。`
    );
    return;
  }
  
  // 5. 最終更新日時をチェック
  const sheet = sheets.next();
  const lastModified = sheet.getLastUpdated();
  const nowTime = new Date().getTime();
  const diffMinutes = Math.floor((nowTime - lastModified.getTime()) / (1000 * 60));
  
  const lastModifiedStr = Utilities.formatDate(lastModified, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  Logger.log(`${depot}: ${fileName} 最終更新=${lastModifiedStr} 経過=${diffMinutes}分`);
  
  // 6. 閾値を超えていればデポ別アラート
  if (diffMinutes > CONFIG.ALERT_THRESHOLD_MINUTES) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    const message = 
      `🚨【OhiScan】${depot} スプレッドシート更新なし\n\n` +
      `🏥 デポ: ${depot}\n` +
      `📄 ファイル: ${fileName}\n` +
      `🕐 最終更新: ${lastModifiedStr}\n` +
      `⏱️ 経過時間: ${hours}時間${minutes}分\n\n` +
      `OhiScanの${depot}の処理が停止している可能性があります。`;
    
    Logger.log(`🚨 ${depot} アラート送信`);
    sendAlert(`${depot} スプレッドシート更新なし`, message);
  } else {
    Logger.log(`✅ ${depot}: 正常（${diffMinutes}分前に更新）`);
  }
}

/**
 * Google Chatに通知を送信
 * @param {string} title - 通知のタイトル
 * @param {string} message - 通知のメッセージ
 */
function sendAlert(title, message) {
  const webhookUrl = CONFIG.CHAT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    Logger.log('⚠️ Webhook URLが設定されていません');
    return;
  }
  
  try {
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const fullMessage = `<users/all> 🚨【OhiScan Monitor】${title}\n\n${message}\n\n📅 検出時刻: ${now}`;
    
    const payload = {
      text: fullMessage
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ Google Chat通知送信成功');
    } else {
      Logger.log(`⚠️ Google Chat通知送信失敗: ${responseCode}`);
      Logger.log(response.getContentText());
    }
    
  } catch (error) {
    Logger.log('❌ Google Chat通知送信エラー: ' + error.toString());
  }
}

/**
 * テスト用関数 - 全デポ監視のテスト
 */
function testCheckAllDepots() {
  Logger.log('=== テスト: 全デポ監視 ===');
  checkAllDepots();
}

/**
 * テスト用関数 - 通知のテスト
 */
function testSendAlert() {
  Logger.log('=== テスト: 通知送信 ===');
  sendAlert('テスト通知', 'これはテストメッセージです。\n\n🏥 デポ: テスト\n📄 ファイル: テスト処理結果');
}
