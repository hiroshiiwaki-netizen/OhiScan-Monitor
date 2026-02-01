# OhiScan Monitor 引継書

**最終更新**: 2026-02-01 21:40  
**アプリバージョン**: 1.0.0  
**GitHubリポジトリ**: https://github.com/hiroshiiwaki-netizen/OhiScan-Monitor

## 📌 プロジェクト概要

OhiScan（FAXSCAN移動大作戦）の稼働状況を監視するGoogle Apps Script（GAS）アプリケーション。

### 監視機能

1. **スプレッドシート監視**
   - Google Drive共有ドライブ内の日次処理結果スプレッドシートの最終更新日時をチェック
   - 60分以上更新がない場合、Google Chatに通知

2. **ログファイル監視**（今後実装予定）
   - エラーログの検出と通知

## ✅ 完了した作業

### 実装フェーズ
- [x] プロジェクトフォルダ作成（`OhiScan Monitor`）
- [x] GASコード作成（`Code.gs`）
  - スプレッドシート監視機能（`checkSpreadsheetActivity`）
  - 前日スプレッドシート監視機能（`checkYesterdaySpreadsheet`）
  - 通知機能（`sendAlert`）
  - テスト関数（`testCheckSpreadsheet`, `testSendAlert`）
- [x] README.md作成
- [x] clasp設定ファイル作成（`.clasp.json`, `appsscript.json`）
- [x] Git初期化とコミット
- [x] claspでGASプロジェクトにプッシュ
- [x] GitHubリポジトリ作成とプッシュ

## ⏳ 次のステップ

### 検証フェーズ
1. **手動テスト**
   - GASエディタで `testCheckSpreadsheet()` を実行
   - 実行ログでスプレッドシート検出と更新日時の確認
   
2. **通知テスト**
   - GASエディタで `testSendAlert()` を実行
   - Google Chatにテストメッセージが届くことを確認

3. **トリガー設定**
   - GASエディタでトリガーを追加
   - 関数: `main`
   - イベントソース: 時間主導型
   - 時間ベースのトリガータイプ: 分ベースのタイマー
   - 時間の間隔: 15分おき

4. **障害検知テスト**
   - OhiScanを一時停止し、60分以上経過後にアラートが送信されることを確認

## 📁 ファイル構成

```
OhiScan Monitor/
├── Code.gs              ← GASメインスクリプト
├── README.md            ← プロジェクトドキュメント
├── HANDOVER.md          ← この引継書
├── GITHUB_SETUP.md      ← GitHub手動セットアップ手順（参考）
├── .clasp.json          ← clasp設定
├── appsscript.json      ← Apps Script設定
└── .gitignore           ← Git除外設定
```

## 🔧 開発環境

- **GASプロジェクトID**: `1Jgp6CXFoOXQ7iTKr7SSyvWGG4BuR-q9WPy-2nRblm653ahD4b_H5EAhJ`
- **GASプロジェクトURL**: https://script.google.com/home/projects/1Jgp6CXFoOXQ7iTKr7SSyvWGG4BuR-q9WPy-2nRblm653ahD4b_H5EAhJ/edit
- **GitHubリポジトリ**: https://github.com/hiroshiiwaki-netizen/OhiScan-Monitor
- **共有ドライブID**: `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs` (FAXSCAN_Logs)

## ⚙️ 設定情報

### CONFIG オブジェクト（Code.gs内）

- **SHARED_DRIVE_ID**: `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs`
- **CHAT_WEBHOOK_URL**: （OhiScanのconfig.jsonと同じURL）
- **CHECK_INTERVAL_MINUTES**: `15`（分）
- **ALERT_THRESHOLD_MINUTES**: `60`（分）
- **TIMEZONE**: `Asia/Tokyo`

## 🔍 監視ロジック

### スプレッドシート検索パス

```
FAXSCAN_Logs/
└── {YYYYMM}/          ← 年月フォルダ（例: 202602）
    └── {DD}/          ← 日フォルダ（例: 01）
        └── {YYYYMMDD}処理結果.gsheet  ← 監視対象
```

例: `/FAXSCAN_Logs/202602/01/20260201処理結果.gsheet`

### 深夜0時台の特別処理

- 0時～1時の間は「今日のスプレッドシート」がまだ作成されていない可能性があるため、前日のスプレッドシートをチェック

## 📝 コマンド一覧

### clasp関連

```bash
# GASプロジェクトにプッシュ
clasp push

# GASエディタを開く
clasp open

# ログを表示
clasp logs
```

### Git関連

```bash
# 変更をコミット
git add .
git commit -m "メッセージ"

# GitHubにプッシュ
git push origin main
```

## ⚠️ 注意事項

1. **共有ドライブへのアクセス権限**
   - GASのサービスアカウントに共有ドライブ（FAXSCAN_Logs）へのアクセス権限が必要

2. **通知の重複**
   - 15分毎に監視するため、問題が解決されるまで15分毎に通知が送信される

3. **コード変更時**
   - ローカルで変更後、`clasp push` でGASプロジェクトに反映
   - `git commit` & `git push` でGitHubにも反映

## 📞 参考ドキュメント

- [README.md](README.md): セットアップ手順と使い方
- [実装計画](../brain/ea9a12c7-f0ba-4c38-8e59-f1a7b8478071/implementation_plan.md): 設計と実装の詳細
- [タスクリスト](../brain/ea9a12c7-f0ba-4c38-8e59-f1a7b8478071/task.md): 進捗管理
