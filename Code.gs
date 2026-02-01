// ============================================================
// OhiScan Monitor - FAXSCAN移動大作戦 監視アプリ
// ============================================================
// バージョン: 1.0.0
// 作成日: 2026-02-01
// 説明: OhiScanアプリの稼働状況を監視し、異常時にGoogle Chatに通知
// ============================================================

/**
 * 設定
 */
const CONFIG = {
  // 共有ドライブID（FAXSCAN_Logs）
  SHARED_DRIVE_ID: '17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs',
  
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
  Logger.log('=== OhiScan Monitor 開始 ===');
  
  try {
    // 1. スプレッドシート監視
    checkSpreadsheetActivity();
    
    // 2. ログファイル監視（今後実装）
    // checkLogFiles();
    
    Logger.log('=== OhiScan Monitor 完了 ===');
  } catch (error) {
    Logger.log('エラー発生: ' + error.toString());
    sendAlert('監視システムエラー', 'OhiScan Monitorでエラーが発生しました:\n' + error.toString());
  }
}

/**
 * スプレッドシート監視機能
 * 日次処理結果スプレッドシートの最終更新日時をチェック
 */
function checkSpreadsheetActivity() {
  Logger.log('--- スプレッドシート監視開始 ---');
  
  // 1. 今日の日付を取得
  const today = new Date();
  const yearMonth = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyyMM'); // 202602
  const day = Utilities.formatDate(today, CONFIG.TIMEZONE, 'dd');            // 01
  const fileName = yearMonth + day + '処理結果';
  
  Logger.log(`監視対象: ${fileName}`);
  
  try {
    // 2. 共有ドライブのベースフォルダを取得
    const baseFolder = DriveApp.getFolderById(CONFIG.SHARED_DRIVE_ID);
    
    // 3. 年月フォルダ → 日フォルダ の順に辿る
    const yearMonthFolders = baseFolder.getFoldersByName(yearMonth);
    if (!yearMonthFolders.hasNext()) {
      // 年月フォルダが見つからない
      const message = `年月フォルダが見つかりません: ${yearMonth}`;
      Logger.log('⚠️ ' + message);
      sendAlert('フォルダ未作成', message);
      return;
    }
    
    const yearMonthFolder = yearMonthFolders.next();
    const dayFolders = yearMonthFolder.getFoldersByName(day);
    if (!dayFolders.hasNext()) {
      // 日フォルダが見つからない
      const hour = today.getHours();
      // 深夜0時～1時の場合は前日をチェック（猶予期間）
      if (hour >= 0 && hour < 1) {
        Logger.log('深夜0時台のため、前日のスプレッドシートをチェック');
        checkYesterdaySpreadsheet();
        return;
      }
      
      const message = `日フォルダが見つかりません: ${yearMonth}/${day}`;
      Logger.log('⚠️ ' + message);
      sendAlert('フォルダ未作成', message);
      return;
    }
    
    // 4. 日次スプレッドシートを検索
    const dayFolder = dayFolders.next();
    const sheets = dayFolder.getFilesByName(fileName);
    
    if (!sheets.hasNext()) {
      // スプレッドシートが見つからない
      const message = `本日のスプレッドシートが見つかりません: ${fileName}`;
      Logger.log('🚨 ' + message);
      sendAlert('スプレッドシート未作成', message + '\n\nOhiScanが起動していない可能性があります。');
      return;
    }
    
    // 5. 最終更新日時をチェック
    const sheet = sheets.next();
    const lastModified = sheet.getLastUpdated();
    const nowTime = new Date().getTime();
    const diffMinutes = Math.floor((nowTime - lastModified.getTime()) / (1000 * 60));
    
    const lastModifiedStr = Utilities.formatDate(lastModified, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    Logger.log(`スプレッドシート: ${fileName}`);
    Logger.log(`最終更新: ${lastModifiedStr}`);
    Logger.log(`経過時間: ${diffMinutes}分`);
    
    // 6. 閾値を超えていればアラート
    if (diffMinutes > CONFIG.ALERT_THRESHOLD_MINUTES) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      
      const message = 
        `🚨【OhiScan】スプレッドシート更新なし\n\n` +
        `📄 ファイル: ${fileName}\n` +
        `🕐 最終更新: ${lastModifiedStr}\n` +
        `⏱️ 経過時間: ${hours}時間${minutes}分\n\n` +
        `OhiScanが停止している可能性があります。`;
      
      Logger.log('🚨 アラート送信: ' + message);
      sendAlert('スプレッドシート更新なし', message);
    } else {
      Logger.log('✅ 正常: 閾値内の更新あり');
    }
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
    sendAlert('スプレッドシート監視エラー', 'エラーが発生しました:\n' + error.toString());
  }
}

/**
 * 前日のスプレッドシートをチェック（深夜0時台用）
 */
function checkYesterdaySpreadsheet() {
  Logger.log('--- 前日スプレッドシート監視 ---');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yearMonth = Utilities.formatDate(yesterday, CONFIG.TIMEZONE, 'yyyyMM');
  const day = Utilities.formatDate(yesterday, CONFIG.TIMEZONE, 'dd');
  const fileName = yearMonth + day + '処理結果';
  
  Logger.log(`前日の監視対象: ${fileName}`);
  
  try {
    const baseFolder = DriveApp.getFolderById(CONFIG.SHARED_DRIVE_ID);
    const yearMonthFolders = baseFolder.getFoldersByName(yearMonth);
    
    if (!yearMonthFolders.hasNext()) {
      Logger.log('⚠️ 前日の年月フォルダが見つかりません');
      return;
    }
    
    const yearMonthFolder = yearMonthFolders.next();
    const dayFolders = yearMonthFolder.getFoldersByName(day);
    
    if (!dayFolders.hasNext()) {
      Logger.log('⚠️ 前日の日フォルダが見つかりません');
      return;
    }
    
    const dayFolder = dayFolders.next();
    const sheets = dayFolder.getFilesByName(fileName);
    
    if (!sheets.hasNext()) {
      Logger.log('⚠️ 前日のスプレッドシートが見つかりません');
      return;
    }
    
    const sheet = sheets.next();
    const lastModified = sheet.getLastUpdated();
    const nowTime = new Date().getTime();
    const diffMinutes = Math.floor((nowTime - lastModified.getTime()) / (1000 * 60));
    
    Logger.log(`前日スプレッドシート最終更新: ${Utilities.formatDate(lastModified, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss')}`);
    Logger.log(`経過時間: ${diffMinutes}分`);
    
    // 前日のスプレッドシートは長時間更新されていてもOK（参考情報のみ）
    Logger.log('✅ 前日スプレッドシート確認完了（参考）');
    
  } catch (error) {
    Logger.log('前日スプレッドシート確認エラー: ' + error.toString());
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
 * テスト用関数 - スプレッドシート監視のテスト
 */
function testCheckSpreadsheet() {
  Logger.log('=== テスト: スプレッドシート監視 ===');
  checkSpreadsheetActivity();
}

/**
 * テスト用関数 - 通知のテスト
 */
function testSendAlert() {
  Logger.log('=== テスト: 通知送信 ===');
  sendAlert('テスト通知', 'これはテストメッセージです。');
}
