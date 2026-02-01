# GitHub リポジトリ作成手順

## OhiScan-Monitor リポジトリのセットアップ

### 手動でGitHubリポジトリを作成する手順

1. **GitHubにアクセス**
   - https://github.com にアクセスしてログイン

2. **新しいリポジトリを作成**
   - 右上の「+」ボタンから「New repository」を選択
   - または https://github.com/new にアクセス

3. **リポジトリ設定**
   - **Repository name**: `OhiScan-Monitor`
   - **Description**: `OhiScanアプリケーションの稼働状況を監視するGASアプリ`
   - **Public** を選択
   - **Initialize this repository with a README** のチェックは **外す**（既にREADME.mdがあるため）
   - 「Create repository」をクリック

4. **ローカルリポジトリをプッシュ**
   
   GitHubでリポジトリが作成されたら、以下のコマンドを実行：

   ```bash
   cd "/Users/user/Library/CloudStorage/GoogleDrive-hiroshi.iwaki@nhw.jp/マイドライブ/Antigravity-PJ/OhiScan Monitor"
   
   # GitHubリポジトリのURLを確認（GitHubのページに表示されます）
   # 例: https://github.com/YOUR_USERNAME/OhiScan-Monitor.git
   
   # リモートリポジトリを追加
   git remote add origin https://github.com/YOUR_USERNAME/OhiScan-Monitor.git
   
   # プッシュ
   git branch -M main
   git push -u origin main
   ```

5. **確認**
   - GitHubのリポジトリページを開いて、ファイルがプッシュされたことを確認

---

## もしくは、GitHub Desktop を使用する場合

1. GitHub Desktop を開く
2. 「File」→「Add Local Repository」
3. フォルダパスを選択: `/Users/user/Library/CloudStorage/GoogleDrive-hiroshi.iwaki@nhw.jp/マイドライブ/Antigravity-PJ/OhiScan Monitor`
4. 「Publish repository」をクリック
5. リポジトリ名を `OhiScan-Monitor` に設定
6. 「Publish Repository」で完了

---

## 現在の状態

✅ **完了済み**:
- プロジェクトフォルダ作成
- GASコード（Code.gs）作成
- README.md 作成
- clasp設定ファイル作成
- Git初期化とコミット
- claspでGASプロジェクトにプッシュ

🔄 **次のステップ**:
- GitHubリポジトリの作成とプッシュ
- GASエディタでトリガー設定
- 動作テスト
