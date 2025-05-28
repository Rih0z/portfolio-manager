# デプロイメントガイド

## Netlifyデプロイ（フロントエンド）

### 現在の設定
`netlify.toml`は正しく設定されています：
```toml
[build]
  base = "frontend/webapp"
  command = "CI= npm run build"
  publish = "build"
```

### デプロイ手順
1. Netlifyダッシュボードでプロジェクトを作成
2. GitHubリポジトリを接続
3. 環境変数を設定：
   - `REACT_APP_API_BASE_URL`: AWSのAPI Gateway URL
   - `REACT_APP_DEFAULT_EXCHANGE_RATE`: 150.0

### 注意事項
- `netlify/functions/`フォルダの古いプロキシ関数は削除可能（バックエンドはAWSに移行済み）

## AWSデプロイ（バックエンド）

### 前提条件
- AWS CLIがインストール・設定済み
- Node.js v18
- Serverless Frameworkがインストール済み

### デプロイ手順
```bash
cd backend

# 依存関係のインストール
npm install

# AWS Secrets Managerにシークレットを設定
./scripts/setup-all-secrets.sh

# 開発環境へのデプロイ
npm run deploy

# 本番環境へのデプロイ
npm run deploy:prod
```

### 必要なAWSサービス
- API Gateway
- Lambda
- DynamoDB
- Secrets Manager
- CloudWatch Logs

## ディレクトリ構造の最適化結果

### 削除済みファイル
- ハードコードされたAWS URLを環境変数に変更
- テストHTMLファイルを公開ディレクトリから削除
- 一時ファイルとログファイルを削除
- 古いバックアップファイルを削除

### 推奨される追加のクリーンアップ
1. **重複したmessageフォルダ**の統合
   - `document/backend/message/`と`document/frontend/message/`に同じファイルが多数存在
   - 共通ファイルは`document/common/message/`に移動を推奨

2. **DynamoDB Localの除外**
   - `backend/dynamodb-local/`フォルダは開発用
   - `.gitignore`に追加してリポジトリから除外を推奨

3. **複数のGoogle認証実装**の統一
   - デバッグ用の複数バージョンを本番用に統一

## モノレポ構造の利点
- フロントエンドとバックエンドの一元管理
- 共通の型定義やユーティリティの共有が可能
- デプロイの同期が容易
- ドキュメントの一元化

## セキュリティチェックリスト
- [x] 環境変数でAPI URLを管理
- [x] テストファイルを公開ディレクトリから削除
- [x] ログからトークン情報をマスク
- [x] AWS Secrets Managerで認証情報を管理
- [ ] 本番環境でデバッグエンドポイントを無効化
- [ ] CORS設定を本番用に厳密化