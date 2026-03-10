# OhiScan Monitor 引継書

**最終更新**: 2026-03-10 16:36  
**アプリバージョン**: 2.0.0  
**GitHubリポジトリ**: https://github.com/hiroshiiwaki-netizen/OhiScan-Monitor

## 📌 プロジェクト概要

OhiScan（FAXSCAN移動大作戦）の稼働状況を**デポ別に**監視するGoogle Apps Script（GAS）アプリケーション。

### OhiScanとの関連性

```
OhiScan本体（Python / サーバーで実行）
  ↓ FAX処理結果をスプレッドシートに記録
  ↓ 保存先: FAX/保存/デポ名/YYYYMM/DD/YYYYMMDD処理結果.xlsx
  
OhiScan Monitor（GAS / トリガーで定期実行）
  ↑ スプレッドシートの最終更新日時を監視
  ↑ 60分以上更新がなければGoogle Chatにアラート送信
```

| 項目 | OhiScan本体 | OhiScan Monitor |
|------|------------|-----------------|
| 言語 | Python | GAS（JavaScript） |
| 場所 | サーバー（ohisama-p148等） | Google Apps Script |
| 役割 | FAX処理・AI解析・Homis登録 | 稼働監視・異常通知 |
| 保存フォルダ | `I:/共有ドライブ/FAX/保存` | 同じフォルダを監視 |
| バージョン | v3.58.3 | v2.0.0 |

### 監視機能

1. **デポ別スプレッドシート監視**（v2.0.0〜）
   - 垂水・西宮・寝屋川の各デポフォルダ内の日次処理結果スプレッドシートをチェック
   - デポごとに最終更新日時を確認
   - 60分以上更新がない場合、**デポ名入りのアラート**をGoogle Chatに送信

2. **猶予ルール**
   - 深夜0〜1時: フォルダ未作成でもアラートしない
   - 午前10時前: 日フォルダ・スプレッドシート未作成でもアラートしない

## 🔧 v2.0.0 変更内容（2026-03-09）

1. **デポ別フォルダ構造に対応**
   - 旧: `保存/YYYYMM/DD/処理結果`
   - 新: `保存/デポ名/YYYYMM/DD/処理結果`
2. **デポ別アラート出力**: 垂水・西宮・寝屋川を個別にチェック
3. **フォルダIDコメント修正**: ❌`FAXSCAN_Logs` → ✅`保存フォルダ`
4. **午前猶予ルール追加**: 午前10時前のフォルダ未作成は許容

## 📁 ファイル構成

```
OhiScan Monitor/
├── Code.gs                    ← GASメインスクリプト（v2.0.0）
├── README.md                  ← プロジェクトドキュメント
├── HANDOVER.md                ← この引継書
├── GITHUB_SETUP.md            ← GitHub手動セットアップ手順（参考）
├── .clasp.json                ← clasp設定
├── appsscript.json            ← Apps Script設定
└── .gitignore                 ← Git除外設定（*_backup_* 除外済み）
```

## 🔍 監視ロジック

### スプレッドシート検索パス（v2.0.0〜）

```
FAX/保存/                              ← SAVE_FOLDER_ID が指すフォルダ
├── 垂水/
│   └── {YYYYMM}/
│       └── {DD}/
│           └── {YYYYMMDD}処理結果.xlsx  ← 監視対象
├── 西宮/
│   └── （同構造）
└── 寝屋川/
    └── （同構造）
```

### アラートのイメージ

```
🚨【OhiScan Monitor】垂水 スプレッドシート更新なし

🏥 デポ: 垂水
📄 ファイル: 20260309処理結果
🕐 最終更新: 2026-03-09 14:30:00
⏱️ 経過時間: 1時間15分

OhiScanの垂水の処理が停止している可能性があります。
📅 検出時刻: 2026-03-09 15:45:00
```

## 🔧 開発環境

- **GASプロジェクトID**: `1Jgp6CXFoOXQ7iTKr7SSyvWGG4BuR-q9WPy-2nRblm653ahD4b_H5EAhJ`
- **GASプロジェクトURL**: https://script.google.com/home/projects/1Jgp6CXFoOXQ7iTKr7SSyvWGG4BuR-q9WPy-2nRblm653ahD4b_H5EAhJ/edit
- **GitHubリポジトリ**: https://github.com/hiroshiiwaki-netizen/OhiScan-Monitor
- **保存フォルダID**: `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs`（`FAX/保存`フォルダ）

## ⚙️ 設定情報

### CONFIG オブジェクト（Code.gs内）

- **SAVE_FOLDER_ID**: `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs`（FAX/保存フォルダ）
- **DEPOTS**: `['垂水', '西宮', '寝屋川']`
- **CHAT_WEBHOOK_URL**: OhiScanのconfig.jsonと同じURL
- **CHECK_INTERVAL_MINUTES**: `15`（分）
- **ALERT_THRESHOLD_MINUTES**: `60`（分）

## 📝 コマンド一覧

```bash
# GASプロジェクトにプッシュ
clasp push

# GASエディタを開く
clasp open

# ログを表示
clasp logs

# GitHubにプッシュ
git add . && git commit -m "メッセージ" && git push origin main
```

## ⚠️ 注意事項

1. **共有ドライブへのアクセス権限**: GASのサービスアカウントに`FAX/保存`フォルダへのアクセス権限が必要
2. **通知の重複**: 15分毎に監視するため、問題が解決されるまで15分毎に通知される
3. **フォルダID**: `17dL1uIUbGEaYhZpkwfTczl4JgvQ-IPKs` ← これは`FAX/保存`フォルダ（❌FAXSCAN_Logsではない）
4. **🔴 バックアップファイル**: `.gs`拡張子のバックアップをプロジェクトルートに絶対に置かない。GASは全`.gs`ファイルを同一スコープで実行するため`const CONFIG`等の重複宣言エラーになる（2026-03-10 24時間エラー発生の教訓）。バックアップは`_backup`フォルダに保存する。`.gitignore`に`*_backup_*`除外ルール追加済み。

## デザインガイドライン (2026-02-02追記)
本プロジェクトのデザイン・UI実装は、以下の共通ガイドラインに厳格に準拠してください。
- **基本カラー**: RED (#d2422d) / OHISAMA ORANGE (#ff5100)
- **アクセント**: 必要に応じて指定のカラーパレットから選択
- **詳細資料**: ../共通doc/OHISAMA_DESIGN_GUIDE.md および ../共通doc/OHISAMA_COLORS.png を参照
