# SOLID原則に基づくリファクタリング

## 概要

PortfolioWiseプロジェクトを SOLID原則に従ってリファクタリングしました。主な変更点は以下の通りです。

## ファイル構造の改善

### 1. ルートディレクトリの整理

移動したファイル:
- デプロイメントスクリプト → `scripts/deployment/`
- デプロイメントドキュメント → `docs/deployment/`
- テストデータ → `test-data/`
- E2Eテスト結果 → `test-results/`
- GitHub Actions → `.github/workflows/`

### 2. フロントエンドのサービス層の追加

新しいディレクトリ構造:
```
frontend/webapp/src/
├── services/portfolio/     # ビジネスロジックサービス
│   ├── CalculationService.js
│   ├── EncryptionService.js
│   ├── NotificationService.js
│   ├── SimulationService.js
│   └── storage/           # ストレージプロバイダー
│       ├── StorageInterface.js
│       ├── LocalStorageProvider.js
│       └── GoogleDriveProvider.js
├── hooks/portfolio/       # カスタムフック（今後実装）
├── types/                 # 型定義
│   └── portfolio.types.js
└── constants/            # 定数（今後実装）
```

## SOLID原則の適用

### 1. Single Responsibility Principle (単一責任の原則)

PortfolioContext.jsの巨大な責任を以下のサービスに分割:

- **NotificationService**: 通知の管理のみを担当
- **EncryptionService**: データの暗号化/復号化のみを担当
- **CalculationService**: ポートフォリオ計算ロジックのみを担当
- **SimulationService**: 投資シミュレーションのみを担当

### 2. Open/Closed Principle (開放閉鎖の原則)

- 新しい通貨ペアのサポートを追加しやすい設計
- 新しいストレージプロバイダーを追加しやすい設計
- 計算ロジックの拡張が容易

### 3. Liskov Substitution Principle (リスコフの置換原則)

- すべての資産（Asset）が同じインターフェースを実装
- ストレージプロバイダーが共通のインターフェースを実装

### 4. Interface Segregation Principle (インターフェース分離の原則)

- 大きなPortfolioContextを複数の小さなサービスに分割
- 各コンポーネントは必要なサービスのみに依存

### 5. Dependency Inversion Principle (依存性逆転の原則)

- StorageProviderとCloudSyncProviderの抽象インターフェースを定義
- 具体的な実装（LocalStorage、GoogleDrive）に依存しない設計

## セキュリティの改善

1. **.gitignoreの更新**:
   - 環境変数ファイルの除外を強化
   - テストデータとE2E結果の除外
   - DynamoDBローカルファイルの除外

2. **環境変数ファイルの削除**:
   - `.env.development`、`.env.production`を削除
   - `cloudflare-env.txt`を削除

## 今後の作業

1. **PortfolioContextのリファクタリング**:
   - 新しいサービスを使用するように更新
   - 依存性注入パターンの実装

2. **カスタムフックの作成**:
   - `usePortfolioData`
   - `usePortfolioActions`
   - `useMarketData`
   - `useSimulation`

3. **テストの追加**:
   - 各サービスのユニットテスト
   - 統合テスト

4. **TypeScriptへの移行** (オプション):
   - より強い型安全性のため

## 利点

1. **保守性の向上**: 各クラスが単一の責任を持つため、理解しやすく修正しやすい
2. **テスタビリティの向上**: 各サービスを独立してテスト可能
3. **拡張性の向上**: 新機能の追加が既存コードを壊すリスクが低い
4. **再利用性の向上**: サービスを他のコンポーネントで再利用可能
5. **チーム開発の効率化**: 責任が明確に分離されているため、並行作業が容易

## 参考

- [SOLID原則](https://ja.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)