# PortfolioWise 技術的意思決定記録 (ADR)

## ADR-001: フロントエンドフレームワークとしてReactを採用

**日付**: 2025-03-01  
**ステータス**: 承認済み  
**決定者**: 開発チーム

### コンテキスト
モダンな投資ポートフォリオ管理アプリケーションのフロントエンドフレームワークを選定する必要があった。

### 決定
React 18を採用する。

### 理由
- **エコシステムの充実**: 豊富なライブラリとコンポーネント
- **開発者の習熟度**: チームのReact経験が豊富
- **パフォーマンス**: Virtual DOMとReact 18の並行レンダリング
- **型安全性**: TypeScriptとの優れた統合（将来的な移行計画）
- **コミュニティ**: 大規模で活発なコミュニティサポート

### 結果
- ✅ 迅速な開発が可能になった
- ✅ 豊富なサードパーティライブラリを活用
- ⚠️ バンドルサイズの管理が必要

---

## ADR-002: Atlassian Design Systemの段階的導入

**日付**: 2025-08-22
**ステータス**: ❌ 廃止済み（ADR-014 で shadcn/ui に置換）
**決定者**: UXチーム・開発チーム

### コンテキスト
エンタープライズレベルのUI品質とアクセシビリティ基準を達成する必要があった。

### 決定
~~Tailwind CSSから Atlassian Design Systemへ段階的に移行する。~~

### 廃止理由 (2026-03-05)
Phase 2-A で Atlassian Design System を全面的に shadcn/ui + Radix UI に置換。
理由: TailwindCSS との親和性、バンドルサイズ、カスタマイズ性で shadcn/ui が優位。
Atlassian コンポーネント (Button, Card, Input, Modal, tokens) は全て削除済み。

---

## ADR-003: AWS Lambdaによるサーバーレスアーキテクチャ

**日付**: 2025-03-15  
**ステータス**: 承認済み  
**決定者**: インフラチーム

### コンテキスト
スケーラブルでコスト効率の良いバックエンドインフラが必要。

### 決定
AWS Lambda + API Gateway + DynamoDBのサーバーレス構成を採用。

### 理由
- **コスト**: 使用した分のみの課金（無料枠活用）
- **スケーラビリティ**: 自動スケーリング
- **運用負荷**: サーバー管理不要
- **可用性**: 99.99% SLA

### トレードオフ
- ⚠️ コールドスタート遅延（対策：メモリ256MB、定期的なウォームアップ）
- ⚠️ ベンダーロックイン（許容：AWSエコシステムの利点）
- ⚠️ ローカル開発の複雑性（対策：Serverless Offline）

### 結果
- ✅ 月額コスト$25以下で運用
- ✅ 自動スケーリングで負荷対応
- ✅ インフラ管理工数ゼロ

---

## ADR-004: DynamoDBによるNoSQLデータストレージ

**日付**: 2025-03-20  
**ステータス**: 承認済み  
**決定者**: データアーキテクトチーム

### コンテキスト
柔軟でスケーラブルなデータストレージソリューションが必要。

### 決定
Amazon DynamoDBを主要データストアとして採用。

### 理由
- **スケーラビリティ**: オートスケーリング対応
- **パフォーマンス**: ミリ秒レベルのレイテンシ
- **コスト**: オンデマンド料金で初期コスト最小
- **TTL機能**: キャッシュの自動削除

### 使用パターン
```
Tables:
├── Cache Table (TTL有効)
├── Session Table
├── Portfolio Table
└── Blacklist Table
```

### 結果
- ✅ 高速なデータアクセス
- ✅ 自動バックアップ
- ⚠️ 複雑なクエリには不向き（対策：適切なインデックス設計）

---

## ADR-005: マルチソース市場データ戦略

**日付**: 2025-04-10  
**ステータス**: 承認済み  
**決定者**: データチーム

### コンテキスト
信頼性が高くコスト効率の良い市場データ取得方法が必要。

### 決定
優先順位付きマルチソース戦略を採用。

### データソース優先順位
1. **Yahoo Finance2 (npm)**: 無料、APIキー不要
2. **JPX CSV**: 日本取引所公式、20分遅延
3. **Alpha Vantage**: 有料API、高信頼性
4. **Web Scraping**: 最終手段

### フォールバック戦略
```javascript
try {
  // 1. Yahoo Finance2
  return await yahooFinance2.quote(symbol);
} catch {
  // 2. JPX CSV
  return await jpxCsvService.getData(symbol);
} catch {
  // 3. Alpha Vantage (if API key available)
  return await alphaVantage.quote(symbol);
} catch {
  // 4. Web Scraping
  return await scraper.scrape(symbol);
} catch {
  // 5. Cached/Fallback data
  return fallbackStore.getData(symbol);
}
```

### 結果
- ✅ 99.9%の可用性達成
- ✅ API コスト最小化
- ✅ データ品質維持

---

## ADR-006: Google OAuth認証の採用

**日付**: 2025-03-25  
**ステータス**: 承認済み  
**決定者**: セキュリティチーム

### コンテキスト
安全で使いやすい認証方式が必要。

### 決定
Google OAuth 2.0を唯一の認証方式として採用。

### 理由
- **ユーザビリティ**: パスワード管理不要
- **セキュリティ**: Googleの認証基盤を活用
- **統合**: Google Drive APIとのシームレスな連携
- **信頼性**: 業界標準のOAuth 2.0

### 実装詳細
- **フロー**: Authorization Code Flow
- **スコープ**: email, profile, drive.file
- **セッション**: DynamoDBベースのセッション管理

### 結果
- ✅ ユーザー登録フリクション削減
- ✅ セキュリティ向上
- ⚠️ Google依存（リスク受容）

---

## ADR-007: i18n国際化対応

**日付**: 2025-05-01  
**ステータス**: 承認済み  
**決定者**: プロダクトチーム

### コンテキスト
日本市場をメインターゲットとしつつ、グローバル展開も視野に入れる。

### 決定
i18nextによる国際化対応を実装。

### サポート言語
- 日本語（デフォルト）
- 英語

### 実装方針
```javascript
// ファイル構造
src/i18n/
├── index.js
├── locales/
│   ├── ja.json
│   └── en.json
```

### 結果
- ✅ 日本市場での採用促進
- ✅ グローバル展開の準備完了
- ✅ 言語切り替えがスムーズ

---

## ADR-008: Cloudflare Pagesでのフロントエンドホスティング

**日付**: 2025-07-01  
**ステータス**: 承認済み  
**決定者**: インフラチーム

### コンテキスト
高速で信頼性の高いフロントエンドホスティングが必要。

### 決定
Cloudflare Pagesを採用（Netlifyから移行）。

### 理由
- **パフォーマンス**: グローバルCDN
- **コスト**: 無料プランで十分
- **デプロイ**: Wrangler CLIでの簡単デプロイ
- **カスタムドメイン**: portfolio-wise.com対応

### 移行結果
- ✅ ページロード速度40%改善
- ✅ デプロイ時間短縮
- ✅ SSL証明書自動管理

---

## ADR-009: Context APIによる状態管理

**日付**: 2025-04-05
**ステータス**: ❌ 廃止済み（ADR-013 で Zustand に置換）
**決定者**: フロントエンドチーム

### コンテキスト
グローバル状態管理ソリューションが必要。

### 決定
~~React Context APIを採用（Redux不採用）。~~

### 廃止理由 (2026-03-05)
Phase 0-C で Context API を全面的に Zustand 5.x + TanStack Query 5.x に移行。
理由: Context API のリレンダリング問題、テスタビリティ、store 分離の容易さで Zustand が優位。
AuthContext / PortfolioContext / ContextConnector は全て削除済み。

---

## ADR-010: TypeScript段階的導入

**日付**: 2025-08-01
**ステータス**: ✅ 完了 (Phase 0-B, 2026-03)
**決定者**: 技術リードチーム

### コンテキスト
コードの型安全性と保守性向上が必要。

### 決定
TypeScriptを段階的に導入する。

### 完了状況
- tsconfig.json: `strict: false, allowJs: true`（インクリメンタル移行）
- 新規ファイルは全て `.ts` / `.tsx` で作成
- stores, services, pages は TypeScript 化済み
- Vitest (vi.mock) + React Testing Library でテスト移行完了

---

## ADR-011: YAMLベースのデータインポート/エクスポート

**日付**: 2025-07-15  
**ステータス**: 承認済み  
**決定者**: プロダクトチーム

### コンテキスト
AIツールとの連携でユーザーフレンドリーなデータ形式が必要。

### 決定
YAMLフォーマットをサポート（JSON/CSVに加えて）。

### 理由
- **AI親和性**: ChatGPT/Claude等が生成しやすい
- **可読性**: 人間が読み書きしやすい
- **柔軟性**: 複雑なデータ構造に対応

### 実装
```yaml
portfolio:
  name: "投資ポートフォリオ"
  currency: "JPY"
  holdings:
    - symbol: "1570"
      name: "NEXT FUNDS 日経平均レバレッジ上場投信"
      quantity: 100
      type: "jp-stock"
```

### 結果
- ✅ ユーザビリティ向上
- ✅ AI統合スムーズ
- ⚠️ パースエラー処理の複雑化

---

## ADR-012: AWSコスト最適化戦略

**日付**: 2025-06-01  
**ステータス**: 実装済み  
**決定者**: 財務・技術チーム

### コンテキスト
AWS無料枠を最大限活用してコストを最小化する必要。

### 決定
以下のコスト最適化戦略を実施：

### 最適化施策
1. **Lambda**: メモリ256MB、リトライ回数削減
2. **DynamoDB**: バッチ操作、TTL活用
3. **CloudWatch**: ログレベルWARN（本番）
4. **Secrets Manager**: キャッシュ24時間
5. **API Gateway**: キャッシング有効化

### 結果
- ✅ 月額コスト$25以下達成
- ✅ 無料枠内で運用
- ✅ パフォーマンス維持

---

## ADR-013: Zustand + TanStack Queryによる状態管理

**日付**: 2026-03-05
**ステータス**: ✅ 完了 (Phase 0-C)
**決定者**: フロントエンドチーム
**前提**: ADR-009 (Context API) を廃止

### 決定
Zustand 5.x でクライアント状態、TanStack Query 5.x でサーバーステートを管理する。

### Store構成
```
authStore: 認証・JWT・Google OAuth
portfolioStore: ポートフォリオCRUD・Google Drive同期
uiStore: テーマ・通知
subscriptionStore: サブスクリプション・プラン管理
```

### 理由
- **リレンダリング制御**: セレクタパターンで不要な再描画を防止
- **テスタビリティ**: vi.mock() で簡潔にモック可能
- **Store分離**: 責務ごとに独立したストア
- **cross-store通信**: `getState()` パターンで疎結合

---

## ADR-014: shadcn/ui + Radix UIによるUIコンポーネント

**日付**: 2026-03-05
**ステータス**: ✅ 完了 (Phase 2-A)
**決定者**: UXチーム・開発チーム
**前提**: ADR-002 (Atlassian Design System) を廃止

### 決定
shadcn/ui + Radix UI をUIコンポーネント基盤とし、TailwindCSS でスタイリングする。

### コンポーネント
Button, Card, Input, Badge, Dialog, Progress, Switch, Tabs（8コンポーネント）

### 理由
- **TailwindCSS親和性**: className ベースのカスタマイズ
- **バンドルサイズ**: コピー&ペーストモデルで最小限
- **アクセシビリティ**: Radix UI のプリミティブで WCAG 準拠
- **テーマ対応**: CSS Variables で Light/Dark/System 3モード

### 結果
- ✅ バンドルサイズ +7% (988KB → 1,057KB)
- ✅ Light/Dark テーマ完全対応
- ✅ CVA によるバリアント管理

---

## ADR-015: Vite + Vitest によるビルド・テスト基盤

**日付**: 2026-03-04
**ステータス**: ✅ 完了 (Phase 0-B)
**決定者**: フロントエンドチーム

### 決定
CRA (react-scripts) → Vite、Jest → Vitest に移行する。

### 理由
- **ビルド速度**: esbuild ベースの高速ビルド
- **HMR**: 即座のホットリロード
- **テスト速度**: Vitest の並列実行
- **ESM対応**: ネイティブ ESM サポート
- **設定のシンプル化**: `--openssl-legacy-provider` 不要

### 結果
- ✅ 開発サーバー起動時間 大幅短縮
- ✅ テスト: 62 suites / 1,387 tests passed
- ✅ TypeScript との統合がスムーズ

---

## 更新履歴

| 日付 | バージョン | 更新内容 |
|------|------------|----------|
| 2026-03-05 | 2.0.0 | ADR-002/009/010 更新 + ADR-013/014/015 追加 |
| 2025-09-04 | 1.0.0 | 初版作成・全ADR記録 |

---
*本ドキュメントは技術的意思決定の記録です。新規決定時は新しいADRを追加してください。*