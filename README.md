# PortfolioWise 📈

> AI連携型の投資ポートフォリオ管理システム - 日本・米国市場対応

[![Live Demo](https://img.shields.io/badge/Live-portfolio--wise.com-success)](https://portfolio-wise.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-Available-green)](./docs/)

## 🚀 クイックスタート

```bash
# フロントエンド
cd frontend/webapp
npm install
npm start
# http://localhost:3000 で起動

# バックエンド（オプション）
cd backend
npm install
npm run dev
```

## 🎯 主な機能

- **📊 リアルタイム市場データ** - Yahoo Finance、JPXから自動取得
- **🤖 AI分析プロンプト生成** - Claude/ChatGPT用の投資分析プロンプトを自動生成
- **💱 マルチ通貨対応** - JPY/USD自動換算
- **💾 Google Drive連携** - ポートフォリオデータの自動バックアップ
- **🌙 ダークモード** - 目に優しいNetflix風UI
- **🌏 多言語対応** - 日本語/英語切り替え

## 📚 ドキュメント

| カテゴリ | 説明 | リンク |
|---------|------|--------|
| **ユーザーガイド** | 使い方・日本市場対応表 | [USER_GUIDE.md](./docs/USER_GUIDE.md) |
| **API仕様** | エンドポイント一覧 | [api-specification.md](./docs/api-specification.md) |
| **技術仕様** | アーキテクチャ詳細 | [TECHNICAL.md](./docs/TECHNICAL.md) |
| **デプロイメント** | 環境構築手順 | [DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| **トラブルシューティング** | デプロイエラー対処法 | [DEPLOYMENT_TROUBLESHOOTING.md](./docs/DEPLOYMENT_TROUBLESHOOTING.md) |
| **開発ガイド** | 開発者向け情報 | [CLAUDE.md](./CLAUDE.md) |
| **アーキテクチャ** | システム設計 | [architecture-docs/](./docs/architecture-docs/) |

## 🛠️ 技術スタック

**Frontend**: React 18 • TypeScript 5.x • Vite 7.x • Zustand • TanStack Query • shadcn/ui + Radix UI • TailwindCSS • Recharts
**Backend**: AWS Lambda • DynamoDB • Serverless Framework
**Auth**: Google OAuth 2.0 + JWT Dual-Mode
**Testing**: Vitest + React Testing Library + Playwright E2E
**Hosting**: Cloudflare Pages (Frontend) • AWS (Backend)

## 📦 環境設定

```bash
# 必須環境変数（.env.production）
REACT_APP_API_BASE_URL=https://your-api.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

詳細は[デプロイメントガイド](./docs/DEPLOYMENT.md)参照

## 🔧 開発

```bash
# テスト実行
npm test

# ビルド
npm run build

# デプロイ（Cloudflare Pages）
wrangler pages deploy build --project-name=pfwise-portfolio-manager
# デプロイに失敗する場合は DEPLOYMENT_TROUBLESHOOTING.md を参照
```

## 🤝 貢献

プルリクエスト歓迎！[Contributing Guidelines](./CONTRIBUTING.md)をご確認ください。

## 📈 バージョン履歴

最新の変更は[CHANGELOG.md](./CHANGELOG.md)、  
移行手順は[MIGRATION.md](./MIGRATION.md)を参照してください。

## 📄 ライセンス

MIT © 2025 PortfolioWise - [LICENSE](./LICENSE)

## 🆘 サポート

- **Issues**: [GitHub Issues](https://github.com/portfoliowise/portfolio-manager/issues)
- **Email**: support@portfolio-wise.com
- **Web**: https://portfolio-wise.com

---

**開発中の機能**: ソーシャル・ポートフォリオ（匿名共有）、PWA対応 - [ロードマップ](./docs/TECHNICAL.md#future-enhancements)参照