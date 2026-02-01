# OhiScan Monitor

OhiScanアプリケーションの稼働状況を監視するGoogle Apps Script（GAS）アプリケーション。

## 📋 概要

FAXSCAN移動大作戦（OhiScan）が正常に動作しているかを監視し、異常があればGoogle Chatに通知します。

### 監視内容

1. **スプレッドシート監視**
   - Google Drive共有ドライブ内の日次処理結果スプレッドシートの最終更新日時をチェック
   - 60分以上更新がない場合、アラート送信

2. **ログファイル監視**（今後実装予定）
   - エラーログの検出と通知

## 🚀 セットアップ

### 前提条件

- Node.js がインストールされていること
- clasp がインストールされていること (`npm install -g @google/clasp`)
- Googleアカウントでログイン済み (`clasp login`)

### デプロイ手順

```bash
# 1. プロジェクトフォルダに移動
cd "OhiScan Monitor"

# 2. GASプロジェクトにプッシュ
clasp push

# 3. GASエディタで開く
clasp open
```

## ⚙️ 設定

### CONFIG オブジェクト

`Code.gs` の `CONFIG` オブジェクトで以下の設定を変更できます：

| 設定項目 | 説明 | デフォルト値 |
|---------|------|------------|
| `SHARED_DRIVE_ID` | FAXSCAN_Logs共有ドライブのID | `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs` |
| `CHAT_WEBHOOK_URL` | Google Chat Webhook URL | （設定済み） |
| `CHECK_INTERVAL_MINUTES` | 監視間隔（分） | `15` |
| `ALERT_THRESHOLD_MINUTES` | アラート閾値（分） | `60` |
| `TIMEZONE` | タイムゾーン | `Asia/Tokyo` |

### トリガー設定

GASエディタで以下のトリガーを設定してください：

1. **関数**: `main`
2. **イベントソース**: 時間主導型
3. **時間ベースのトリガータイプ**: 分ベースのタイマー
4. **時間の間隔**: 15分おき

## 🧪 テスト

### スプレッドシート監視のテスト

```javascript
testCheckSpreadsheet()
```

GASエディタで上記関数を実行し、ログを確認してください。

### 通知のテスト

```javascript
testSendAlert()
```

Google Chatにテストメッセージが届くことを確認してください。

## 📁 ファイル構成

```
OhiScan Monitor/
├── Code.gs              ← メインスクリプト
├── .clasp.json          ← clasp設定ファイル
├── appsscript.json      ← Apps Script設定
├── .gitignore           ← Git除外設定
└── README.md            ← このファイル
```

## 🔧 開発

### バージョン管理

- Git + GitHub で管理
- コード変更時は必ず `clasp push` でGASプロジェクトに反映

### デバッグ

GASエディタの「実行ログ」または「Stackdriver ログ」でログを確認できます。

## ⚠️ 注意事項

1. **共有ドライブへのアクセス権限**
   - GASのサービスアカウントに共有ドライブへのアクセス権限が必要です

2. **深夜0時台の動作**
   - 日をまたぐタイミング（0時～1時）は前日のスプレッドシートをチェックします

3. **通知の重複**
   - 15分毎に監視するため、問題が解決されるまで15分毎に通知が送信されます

## 📞 サポート

問題が発生した場合は、開発者にお問い合わせください。

## 📝 バージョン履歴

- **1.0.0** (2026-02-01): 初版リリース
  - スプレッドシート監視機能
  - Google Chat通知機能
