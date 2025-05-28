# Portfolio Manager Monorepo

ポートフォリオ管理アプリケーションのモノレポジトリです。フロントエンドとバックエンドのコードを統合管理しています。

## 📁 プロジェクト構造

```
portfolio-manager/
├── frontend/
│   └── webapp/        # React Webアプリケーション
├── backend/           # バックエンドAPI（AWS Lambda関数）
├── netlify/          # Netlifyサーバーレス関数
└── netlify.toml      # Netlify設定ファイル
```

## 🚀 開発

### フロントエンド（Webアプリ）

```bash
# 依存関係のインストール
cd frontend/webapp
npm install

# 開発サーバーの起動
npm start

# テストの実行
npm test

# プロダクションビルド
npm run build
```

### バックエンド

```bash
# 依存関係のインストール
cd backend
npm install

# 開発サーバーの起動
npm run dev
```

### モノレポ全体のコマンド

ルートディレクトリから実行：

```bash
# すべての依存関係をインストール
npm run install:all

# Webアプリの開発サーバー起動
npm run dev:webapp

# Webアプリのビルド
npm run build:webapp

# Webアプリのテスト
npm run test:webapp
```

## 📦 デプロイ

### Netlifyへのデプロイ

メインブランチにプッシュすると、フロントエンドが自動的にNetlifyにデプロイされます。

Netlifyの設定：
- Base directory: `frontend/webapp`
- Build command: `npm run build`
- Publish directory: `frontend/webapp/build`

### 環境変数

以下の環境変数を設定してください：

```bash
REACT_APP_API_BASE_URL=<AWS API Gateway URL>
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

## 🛠 技術スタック

### フロントエンド
- React 18
- TailwindCSS
- Recharts
- Google OAuth
- Axios

### バックエンド
- AWS Lambda
- API Gateway
- DynamoDB（予定）

## 📝 ライセンス

Private repository

## 👥 貢献者

- Koki Riho (@Rih0z)