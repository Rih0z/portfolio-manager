# PortfolioWise アーキテクチャドキュメント

## 📚 ドキュメント構成

このディレクトリには、PortfolioWise プロジェクトの包括的なアーキテクチャドキュメントが含まれています。

### 📂 ディレクトリ構造

```
architecture-docs/
├── README.md                    # このファイル
├── analysis/
│   └── codebase-analysis.md    # コードベース詳細分析
└── architecture/
    ├── overview.md              # アーキテクチャ概要・図表
    ├── implementation-guide.md  # 実装ガイド
    └── technology-decisions.md  # 技術的意思決定記録（ADR）
```

## 📊 ドキュメント概要

### 1. コードベース分析 (`analysis/codebase-analysis.md`)
プロジェクトの技術スタック、依存関係、コード構造の詳細な分析レポート。

**主な内容**:
- プロジェクト概要と主要機能
- 技術スタック詳細（フロントエンド・バックエンド）
- アーキテクチャパターンとベストプラクティス
- パフォーマンス最適化とセキュリティ対策
- テスト戦略とカバレッジ

### 2. アーキテクチャ概要 (`architecture/overview.md`)
システム全体のアーキテクチャ設計と各種ダイアグラム。

**含まれる図表**:
- C4モデル（Context, Container, Component）
- データフロー図
- デプロイメント図
- セキュリティアーキテクチャ
- データモデル（ERD）
- 状態遷移図

### 3. 実装ガイド (`architecture/implementation-guide.md`)
開発者向けの実践的な実装ガイドライン。

**主なセクション**:
- 開発環境セットアップ
- コーディング規約
- 状態管理パターン
- API実装パターン
- テスト実装ガイド
- デプロイメント手順
- トラブルシューティング

### 4. 技術的意思決定記録 (`architecture/technology-decisions.md`)
プロジェクトの重要な技術的決定とその根拠。

**記録されている決定**:
- ADR-001: React採用
- ADR-002: Atlassian Design System導入
- ADR-003: AWS Lambdaサーバーレス
- ADR-004: DynamoDB NoSQL
- ADR-005: マルチソース市場データ戦略
- ADR-006: Google OAuth認証
- ADR-007: i18n国際化
- ADR-008: Cloudflare Pagesホスティング
- ADR-009: Context API状態管理
- ADR-010: TypeScript段階的導入
- ADR-011: YAMLデータ形式
- ADR-012: AWSコスト最適化

## 🚀 クイックスタート

### アーキテクチャを理解したい方
1. `architecture/overview.md` でシステム全体像を把握
2. `analysis/codebase-analysis.md` で技術詳細を確認

### 開発を始める方
1. `architecture/implementation-guide.md` の開発環境セットアップを実施
2. コーディング規約とパターンを確認

### 技術的背景を知りたい方
1. `architecture/technology-decisions.md` で意思決定の経緯を確認

## 🔄 更新方法

### ドキュメント更新時のガイドライン

1. **Markdownフォーマット**: 全ドキュメントはMarkdown形式で記述
2. **図表**: Mermaid記法を使用（GitHubで自動レンダリング）
3. **バージョン管理**: 重要な変更時は更新履歴を記載
4. **相互参照**: 関連ドキュメントへのリンクを維持

### 更新プロセス
```bash
# 1. ドキュメント編集
vim architecture/overview.md

# 2. 図表の更新（Mermaid）
# Mermaid記法で直接編集

# 3. レビューと確認
# プレビューで表示確認

# 4. コミット
git add .
git commit -m "docs: アーキテクチャドキュメント更新"
git push
```

## 📈 プロジェクト統計

- **開始日**: 2025年3月
- **主要言語**: JavaScript (React, Node.js)
- **インフラ**: AWS Lambda + Cloudflare Pages
- **月間コスト**: < $25 USD
- **可用性**: 99.9% SLA
- **対応言語**: 日本語、英語

## 🔗 関連リンク

- **本番環境**: [https://portfolio-wise.com/](https://portfolio-wise.com/)
- **GitHub**: [https://github.com/Rih0z/portfolio-manager](https://github.com/Rih0z/portfolio-manager)
- **API仕様**: `/document/how-to-call-api.md`
- **コーディング規約**: `/document/code-convention.md`

## 📝 ライセンス

このドキュメントはプロジェクトの一部として管理されています。

## 🏷️ タグ

`#architecture` `#documentation` `#react` `#aws` `#serverless` `#portfolio-management`

---
*最終更新: 2025-09-04*  
*自動生成ドキュメント*