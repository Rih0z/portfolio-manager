# MacBook向け マーケットデータAPI デプロイガイド（2025年更新版）

このガイドはMacBook環境でのポートフォリオマネージャーマーケットデータAPIの開発・デプロイ手順をまとめたものです。**実際のデプロイで発生した問題と解決方法**を重点的にまとめています。

## 1. 前提条件

### 1.1 必要なツール
- Node.js（**18.x系固定**）
- npm または yarn
- AWS CLI（設定済み）
- Serverless Framework
- Git

### 1.2 AWSアカウント情報
- AWS IAMユーザー（プログラムによるアクセス）
- アクセスキーとシークレットアクセスキー
- AWSアカウントID（デプロイ時に必要）
- **重要**: IAMユーザーには**AdministratorAccess**権限が必要

### 1.3 Google Cloud Platform
- Googleアカウント
- Google Cloud Platformプロジェクト
- OAuth 2.0クライアントID（Google認証に必要）

## 2. Node.js環境のセットアップ

### 2.1 nvmインストールと設定
```bash
# nvmのインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# ターミナルを再起動するか、以下を実行
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js 18.xをインストール
nvm install 18.20.8
nvm use 18.20.8

# バージョン確認
node -v  # -> v18.20.8
npm -v   # -> 10.8.2
```

### 2.2 .nvmrcファイル作成
```bash
# プロジェクトルートで
echo "18.20.8" > .nvmrc
```

## 3. AWSセットアップ

### 3.1 AWS CLIインストールと設定
```bash
# AWS CLIのインストール
brew install awscli

# AWS認証情報の設定
aws configure
```

プロンプトに従って入力:
- AWS Access Key ID: `AKIA...`
- AWS Secret Access Key: `...`
- Default region name: `us-west-2`
- Default output format: `json`

### 3.2 IAM権限の設定（重要）

**デプロイ前に必須**: IAMユーザーに適切な権限を付与

#### 方法1: AWSコンソールで権限追加（推奨）

1. [AWS IAM Console](https://console.aws.amazon.com/iam/home?region=us-west-2#/users) にアクセス
2. 使用するIAMユーザー（例：`portfolio-api-user`）をクリック
3. **「許可」タブ** → **「許可を追加」** をクリック
4. **「ポリシーを直接アタッチ」** を選択
5. 検索ボックスに `AdministratorAccess` と入力
6. `AdministratorAccess` を選択して **「許可を追加」**

#### 方法2: AWS CLIで権限追加

```bash
# AdministratorAccessを追加
aws iam attach-user-policy \
  --user-name portfolio-api-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 権限確認
aws iam list-attached-user-policies --user-name portfolio-api-user
```

## 4. プロジェクトセットアップ

### 4.1 プロジェクト構造の作成
```bash
# プロジェクトディレクトリの作成
mkdir pfwise-api
cd pfwise-api

# ディレクトリ構造の作成
mkdir -p src/{function/{admin,auth,drive},services,utils,config}
```

### 4.2 最適化されたpackage.jsonの配置

**重要**: Lambdaサイズ制限対応のため、依存関係を最小化

```json
{
  "name": "pfwise-api",
  "version": "1.0.0",
  "description": "ポートフォリオマネージャーWebアプリケーション用の市場データ取得APIサービス",
  "main": "index.js",
  "private": true,
  "scripts": {
    "deploy": "serverless deploy --stage dev",
    "deploy:prod": "serverless deploy --stage prod"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "serverless": "^3.32.2",
    "serverless-dotenv-plugin": "^4.0.2",
    "serverless-offline": "^12.0.4"
  },
  "engines": {
    "node": ">=18.x <=18.x"
  }
}
```

### 4.3 依存関係のインストール
```bash
# 依存関係のインストール
npm install

# Serverless Frameworkのグローバルインストール
npm install -g serverless
```

## 5. 環境変数設定

### 5.1 .envファイルの作成

```bash
# .envファイルの作成
touch .env
```

### 5.2 必要最小限の.env設定

**重要**: `AWS_REGION`や`AWS_ACCOUNT_ID`は含めない（Lambda予約語のため）

```env
# 管理者設定
ADMIN_EMAIL=your-email@example.com
ADMIN_API_KEY=<openssl rand -hex 16で生成>
CRON_SECRET=<openssl rand -hex 16で生成>

# Google OAuth設定（後で設定）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 使用量制限
DAILY_REQUEST_LIMIT=5000
MONTHLY_REQUEST_LIMIT=100000
DISABLE_ON_LIMIT=true

# キャッシュ設定
CACHE_TIME_US_STOCK=3600
CACHE_TIME_JP_STOCK=3600
CACHE_TIME_MUTUAL_FUND=10800
CACHE_TIME_EXCHANGE_RATE=21600

# その他設定
SESSION_TABLE=pfwise-api-dev-sessions
CORS_ALLOW_ORIGIN=*
DRIVE_FOLDER_NAME=PortfolioManagerData
LOG_LEVEL=info
DEFAULT_EXCHANGE_RATE=150.0
```

### 5.3 APIキーの生成
```bash
# ADMIN_API_KEYの生成
openssl rand -hex 16

# CRON_SECRETの生成
openssl rand -hex 16
```

## 6. Serverless設定

### 6.1 最小構成serverless.yml

**重要**: エラー対応済みの設定

```yaml
service: pfwise-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: us-west-2
  stage: dev
  memorySize: 256
  timeout: 30
  
  environment:
    NODE_ENV: ${self:provider.stage}
    ADMIN_EMAIL: ${env:ADMIN_EMAIL, ''}
    ADMIN_API_KEY: ${env:ADMIN_API_KEY, ''}
    CRON_SECRET: ${env:CRON_SECRET, ''}
    # AWS_REGION: 削除（Lambda予約語）
    # AWS_ACCOUNT_ID: 削除（Lambda予約語）
    DAILY_REQUEST_LIMIT: ${env:DAILY_REQUEST_LIMIT, '5000'}
    MONTHLY_REQUEST_LIMIT: ${env:MONTHLY_REQUEST_LIMIT, '100000'}
    CORS_ALLOW_ORIGIN: ${env:CORS_ALLOW_ORIGIN, '*'}
    LOG_LEVEL: ${env:LOG_LEVEL, 'info'}
  
  iamRoleStatements:
    - Effect: Allow
      Action:
        - dynamodb:Query
        - dynamodb:Scan
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:UpdateItem
        - dynamodb:DeleteItem
      Resource: 
        - !GetAtt MarketDataCacheTable.Arn

functions:
  # 最小構成：必要最小限の関数のみ
  marketData:
    handler: src/function/marketData.handler
    events:
      - http:
          path: api/market-data
          method: get
          cors: true

resources:
  Resources:
    MarketDataCacheTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-${self:provider.stage}-cache
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: key
            AttributeType: S
        KeySchema:
          - AttributeName: key
            KeyType: HASH
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true

plugins:
  - serverless-dotenv-plugin
```

### 6.2 .serverlessignore作成（Lambdaサイズ最適化）

```bash
touch .serverlessignore
```

.serverlessignoreの内容：
```
# 開発関連ファイル
.git/**
.gitignore
.env*
.nvmrc
README.md
*.md

# テスト関連
__tests__/**
test/**
*.test.js
jest.config.js
coverage/**

# 開発用ツール
.vscode/**
*.log
.serverless/**

# 大きな開発用依存関係
node_modules/serverless/**
node_modules/jest/**
node_modules/@babel/**
node_modules/webpack/**

# OS関連
.DS_Store
Thumbs.db

# 一時ファイル
tmp/**
temp/**
```

## 7. 段階的デプロイ手順

### 7.1 デプロイ前の最終確認

```bash
# Node.jsバージョン確認
node -v  # v18.20.8であることを確認

# AWS認証情報確認
aws sts get-caller-identity

# プロジェクトサイズ確認
du -sh node_modules  # 50MB以下であることを確認

# 権限確認（AdministratorAccessがあることを確認）
aws iam list-attached-user-policies --user-name <your-iam-user>
```

### 7.2 初回デプロイ実行

```bash
# キャッシュクリア
rm -rf .serverless node_modules package-lock.json

# 本番用依存関係のみインストール
npm install --production

# デプロイ実行
npm run deploy
```

### 7.3 デプロイ成功確認

```bash
# サービス情報表示
serverless info --stage dev

# APIテスト
curl "https://[api-id].execute-api.us-west-2.amazonaws.com/dev/api/market-data?type=us-stock&symbols=AAPL"
```

## 8. 実際に発生したエラーと解決策

### 8.1 IAM権限不足エラー

**エラー**: `iam:CreateRole action`が許可されていない

**解決策**: 
- AWSコンソールで`AdministratorAccess`を追加
- PowerUserAccessでは不十分

### 8.2 Lambda環境変数エラー

**エラー**: `AWS_REGION`は予約済み環境変数

**解決策**: 
- serverless.ymlから`AWS_REGION`を削除
- Lambda内では`process.env.AWS_REGION`で自動取得可能

### 8.3 SNSトピックエラー

**エラー**: `Invalid parameter: Endpoint`

**解決策**: 
- SNS設定を一時的にコメントアウト
- `ADMIN_EMAIL`が空の場合に発生

### 8.4 Lambdaサイズ制限エラー

**エラー**: `Unzipped size must be smaller than 262144000 bytes`

**解決策**: 
1. `.serverlessignore`で不要ファイルを除外
2. `devDependencies`を本番デプロイから除外
3. AWS SDKをdependenciesから削除（Lambda環境で利用可能）
4. 段階的デプロイ（最小構成から開始）

### 8.5 リージョン設定エラー

**解決策**: 
- AWS CLI、serverless.yml、環境変数で`us-west-2`に統一

## 9. トラブルシューティングチェックリスト

### 9.1 デプロイ前チェック
- [ ] Node.js 18.x系を使用
- [ ] IAMユーザーにAdministratorAccess権限
- [ ] node_modulesサイズが50MB以下
- [ ] .envに`AWS_REGION`が含まれていない
- [ ] リージョンが`us-west-2`で統一

### 9.2 エラー発生時の対処
```bash
# 1. キャッシュクリア
rm -rf .serverless node_modules package-lock.json

# 2. 最小限の依存関係インストール
npm install --production

# 3. デバッグ情報付きデプロイ
SLS_DEBUG=* npm run deploy

# 4. CloudFormationスタック確認
aws cloudformation describe-stacks --stack-name pfwise-api-dev --region us-west-2
```

### 9.3 緊急時の対処
```bash
# 失敗したスタックの削除
aws cloudformation delete-stack --stack-name pfwise-api-dev --region us-west-2

# 削除完了待機
aws cloudformation wait stack-delete-complete --stack-name pfwise-api-dev --region us-west-2

# 再デプロイ
npm run deploy
```

## 10. 段階的機能追加

### 10.1 基本デプロイ成功後

まずは最小構成でデプロイを成功させ、その後段階的に機能を追加：

1. **第1段階**: マーケットデータ取得機能のみ
2. **第2段階**: 管理者機能を追加
3. **第3段階**: Google認証機能を追加
4. **第4段階**: Google Drive連携を追加

### 10.2 Google Cloud Platform設定

基本デプロイ成功後にGoogle認証を設定：

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. OAuth 2.0認証情報を作成
3. `.env`ファイルに`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`を追加
4. Google関連の関数を段階的に追加

## 11. 本番環境デプロイ

### 11.1 本番環境用設定

```bash
# 本番環境用の環境変数ファイル
cp .env .env.prod

# 本番環境デプロイ
serverless deploy --stage prod
```

### 11.2 セキュリティ強化

- AWS Parameter StoreまたはSecrets Managerの使用
- IAM権限の最小化
- API Gatewayでのレート制限設定
- CloudWatch Alarmsの設定

## 12. よくある質問

### Q1: PowerUserAccessでは不十分ですか？
A: Serverless FrameworkでのLambda関数デプロイには`iam:CreateRole`権限が必要で、PowerUserAccessでは制限される場合があります。開発環境では`AdministratorAccess`を推奨します。

### Q2: node_modulesサイズを小さくするには？
A: 
- AWS SDKを`devDependencies`に移動
- `.serverlessignore`で不要ファイルを除外
- `npm install --production`で本番用のみインストール

### Q3: エラーが続く場合は？
A: 
1. CloudFormationスタックを完全削除
2. 最小構成から再デプロイ
3. 段階的に機能を追加

---

このガイドは実際のデプロイ経験に基づいており、MacBook環境での典型的な問題と解決策を網羅しています。順序通りに実行することで、確実にデプロイを成功させることができます。
