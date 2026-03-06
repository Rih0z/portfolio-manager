# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Stripe サブスクリプション連携（Checkout / Customer Portal / Webhook）
- subscriptionStore + subscriptionService（Zustand ベース）
- 料金プランページ（/pricing）
- 法務ページ（利用規約、プライバシーポリシー、特定商取引法、免責事項）
- Footer コンポーネント（法務リンク + コピーライト）

---

## [2026-03-05] - Phase 2-A: UX/デザイン刷新

### Added
- **shadcn/ui 8コンポーネント**: Button, Card, Input, Badge, Dialog, Progress, Switch, Tabs
- **CVA (class-variance-authority)** によるバリアント管理
- **CSS Variables テーマシステム**: Light/Dark/System 3モード対応
- **CSV取込パーサー**: SBI証券 / 楽天証券 / 汎用フォーマット（Shift-JIS自動検出）
- **ポートフォリオスコア**: 8指標（分散度/目標適合度/コスト効率/リバランス健全度/通貨分散/配当効率/アセット分散/データ鮮度）
- JetBrains Mono フォント（tabular-nums 数値表示）

### Changed
- デザインシステムを Atlassian Design → shadcn/ui + Radix UI に移行
- カラーシステムをハードコード → CSS Variables（セマンティックトークン）に変更
- テーマ切替を OS 連動 + 手動トグル対応に拡張

### Technical
- 46ファイル変更、+3,190 / -729行
- バンドルサイズ: 988KB → 1,057KB (+7%)
- テスト: 1,387 passed / 33 skipped / 0 failed

---

## [2026-03-05] - Phase 0-C: 状態管理刷新

### Changed
- **React Context API → Zustand 5.x** に全面移行
- **TanStack Query 5.x** でサーバーステート管理を導入
- 4ストア体制: authStore, portfolioStore, uiStore, subscriptionStore
- cross-store 通信に `getState()` パターン採用

### Removed
- AuthContext / PortfolioContext / ContextConnector（全廃止）
- Context Provider ラッピング構造

### Technical
- 31+ コンポーネントの store 参照を移行
- テスト: vi.mock() パターンで全テスト更新

---

## [2026-03-04] - Phase 0-B: TypeScript + Vitest 移行

### Changed
- **JavaScript → TypeScript** インクリメンタル移行（strict: false, allowJs: true）
- **Jest → Vitest** テストフレームワーク移行
- **CRA (react-scripts) → Vite** ビルドツール移行
- MSW v1 モック構成を Vitest 互換に更新

### Technical
- vitest.config.ts + vitest.setup.ts 新規作成
- @vitest/coverage-v8 によるカバレッジ計測

---

## [2026-03-03] - Phase 0-A: セキュリティ脆弱性修正

### Fixed
- CRITICAL/HIGH/MEDIUM 6件のセキュリティ脆弱性を修正
- JWT デュアルモード認証の実装（メモリ保存 + httpOnly Cookie）
- Token Reuse Detection（DynamoDB 管理）

### Added
- JWT Access Token: HS256, 24時間有効
- Refresh Token: httpOnly Cookie, 7日間有効
- POST /auth/refresh: Origin 必須化、CSRF 保護

---

## [2025-08-22] - Phase 2: Atlassian Design System (Deprecated)

### Note
> このバージョンのデザインシステムは Phase 2-A (2026-03-05) で shadcn/ui に置き換えられました。

### Added
- Atlassian Design System 実装（Button, Card, Input, Modal）
- Dashboard & AI strategy タブ UI 刷新

---

## [2025-06-04] - 初期セットアップウィザード

### Added
- マーケット選択ウィザード
- ポートフォリオリセット機能
- 日本投資信託サポート

---

## [2025-06-02] - ダークテーマ & モバイル

### Added
- Netflix/Uber インスパイアダークテーマ
- モバイルレスポンシブ対応
- 多言語サポート (日本語/英語)

---

## [2025-05-29] - インフラ移行

### Changed
- Netlify → Cloudflare Pages 移行
- API設定をサーバーサイド管理に変更

### Added
- AWS Secrets Manager 統合
- CORS 設定更新

---

## [2025-05-27] - 初回公開リリース

### Added
- ポートフォリオ管理コア機能
- 市場データ連携
- Google OAuth 認証
- Google Drive バックアップ/リストア
- AI プロンプト生成

### Technical Stack
- Frontend: React 18, TailwindCSS, Recharts
- Backend: AWS Lambda, DynamoDB, Serverless Framework
- Authentication: Google OAuth 2.0
- Hosting: Cloudflare Pages (frontend), AWS (backend)
