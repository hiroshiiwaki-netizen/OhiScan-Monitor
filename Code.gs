// ============================================================
// OhiScan Monitor - FAXSCAN移動大作戦 監視アプリ
// ============================================================
// バージョン: 2.1.0
// 更新日: 2026-03-17
// 説明: OhiScanアプリの稼働状況をデポ別に監視し、異常時にGoogle Chatに通知
// 変更: v2.1.0 - フォルダ事前作成機能追加（(1)フォルダ問題の根本解決）
// 変更: v2.0.0 - デポ別フォルダ構造（保存/デポ名/YYYYMM/DD/）に対応
// ============================================================

/**
 * 設定
 */
const CONFIG = {
  // 共有ドライブの「保存」フォルダID
  SAVE_FOLDER_ID: '17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs',
  
  // 監視対象デポ一覧
  DEPOTS: ['垂水', '西宮', '寝屋川'],
  
  // 各日フォルダ内に作成するサブフォルダ
  SUB_FOLDERS: ['登録済', '未処理'],
  
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

// ============================================================
// 監視機能（v2.0.0）
// ============================================================

/**
 * メイン監視関数 - 定期実行トリガーから呼ばれる
 */
function main() {
  Logger.log('=== OhiScan Monitor v2.1.0 開始 ===');
  
  try {
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
  
  Logger.log('監視対象ファイル名: ' + fileName);
  
  let baseFolder;
  try {
    baseFolder = DriveApp.getFolderById(CONFIG.SAVE_FOLDER_ID);
  } catch (error) {
    Logger.log('❌ 保存フォルダにアクセスできません: ' + error.toString());
    sendAlert('保存フォルダアクセスエラー', '保存フォルダにアクセスできません:\n' + error.toString());
    return;
  }
  
  for (const depot of CONFIG.DEPOTS) {
    try {
      checkDepotSpreadsheet(baseFolder, depot, yearMonth, day, fileName);
    } catch (error) {
      Logger.log('❌ ' + depot + 'のチェックでエラー: ' + error.toString());
      sendAlert(depot + ' 監視エラー', depot + 'のスプレッドシート監視でエラーが発生しました:\n' + error.toString());
    }
  }
}

/**
 * デポ別のスプレッドシート監視
 */
function checkDepotSpreadsheet(baseFolder, depot, yearMonth, day, fileName) {
  Logger.log('--- ' + depot + ' チェック開始 ---');
  
  // 1. デポフォルダを探す
  const depotFolders = baseFolder.getFoldersByName(depot);
  if (!depotFolders.hasNext()) {
    Logger.log('⚠️ ' + depot + 'のフォルダが見つかりません');
    sendAlert(depot + ' フォルダ未作成', '🏥 デポ: ' + depot + '\n📁 フォルダが見つかりません');
    return;
  }
  const depotFolder = depotFolders.next();
  
  // 2. 年月フォルダを探す
  const yearMonthFolders = depotFolder.getFoldersByName(yearMonth);
  if (!yearMonthFolders.hasNext()) {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 1) { Logger.log(depot + ': 深夜0時台のためスキップ'); return; }
    Logger.log('⚠️ ' + depot + 'の年月フォルダが見つかりません: ' + yearMonth);
    sendAlert(depot + ' フォルダ未作成', '🏥 デポ: ' + depot + '\n📁 年月フォルダ: ' + yearMonth + ' が見つかりません');
    return;
  }
  const yearMonthFolder = yearMonthFolders.next();
  
  // 3. 日フォルダを探す
  const dayFolders = yearMonthFolder.getFoldersByName(day);
  if (!dayFolders.hasNext()) {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 1) { Logger.log(depot + ': 深夜0時台のためスキップ'); return; }
    if (hour < 10) { Logger.log(depot + ': 午前中のため日フォルダ未作成は許容'); return; }
    Logger.log('⚠️ ' + depot + 'の日フォルダが見つかりません: ' + day);
    sendAlert(depot + ' 日フォルダ未作成', '🏥 デポ: ' + depot + '\n📁 日フォルダ: ' + yearMonth + '/' + day + ' が見つかりません');
    return;
  }
  const dayFolder = dayFolders.next();
  
  // 4. 処理結果スプレッドシートを探す
  const sheets = dayFolder.getFilesByName(fileName);
  if (!sheets.hasNext()) {
    const hour = new Date().getHours();
    if (hour < 10) { Logger.log(depot + ': 午前中のためスプレッドシート未作成は許容'); return; }
    Logger.log('🚨 ' + depot + 'のスプレッドシートが見つかりません: ' + fileName);
    sendAlert(depot + ' スプレッドシート未作成', '🏥 デポ: ' + depot + '\n📄 ファイル: ' + fileName + '\n\nスプレッドシートが見つかりません。');
    return;
  }
  
  // 5. 最終更新日時をチェック
  const sheet = sheets.next();
  const lastModified = sheet.getLastUpdated();
  const nowTime = new Date().getTime();
  const diffMinutes = Math.floor((nowTime - lastModified.getTime()) / (1000 * 60));
  
  const lastModifiedStr = Utilities.formatDate(lastModified, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  Logger.log(depot + ': ' + fileName + ' 最終更新=' + lastModifiedStr + ' 経過=' + diffMinutes + '分');
  
  // 6. 閾値を超えていればアラート
  if (diffMinutes > CONFIG.ALERT_THRESHOLD_MINUTES) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const message = '🚨【OhiScan】' + depot + ' スプレッドシート更新なし\n\n' +
      '🏥 デポ: ' + depot + '\n' +
      '📄 ファイル: ' + fileName + '\n' +
      '🕐 最終更新: ' + lastModifiedStr + '\n' +
      '⏱️ 経過時間: ' + hours + '時間' + minutes + '分\n\n' +
      'OhiScanの' + depot + 'の処理が停止している可能性があります。';
    Logger.log('🚨 ' + depot + ' アラート送信');
    sendAlert(depot + ' スプレッドシート更新なし', message);
  } else {
    Logger.log('✅ ' + depot + ': 正常（' + diffMinutes + '分前に更新）');
  }
}

// ============================================================
// 通知機能
// ============================================================

/**
 * Google Chatに通知を送信（@all付きアラート用）
 */
function sendAlert(title, message) {
  const webhookUrl = CONFIG.CHAT_WEBHOOK_URL;
  if (!webhookUrl) { Logger.log('⚠️ Webhook URLが設定されていません'); return; }
  
  try {
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const fullMessage = '<users/all> 🚨【OhiScan Monitor】' + title + '\n\n' + message + '\n\n📅 検出時刻: ' + now;
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: fullMessage }),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    if (response.getResponseCode() === 200) {
      Logger.log('✅ Google Chat通知送信成功');
    } else {
      Logger.log('⚠️ Google Chat通知送信失敗: ' + response.getResponseCode());
    }
  } catch (error) {
    Logger.log('❌ Google Chat通知送信エラー: ' + error.toString());
  }
}

/**
 * Google Chatに通知を送信（@allなし、フォルダ作成結果用）
 */
function sendFolderNotification(message) {
  const webhookUrl = CONFIG.CHAT_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  try {
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const fullMessage = message + '\n\n📅 実行時刻: ' + now;
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: fullMessage }),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(webhookUrl, options);
    Logger.log('✅ フォルダ作成通知送信成功');
  } catch (error) {
    Logger.log('⚠️ 通知送信エラー: ' + error.toString());
  }
}

// ============================================================
// フォルダ事前作成機能（v2.1.0 追加）
// ============================================================
// 【目的】
//   毎月25日に翌月分のデポ別フォルダを一括作成する。
//   GASは1プロセスで動作するため、3台PCが同時にフォルダを作成して
//   Google Driveが「フォルダ名 (1)」を生成してしまう問題を根本解決。
//
// 【トリガー設定】
//   スクリプトエディタ → トリガー → 月タイマー → 25日 午前0〜1時
// ============================================================

/**
 * 翌月分のデポ別フォルダを一括作成する（毎月25日トリガー用）
 */
function createNextMonthFolders() {
  Logger.log('=== フォルダ事前作成 開始 ===');
  
  // 翌月の情報を計算
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const yearMonth = Utilities.formatDate(nextMonth, CONFIG.TIMEZONE, 'yyyyMM');
  
  // 翌月の日数を取得（翌々月の0日目 = 翌月の最終日）
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  
  Logger.log('翌月: ' + yearMonth + '（' + lastDay + '日間）');
  
  // フォルダ作成実行
  const result = _createFoldersForMonth(yearMonth, lastDay);
  
  // Google Chatに結果通知
  const monthStr = Utilities.formatDate(nextMonth, CONFIG.TIMEZONE, 'yyyy年MM月');
  const message = '📁【OhiScan】フォルダ事前作成完了\n\n' +
    '📅 対象月: ' + monthStr + '（' + lastDay + '日間）\n' +
    '🏥 デポ: ' + CONFIG.DEPOTS.join('、') + '\n\n' +
    '✅ 作成済み: ' + result.created + 'フォルダ\n' +
    '⏭️ スキップ: ' + result.skipped + 'フォルダ（既存）\n' +
    '❌ エラー: ' + result.errors + '件';
  
  sendFolderNotification(message);
  Logger.log('=== フォルダ事前作成 完了 ===');
}

/**
 * 指定した年月のフォルダを実際に作成する内部関数
 */
function _createFoldersForMonth(yearMonth, lastDay) {
  var created = 0;
  var skipped = 0;
  var errors = 0;
  
  var baseFolder;
  try {
    baseFolder = DriveApp.getFolderById(CONFIG.SAVE_FOLDER_ID);
  } catch (error) {
    Logger.log('❌ 保存フォルダにアクセスできません: ' + error.toString());
    return { created: 0, skipped: 0, errors: 1 };
  }
  
  for (var d = 0; d < CONFIG.DEPOTS.length; d++) {
    var depot = CONFIG.DEPOTS[d];
    try {
      Logger.log('--- ' + depot + ' フォルダ作成開始 ---');
      
      // デポフォルダを取得（なければ作成）
      var depotFolder = _getOrCreateFolder(baseFolder, depot);
      
      // 年月フォルダを取得（なければ作成）
      var ymFolder = _getOrCreateFolder(depotFolder, yearMonth);
      
      // 各日のフォルダを作成
      for (var day = 1; day <= lastDay; day++) {
        var dayStr = String(day).padStart(2, '0');
        
        try {
          var dayFolder = _getOrCreateFolder(ymFolder, dayStr);
          
          // サブフォルダ（登録済、未処理）を作成
          for (var s = 0; s < CONFIG.SUB_FOLDERS.length; s++) {
            var subName = CONFIG.SUB_FOLDERS[s];
            var isNew = _createSubFolderIfNeeded(dayFolder, subName);
            if (isNew) {
              created++;
            } else {
              skipped++;
            }
          }
        } catch (dayError) {
          Logger.log('  ❌ ' + depot + '/' + yearMonth + '/' + dayStr + ': ' + dayError.toString());
          errors++;
        }
      }
      
      Logger.log('✅ ' + depot + ': ' + yearMonth + ' フォルダ作成完了');
      
    } catch (depotError) {
      Logger.log('❌ ' + depot + 'のフォルダ作成エラー: ' + depotError.toString());
      errors++;
    }
  }
  
  Logger.log('合計: 作成=' + created + ', スキップ=' + skipped + ', エラー=' + errors);
  return { created: created, skipped: skipped, errors: errors };
}

/**
 * フォルダを取得。存在しなければ作成する。
 */
function _getOrCreateFolder(parentFolder, folderName) {
  var existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  
  Logger.log('  📁 作成: ' + folderName);
  return parentFolder.createFolder(folderName);
}

/**
 * サブフォルダを作成（存在チェック付き）。新規作成ならtrue、既存ならfalseを返す。
 */
function _createSubFolderIfNeeded(parentFolder, folderName) {
  var existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return false; // 既存
  }
  parentFolder.createFolder(folderName);
  return true; // 新規作成
}

// ============================================================
// テスト用関数
// ============================================================

/**
 * テスト: 全デポ監視
 */
function testCheckAllDepots() {
  Logger.log('=== テスト: 全デポ監視 ===');
  checkAllDepots();
}

/**
 * テスト: 通知送信
 */
function testSendAlert() {
  Logger.log('=== テスト: 通知送信 ===');
  sendAlert('テスト通知', 'これはテストメッセージです。\n\n🏥 デポ: テスト\n📄 ファイル: テスト処理結果');
}

/**
 * テスト: 今月のフォルダ作成
 * 手動実行で動作確認用。今月分のフォルダを作成する。
 */
function testCreateFolders() {
  Logger.log('=== テスト: フォルダ事前作成（今月分） ===');
  
  var today = new Date();
  var yearMonth = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyyMM');
  var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  Logger.log('対象: ' + yearMonth + '（' + lastDay + '日間）');
  var result = _createFoldersForMonth(yearMonth, lastDay);
  Logger.log('結果: 作成=' + result.created + ', スキップ=' + result.skipped + ', エラー=' + result.errors);
}
