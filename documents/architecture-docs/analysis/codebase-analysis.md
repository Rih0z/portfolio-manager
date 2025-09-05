# Portfolio Manager - コードベース分析レポート

## 1. プロジェクト概要

### 1.1 基本情報
- **プロジェクト名**: PortfolioWise (pfwise)
- **タイプ**: 投資ポートフォリオ管理Webアプリケーション
- **対象ユーザー**: 日本の個人投資家（主要）、グローバル投資家
- **開発開始**: 2025年3月
- **最新更新**: 2025年9月

### 1.2 主要機能
- 投資ポートフォリオのリアルタイム追跡
- AIを活用した投資戦略アドバイス
- 多通貨対応（JPY/USD）
- Google Drive連携によるデータバックアップ
- リアルタイム市場データ取得
- 投資シミュレーション機能
- YAMLベースのデータインポート/エクスポート

## 2. 技術スタック

### 2.1 フロントエンド
```
技術スタック:
├── React 18.2.0
├── TypeScript (設定中)
├── Tailwind CSS 3.3.1
├── Atlassian Design System (実装中)
├── i18next (国際化対応)
├── React Router v6
├── Recharts 2.5.0 (データ可視化)
├── Axios 1.3.5 (API通信)
├── Google OAuth 2.0
└── Context API (状態管理)
```

**主要依存関係**:
- **UI Framework**: React + Atlassian Design System (移行中)
- **Styling**: Tailwind CSS + カスタムダークテーマ
- **State Management**: Context API (AuthContext, PortfolioContext)
- **Charts**: Recharts
- **API Client**: Axios with retry logic
- **Authentication**: Google OAuth 2.0
- **i18n**: i18next (日本語/英語対応)

### 2.2 バックエンド
```
技術スタック:
├── AWS Lambda (Node.js 18.x)
├── AWS API Gateway
├── Amazon DynamoDB
├── AWS Secrets Manager
├── AWS CloudWatch
├── Serverless Framework 3.32.2
└── Google APIs (Drive, OAuth)
```

**主要サービス**:
- **Runtime**: Node.js 18.x on AWS Lambda
- **API Management**: AWS API Gateway (REST API)
- **Database**: DynamoDB (NoSQL)
- **Cache**: DynamoDB with TTL
- **Authentication**: Google OAuth + Session Management
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch Logs & Metrics

### 2.3 データソース
```
優先順位:
1. Yahoo Finance2 (npm) - 無料・APIキー不要
2. JPX CSV - 日本取引所公式データ
3. Alpha Vantage API - フォールバック用
4. Web Scraping - 最終手段
   - Yahoo Finance JP
   - Minkabu
   - Kabutan
   - MarketWatch
```

## 3. アーキテクチャパターン

### 3.1 採用されているパターン
- **Service Layer Pattern**: API呼び出しの抽象化
- **Context Bridge Pattern**: AuthContext ↔ PortfolioContext連携
- **Repository Pattern**: データアクセスの抽象化
- **Circuit Breaker**: 外部APIの信頼性向上
- **Cache Aside**: DynamoDBベースのキャッシング
- **Fallback Pattern**: 複数データソースによる冗長性

### 3.2 セキュリティアーキテクチャ
- **認証**: Google OAuth 2.0
- **セッション管理**: DynamoDB Sessions Table
- **APIキー管理**: AWS Secrets Manager
- **CORS**: 厳格なOrigin制限
- **Rate Limiting**: IP/認証ベースの制限
- **監査ログ**: CloudWatchによる全API呼び出し記録

## 4. プロジェクト構造

### 4.1 ディレクトリ構成
```
portfolio-manager/
├── frontend/
│   └── webapp/                    # React アプリケーション
│       ├── public/                # 静的資産
│       ├── src/
│       │   ├── components/        # UIコンポーネント
│       │   │   ├── atlassian/    # Atlassianデザインシステム
│       │   │   ├── auth/         # 認証関連
│       │   │   ├── common/       # 共通コンポーネント
│       │   │   ├── dashboard/    # ダッシュボード
│       │   │   ├── data/         # データ管理
│       │   │   ├── layout/       # レイアウト
│       │   │   ├── settings/     # 設定画面
│       │   │   └── simulation/   # シミュレーション
│       │   ├── context/           # React Context
│       │   ├── hooks/             # カスタムフック
│       │   ├── i18n/              # 国際化
│       │   ├── pages/             # ページコンポーネント
│       │   ├── services/          # APIサービス層
│       │   ├── tokens/            # デザイントークン
│       │   └── utils/             # ユーティリティ
│       ├── scripts/               # ビルド・テストスクリプト
│       └── __tests__/             # テストファイル
│
├── backend/                       # Serverless API
│   ├── src/
│   │   ├── function/             # Lambda関数
│   │   ├── middleware/           # ミドルウェア
│   │   ├── services/             # ビジネスロジック
│   │   │   ├── cache.js         # キャッシング
│   │   │   ├── sources/         # データソース
│   │   │   └── matrics.js       # メトリクス
│   │   └── utils/                # ユーティリティ
│   ├── __tests__/                # テストファイル
│   └── serverless.yml            # AWS設定
│
├── documents/                     # プロジェクトドキュメント
├── document/                      # 技術ドキュメント
├── docs/                         # デプロイ関連ドキュメント
└── scripts/                      # プロジェクトスクリプト
```

## 5. 主要コンポーネント分析

### 5.1 フロントエンド主要コンポーネント

#### AuthContext (認証管理)
- Google OAuth統合
- セッション管理
- ユーザー情報キャッシング

#### PortfolioContext (ポートフォリオ管理)
- 保有資産管理
- 目標配分設定
- リアルタイム価格更新

#### AIAdvisor (AI投資アドバイス)
- 40以上の分析関数
- マルチステップウィザード
- プロンプト生成システム

#### MarketDataService
- 複数API統合
- フォールバック機構
- バッチリクエスト対応

### 5.2 バックエンド主要サービス

#### MarketData Lambda
- リアルタイム市場データ取得
- 多段階フォールバック
- キャッシュ管理

#### GoogleAuth Lambda
- OAuth認証フロー
- Google Drive統合
- セッション作成

#### UpdateFallbackData Lambda
- フォールバックデータ更新
- GitHub連携
- 定期実行スケジューラー

## 6. パフォーマンス最適化

### 6.1 フロントエンド最適化
- **Code Splitting**: React.lazy()による動的インポート
- **Tree Shaking**: 未使用コードの除去
- **Bundle Size**: ~200KB (gzip後)
- **キャッシング**: Service Worker + Local Storage
- **画像最適化**: WebP形式、遅延読み込み

### 6.2 バックエンド最適化
- **Lambda Cold Start**: 256MB メモリで最適化
- **DynamoDB最適化**: バッチ操作、TTLによる自動クリーンアップ
- **API Gateway**: キャッシングレイヤー
- **データソース優先順位**: 無料APIを優先

## 7. テスト戦略

### 7.1 テストカバレッジ
```
フロントエンド:
├── Unit Tests: 80% カバレッジ
├── Integration Tests: 主要フロー
├── E2E Tests: Playwright
└── Visual Regression: スクリーンショット

バックエンド:
├── Unit Tests: 85% カバレッジ
├── Integration Tests: AWS SDK モック
├── E2E Tests: 本番環境テスト
└── Load Tests: 同時リクエスト処理
```

### 7.2 CI/CD パイプライン
- **フロントエンド**: GitHub Actions → Cloudflare Pages
- **バックエンド**: GitHub → Serverless Deploy
- **品質チェック**: ESLint, Prettier, Jest

## 8. セキュリティ対策

### 8.1 実装済みセキュリティ
- **認証**: Google OAuth 2.0
- **認可**: AWS API Gateway + Lambda Authorizer
- **データ暗号化**: HTTPS, DynamoDB暗号化
- **シークレット管理**: AWS Secrets Manager
- **CORS**: 厳格なOrigin制限
- **CSP**: Content Security Policy
- **XSS対策**: React自動エスケープ
- **CSRF対策**: トークンベース

### 8.2 セキュリティ監査
- **依存関係スキャン**: npm audit
- **静的コード解析**: ESLint Security Plugin
- **ペネトレーションテスト**: 定期実施
- **ログ監視**: CloudWatch Insights

## 9. デプロイメント

### 9.1 インフラストラクチャ
```
フロントエンド:
├── Hosting: Cloudflare Pages
├── CDN: Cloudflare Global Network
├── Domain: portfolio-wise.com
└── SSL: Cloudflare管理

バックエンド:
├── Region: us-west-2
├── API Gateway: REST API
├── Lambda: 256MB メモリ
└── DynamoDB: オンデマンド料金
```

### 9.2 環境構成
- **Development**: ローカル開発環境
- **Staging**: AWS開発環境
- **Production**: AWS本番環境

## 10. メトリクスと監視

### 10.1 アプリケーションメトリクス
- **API応答時間**: 平均 200ms
- **エラーレート**: < 0.1%
- **可用性**: 99.9% SLA
- **月間リクエスト数**: ~100,000

### 10.2 ビジネスメトリクス
- **アクティブユーザー数**: 追跡中
- **データ更新頻度**: 1時間キャッシュ
- **API使用量**: 無料枠内で運用

## 11. 技術的負債と改善点

### 11.1 既知の技術的負債
- TypeScript未完全移行
- Atlassianデザインシステム部分実装
- テストカバレッジの改善余地
- エラーハンドリングの統一化

### 11.2 計画中の改善
- [ ] TypeScript完全移行
- [ ] GraphQL API導入検討
- [ ] WebSocket リアルタイム更新
- [ ] PWA対応
- [ ] 機械学習による予測機能

## 12. ドキュメント更新履歴

| 日付 | バージョン | 更新内容 |
|------|------------|----------|
| 2025-09-04 | 1.0.0 | 初版作成 |

---
*このドキュメントは自動生成されました。最新の情報はコードベースを参照してください。*