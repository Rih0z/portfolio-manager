# PortfolioWise 統合改善計画書

**作成日**: 2026-03-08 → **最終更新**: 2026-03-10 (計画全面改訂: 実装済み機能調査・Phase 9 再設計)
**ペルソナ**: テック系長期投資家 タケシ（28-42歳, IT企業勤務, 日米分散投資）
**目標**: ペルソナに完全適合するプロダクト品質 + 収益化基盤

---

## 完了済みフェーズ

| Phase | 内容 | 完了日 |
|-------|------|--------|
| R1 | ブラウザAPI撲滅（alert/confirm → ConfirmDialog/Toast, navigate置換） | 2026-03-08 |
| R3 | デザイントークン統一（ハードコード色 35→4、Google brand色のみ残存） | 2026-03-08 |
| R4 | ダッシュボード再設計（空状態改善、レイアウト最適化） | 2026-03-08 |
| R5 | ナビゲーション再構成（5タブ→4タブ、日本語統一） | 2026-03-08 |
| R6 | Landing Page再設計（Lucide Icons、ペルソナ訴求、料金セクション） | 2026-03-08 |
| R7 | テスト品質向上（E2E 19テスト、ビジュアルリグレッション、品質監査修正） | 2026-03-09 |
| R2-F | デザイン浄化（絵文字→Lucide Icons、日本語統一、ハードコード色除去） | 2026-03-09 |
| P2 | ペルソナUX最適化（Setup 1画面化、AIAdvisor 3ステップ化、Share簡素化） | 2026-03-09 |
| 8-A | テストカバレッジ閾値引き上げ（80/70/75/80 達成済み） | 2026-03-09 |
| 8-A2 | フォントセルフホスト化（Google Fonts CDN依存排除、fontsource導入） | 2026-03-10 |
| 8-A3 | OAuthエラーUI追加（スクリプト障害時のユーザー通知・リトライ） | 2026-03-10 |
| 8-B | TanStack Query 26フック実装 + 全7ストアのコンポーネント統合完了 | 2026-03-10 |
| 8-D | TypeScript strict: true 完全対応（0 errors, usePortfolioContext 完全型付け） | 2026-03-10 |
| 8-D-fix | Phase 8-D レビュー修正（残存 portfolio/updatePortfolio 参照 + ExchangeRate 型修正） | 2026-03-10 |
| 8-C | Zustand persist 統一（手動 localStorage 18箇所全廃・カスタムアダプターで旧フォーマット自動マイグレーション） | 2026-03-10 |
| 8-E | 機能基盤構築（損益管理・SBI/楽天CSV・アラート・目標管理）※計画外実装の正式記録 | 〜2026-03-10 |

---

## 現在の成功指標

| 指標 | 開始時 | 現在 | 目標 | 状態 |
|------|--------|------|------|------|
| ブラウザネイティブダイアログ | 7+ | 0 | 0 | ✅ |
| 絵文字使用箇所 | 38 | 0 | 0 | ✅ |
| EN/JP混在箇所 | 50+ | 0 | 0 | ✅ |
| ハードコード色値 | 35+ | 4 | ≤4 | ✅ |
| テスト品質 | 脆弱 | 堅牢 | 堅牢 | ✅ |
| ユニットテスト | 2254 PASS | 2248 PASS / 15 skip | 全PASS | ✅ |
| テストカバレッジ（statements） | 77.85% | 81.45% | ≥80% | ✅ |
| テストカバレッジ（branches） | — | 72.47% | ≥70% | ✅ |
| テストカバレッジ（functions） | — | 79.68% | ≥75% | ✅ |
| テストカバレッジ（lines） | — | 82.71% | ≥80% | ✅ |
| TypeScript エラー数 | — | 0 | 0 | ✅ |
| any 残存数（本番コード） | 304 | 195 | ≤100 | ⚠️ |
| E2E spec ファイル数 | 2 | 19 | 25 | ✅ |
| E2E テストケース数 | 17 | 89 | 130+ | ✅ |
| TanStack Query フック数 | 0 | 26 | — | ✅ |

---

## Phase R2-F: デザイン浄化 完了（絵文字除去 + 日本語統一）

**目的**: プロフェッショナルな外観への最終転換。タケシが「ギミック」と感じる要素をゼロに。

### R2-F-1: 絵文字 → Lucide Icons 完全置換（4ファイル, 16箇所）

| ファイル | 絵文字 | 置換先 |
|---------|--------|--------|
| `settings/MarketSelectionWizard.tsx` | 🇺🇸 | テキスト「US」+`<Globe />` |
| | 🇯🇵 | テキスト「JP」+`<Globe />` |
| | 🌐 | `<Globe2 />` |
| | 🏠 | `<Building2 />` |
| | 💎 | `<Gem />` |
| | 📊 | `<BarChart3 />` |
| | 🥇🥈🥉 | `<Trophy />`+順位テキスト |
| `ai/ScreenshotAnalyzer.tsx` | 🔒 | `<Lock />` |
| `ai/PromptOrchestrator.tsx` | 🔍💬⭐ | `<Search />` `<MessageSquare />` `<Star />` |
| `ai/ExternalAILinks.tsx` | 🎯🔍💬 | `<Target />` `<Search />` `<MessageSquare />` |

### R2-F-2: isJapanese三項演算子 → 日本語固定（6ファイル, 32箇所）

| ファイル | 箇所 | 方針 |
|---------|------|------|
| `settings/PortfolioYamlConverter.tsx` | 11 | `isJapanese ? 'X' : 'Y'` → `'X'` に簡素化 |
| `settings/MarketSelectionWizard.tsx` | 8 | `name`を日本語固定、`nameEn`参照削除 |
| `ai/AnalysisPerspectiveTabs.tsx` | 4 | `labelJa` → `label` に統一 |
| `ai/StrengthsWeaknessCard.tsx` | 4 | 日本語固定 |
| `ai/CopyToClipboard.tsx` | 3 | 「コピー」「コピー済み」固定 |
| `ai/ExternalAILinks.tsx` | 2 | `descJa` → `desc` に統一 |

### R2-F-3: 残存ハードコード色の修正（1ファイル）

| ファイル | 内容 |
|---------|------|
| `dashboard/PnLTrendChart.tsx` | フォールバックHEX 7箇所 → CSS変数のみに |

### R2-F-4: 細部修正

- `ui/dialog.tsx`: `aria-label="Close"` → `aria-label="閉じる"`

---

## Phase P2: ペルソナUX最適化（タケシが楽しく使い続けたい体験）

**目的**: 面倒な入力を排除し、すぐに価値を体験できるフローへ。

### P2-A: InitialSetupWizard 簡素化

**現状**: 3ステップ必須モーダル（通貨→予算→市場選択）= 約45秒
**問題**:
- 通貨はJPY自動検出可能（`navigator.language`→'ja'→JPY）
- 市場選択は68%が「米国+日本」
- モーダルが全画面を覆い、アプリを体験する前に設定を強制

**修正**:
1. 3ステップ → 1画面統合（通貨+予算を同一行、市場はデフォルト選択済み）
2. 通貨をブラウザロケールから自動検出
3. 「米国+日本」をデフォルト選択状態に（変更は可能）
4. 「スキップしてダッシュボードへ」リンク追加
5. 絵文字をLucide Iconsに置換（R2-F-1と連動）

**目標**: 45秒 → 10秒（またはスキップで即座）

### P2-B: AIAdvisor ウィザード簡素化

**現状**: 6ステップウィザード（基本情報→市場→経験→価値観→スクショ→プロンプト）
**問題**: 6回「次へ」を押さないとプロンプトが得られない

**修正**:
1. 6ステップ → 3ステップに統合:
   - Step 1: プロフィール（年齢+職業+家族+投資経験+リスク許容度）
   - Step 2: 投資方針（市場+予算+価値観+懸念事項）
   - Step 3: AI分析（プロンプト生成+外部AIリンク）
2. スクリーンショット分析は Step 3 内のアコーディオン（オプション）
3. 「クイック分析」ボタン — デフォルト値で即座にプロンプト生成
4. ステップ3の外部AIリンクからプロンプトコピー+サービス遷移を1クリックに

**目標**: 6クリック → 3クリック（クイック分析なら1クリック）

### P2-C: NPS調査 非ブロッキング化

**現状**: フルスクリーンモーダルでフォーカスを奪う
**修正**: 画面右下のフローティングカードに変更。`×`で即閉じ可能。作業を中断させない。

### P2-D: ShareDialog 簡素化

**現状**: displayName(必須) + ageGroup(必須)
**修正**: ageGroupをオプション化（デフォルト非公開、「年代を公開する」トグル）

---

## Phase 8: 技術基盤強化（長期）

### 8-A: テストカバレッジ閾値引き上げ
- vitest.config.ts: statements 75→80, branches 65→70, functions 70→75, lines 75→80
- 不足分のテスト追加

### 8-B: TanStack Query カスタムフック導入 ✅ **完全完了** (2026-03-10)
- **26フック** 実装（`hooks/queries/` に9ファイル）✅
- **全7ストアのコンポーネント統合完了** ✅:
  - portfolioStore → `useExchangeRate` / `useStockPrices` / `useServerPortfolio` / `usePriceHistory`
  - subscriptionStore → `useSubscriptionStatus` / `useIsPremium` / `useCanUseFeature` / `useCreateCheckout` / `useCreatePortal`
  - socialStore → `useUserShares` / `useCreateShare` / `useDeleteShare` / `usePeerComparison`
  - referralStore → `useReferralCode` / `useReferralStats` / `useApplyReferral`
  - notificationStore → `useNotifications` / `useAlertRules` / `useCreateAlertRule` / `useUpdateAlertRule` / `useDeleteAlertRule` / `useMarkNotificationRead` / `useMarkAllNotificationsRead` / `useDeleteNotification`
  - goalStore / authStore: 直接 Zustand（TanStack Query 不要）✅

### 8-E: 機能基盤構築 ✅ **実装済み**（計画外実装を正式記録）

Phase R〜8-D と並行して実装された機能基盤。Phase 9 の UI 改善の前提。

**損益管理基盤:**
- `utils/plCalculation.ts`: `calculatePortfolioPnL()` — 通貨混在対応の含み益/損計算 ✅
- `types/portfolio.types.ts`: `purchasePrice?: number` フィールド ✅
- `components/dashboard/PnLSummary.tsx`: 全銘柄損益サマリーカード ✅
- `components/dashboard/PnLTrendChart.tsx`: 損益推移グラフ（1W/1M/3M/6M/1Y/YTD）✅

**日本証券会社 CSV インポート:**
- `utils/csvParsers.ts`: SBI証券・楽天証券対応パーサー + ブローカー自動判別 ✅
- `components/data/ImportOptions.tsx`: CSV インポート UI（ブローカー選択付き）✅
- ※マネックス証券は **未対応**（Phase 9-B で追加予定）

**アラート・通知機能:**
- `stores/notificationStore.ts`: アラートルール CRUD + `evaluateAlerts()`（price_above/below, rebalance_drift, goal_achieved）✅
- `components/notifications/AlertRulesManager.tsx`: アラートルール管理 UI ✅
- `components/notifications/PriceAlertDialog.tsx`: 価格アラート設定ダイアログ ✅
- `hooks/useAlertEvaluation.ts`: 市場データ更新時の自動評価フック ✅

**目標管理:**
- `stores/goalStore.ts`: CRUD + Free(1目標)/Standard(5目標) 制限 ✅
- `components/goals/GoalCard.tsx` / `GoalDialog.tsx` / `GoalProgressSection.tsx` ✅

**残課題（Phase 9 で解消）:**
- `purchasePrice` の入力 UI が HoldingCard に未実装（型・計算ロジックは存在）
- マネックス証券 CSV パーサーが未実装
- PDF エクスポート（Standard 機能）が未実装

---

### 8-C: Zustand persist 統一 ✅ **完了** (2026-03-10)
- **実装**: persist middleware 導入、内部 saveToLocalStorage() 18箇所全廃
- **カスタムアダプター**: 旧 Base64/JSON フォーマットからの無停止マイグレーション
- **スタブ維持**: 公開 API の saveToLocalStorage/loadFromLocalStorage はスタブとして後方互換維持
- **テスト**: 2234件全通過・TypeScript 0 errors・ビルド成功

### 8-D: TypeScript 型安全性強化 ✅ **完了** (2026-03-10)
- portfolio.types.ts 共有型定義・stores/services 完全型付け ✅
- tsconfig.json `strict: true` 有効化・TypeScript エラー 0件 ✅
- `usePortfolioContext` に完全型付き `PortfolioContextValue` インターフェース追加 ✅
- 隠れていた型エラー（AIAdvisor/DataImport/HoldingCard）を発見・修正 ✅
- テスト 2236件全通過・ビルド成功（commit 834449cb） ✅

---

## 実行順序と依存関係

```
完了済み（Phase R: UI品質・ペルソナ UX）:
  R1 → R3 → R4 → R5 → R6 → R7 → R2-F → P2  ✅

完了済み（Phase 8: 技術基盤強化 + 機能基盤）:
  8-A（カバレッジ 81.45%）→ 8-A2（フォントセルフホスト）→ 8-A3（OAuthエラーUI）
  → 8-B（TanStack Query 26フック + 全7ストア統合）
  → 8-D（TypeScript strict: true + 0 errors）→ 8-D-fix
  8-E（損益管理・SBI/楽天CSV・アラート・Goals 実装）  ✅

次フェーズ:
  8-C: Zustand persist 統一  ✅ 完了
  ↓ （8-C 完了が必須前提: purchasePrice を persist に含めるため）
  9-A: 取得単価入力 UI（HoldingCard 拡張）[2026-04]  ← 次回実行
  9-B: マネックス証券 CSV パーサー追加      [2026-04, 8-C と並行可]
  ↓
  9-C: PDF エクスポート（Standard 機能）    [2026-05]
  ↓
  9-D: E2E テスト拡充（101 → 130+）        [各フェーズ完了後に追加]

⚠️ 8-C 完了前に 9-A（purchasePrice UI）を実装すると
   localStorage / persist 混在期にデータロスが発生する。
   9-B（Monex CSV）は localStorage 変更なしのため 8-C 前でも可。
```

---

## Phase 9: 機能 UI 完成 + 品質強化（2026-04〜05 予定）

> **前提**: Phase 8-C（Zustand persist 統一）完了後に 9-A/9-C 着手。9-B は 8-C 前でも可。
> Phase 8-E で機能基盤（型・計算ロジック・ストア・UIコンポーネント骨格）は完成済み。
> Phase 9 は「接続・入力 UI 完成」と「Standard 差別化強化」が中心。

### 9-A: 取得単価入力 UI — HoldingCard 拡張 ✅ **完了** (2026-03-10)

**ターゲット**: ペイン③「投資判断の不安」→ 含み益/損が見えるようにする
**Standard 機能**: 取得単価入力可 + 損益表示 | **Free**: ロック + UpgradePrompt

**現状**: `purchasePrice?: number` 型・`calculatePortfolioPnL()` は実装済み。HoldingCard に入力 UI のみ未実装。

**変更ファイル:**
- `src/components/settings/HoldingCard.tsx`: 取得単価入力フィールド追加
  ```tsx
  // 追加するシグネチャ
  onUpdatePurchasePrice: (id: string, price: number) => void
  ```
- `src/stores/portfolioStore.ts`: `updatePurchasePrice(id: string, price: number)` アクション追加
- `src/hooks/usePortfolioContext.ts`: `updatePurchasePrice` を `PortfolioContextValue` に追加

**受け入れ基準:**
- [ ] HoldingCard に「取得単価（円/株）」入力フィールドが表示される（Standard のみ編集可）
- [ ] Free ユーザーは入力欄がロック表示 + UpgradePrompt コンポーネント
- [ ] 入力後に PnLSummary の含み益/損が即座に更新される（Zustand リアクティブ）
- [ ] 0・負値入力時はバリデーションエラー表示
- [ ] テスト: `updatePurchasePrice` の正常系（10, 1000, 99999）・境界値（0, -1, NaN）
- [ ] テスト全件通過・ビルド成功（tsc --noEmit 0 errors 維持）

### 9-B: マネックス証券 CSV パーサー追加（2026-04、8-C 前でも可）

**ターゲット**: ペイン①「複数口座の統合管理」→ 3大証券会社を完全カバー
**フリープレミアム共通機能**（SBI・楽天と同等のスコープ）

**現状**: `csvParsers.ts` に SBI・楽天は実装済み。マネックスのみ未対応。

**変更ファイル:**
- `src/utils/csvParsers.ts`: `parseMonexCSV(content: string): CSVParseResult` 追加（約80行）
  - マネックス固有ヘッダー検出: `'銘柄コード'` + `'評価損益'` の組み合わせ
  - 自動判別ロジック（`detectBroker()`）にマネックスのケースを追加
  - `purchasePrice` を「平均取得単価」列から読み込む

**受け入れ基準:**
- [ ] `parseMonexCSV()` がマネックス証券の標準 CSV フォーマットを正しくパースする
- [ ] `detectBroker()` がマネックス CSV を自動識別する
- [ ] 取得単価（purchasePrice）が CSV から正しく読み込まれる
- [ ] テスト: 正常系（複数銘柄）・空ファイル・文字化け・列不足・マネックス固有列なし
- [ ] テスト全件通過・ビルド成功

### 9-C: PDF エクスポート（Standard 専用機能）（2026-05）

**ターゲット**: Standard プラン ¥700/月 の追加価値 → タケシが投資記録を PDF で保存・共有
**Standard**: CSV + PDF | **Free**: CSV のみ

**現状**: `useSubscription.ts` に PDF エクスポートの機能フラグ定義あり。実装は未着手。

**変更ファイル:**
- `src/utils/pdfExport.ts`（NEW）: PDF 生成ロジック
  ```typescript
  export async function generatePortfolioPDF(
    assets: CurrentAsset[],
    pnl: PortfolioPnL,
    score: PortfolioScore,
    baseCurrency: string
  ): Promise<Blob>
  ```
  - `@react-pdf/renderer` または `jsPDF` を使用（バンドルサイズ要検討）
  - PDF 内容: 保有資産一覧・含み益/損サマリー・ポートフォリオスコア・生成日時
- `src/components/data/ExportOptions.tsx`: PDF ダウンロードボタン追加（Standard のみ）
- `package.json`: PDF ライブラリ依存追加

**受け入れ基準:**
- [ ] Standard ユーザーが「PDF でエクスポート」ボタンをクリックするとダウンロードが始まる
- [ ] Free ユーザーはボタンに UpgradePrompt が重なる
- [ ] PDF に保有資産・損益・スコアが正確に記載される
- [ ] バンドルサイズ増加: +100KB 以内（lazy import で分割）
- [ ] テスト: PDF 生成の smoke test（エラーなし確認）
- [ ] テスト全件通過・ビルド成功

### 9-D: E2E テスト拡充（89 → 130+ テストケース）（各フェーズ完了後に追加）

**目的**: 新機能フローの回帰テスト + 重要フローの網羅率向上

**追加対象フロー（各フェーズ実装後に対応）:**
1. 取得単価入力 → PnLSummary の損益更新確認（9-A 後）
2. マネックス CSV インポート → 保有数・取得単価の反映確認（9-B 後）
3. PDF エクスポート → ファイルダウンロード確認（9-C 後）
4. アラートルール設定 → 価格変化 → 通知発火フロー（既存実装のテスト追加）
5. Free 制限到達（5銘柄・1目標）→ UpgradePrompt → `/pricing` への遷移確認

**受け入れ基準:**
- [ ] E2E テストケース数 ≥ 130（現在 89）
- [ ] 追加テストが既存テストの実行時間を 20% 以内の増加で収まる

---

## ビジネス KPI（収益化目標）

| KPI | 現在（2026-03） | 3ヶ月目標（2026-06） | 6ヶ月目標（2026-09） |
|-----|----------------|---------------------|---------------------|
| MAU（月間アクティブユーザー） | 測定中 | 500 | 2,000 |
| Free→Standard 転換率（CVR） | 測定中 | 3% | 5% |
| Standard 月間課金ユーザー | 測定中 | 15 | 100 |
| 月次収益（MRR） | 測定中 | ¥10,500 | ¥70,000 |
| ユーザー継続率（D30） | 測定中 | 40% | 60% |

### Free→Standard 転換トリガー（UI 実装済み・計画対象）

| # | トリガー | 実装状況 | 配置コンポーネント |
|---|---------|---------|-----------------|
| 1 | 5銘柄制限到達 | ✅ 実装済み | `UpgradePrompt`（Holdings設定画面）|
| 2 | シミュレーション月3回使用 | ✅ 実装済み | `UpgradePrompt`（シミュレーション画面）|
| 3 | 取得単価入力ロック | ⚠️ 9-A で実装 | `UpgradePrompt`（HoldingCard）|
| 4 | PDF エクスポートロック | ⚠️ 9-C で実装 | `UpgradePrompt`（ExportOptions）|
| 5 | アラートルール制限（Free: 設定不可）| ✅ 実装済み | `UpgradePrompt`（AlertRulesManager）|
| 6 | 目標管理（Free: 1目標, Standard: 5目標）| ✅ 実装済み | `UpgradePrompt`（GoalDialog）|
| 7 | 詳細スコア 8指標（Free: 3指標）| ✅ 実装済み | `UpgradePrompt`（PortfolioScoreCard）|

**タケシが Standard を選ぶ主な理由（価値の言語化）:**
> 「¥700/月で5銘柄制限がなくなり、SBI・楽天のCSVをそのまま取り込め、
> 含み益/損がリアルタイムで確認でき、リバランスの乖離アラートも受け取れる。
> 投資額に対して十分に安い。」

---

## デザイン原則（タケシ向け）

### DO
- **数値を大きく、正確に** — タケシはデータが見たい
- **モノスペースフォントで金額表示** — 桁が揃う安心感
- **控えめなカラー** — Blue/Grey基調、緑赤は損益のみ
- **フラットデザイン** — 過度なシャドウ・グラデーション不要
- **情報密度** — 1画面に多くの情報を簡潔に
- **即座のフィードバック** — 操作→結果が0.3秒以内
- **スキップ可能** — 全ての設定にデフォルト値、強制入力を最小化

### DON'T
- **絵文字をUIに使わない** — プロフェッショナルなアイコンのみ
- **英語をUIに混ぜない** — 日本語市場特化
- **alert()/confirm()を使わない** — in-app コンポーネントのみ
- **過度な装飾** — タケシはギミックを嫌う
- **強制的なウィザード** — 使いたい機能にすぐアクセスできること
- **ローディングの放置** — スケルトンUIで常に構造を見せる

---

## 完了基準

### R2-F + P2 完了基準（2026-03-09 レビュー済み ✅）
- [x] 絵文字使用箇所: 0（LanguageSwitcher国旗は許容） → コード検証済み
- [x] isJapanese三項演算子: UI上0（残存はfundUtils.ts市場判定 + PromptOrchestrationService.tsプロンプト生成のみ = ビジネスロジック）
- [x] ハードコード色値: 4（OAuthLoginButton.tsx Google brand色のみ） → コード検証済み
- [x] InitialSetupWizard: 1画面 + detectCurrency自動検出 + スキップ可能 → シンボル構造検証済み
- [x] AIAdvisor: 3ステップ（profile/investment/analysis）+ クイック分析ボタン → コード検証済み
- [x] NPS: フローティングカード（非ブロッキング） → 対応不要確認済み
- [x] ShareDialog: ageGroupオプション
- [x] 全テスト合格: 111ファイル / 2251 PASS / 0 failures
- [x] ビルド成功 + デプロイ: https://portfolio-wise.com/ (commit 6e07650f)

### Phase 8 完了基準（2026-03-10 確認済み）
- [x] テストカバレッジ: statements 81.45% / branches 72.47% / functions 79.68% / lines 82.71% ✅
- [x] TanStack Query: 26フック + 全7ストアのコンポーネント統合完了 ✅
- [x] Zustand persist: 全ストア統一（8-C 完了、commit 15476ee4）✅
- [x] TypeScript: strict: true + 0 errors ✅
- [x] 機能基盤（PnL・CSV・アラート・Goals）: 実装済み（Phase 8-E）✅

### Phase 9 受け入れ基準（目標: 2026-05 完了）
- [x] 取得単価入力 UI: HoldingCard に purchasePrice フィールド、Standard/Free 分岐 ✅
- [ ] マネックス証券 CSV: `parseMonexCSV()` 実装 + テスト
- [ ] PDF エクスポート: Standard のみ、バンドル +100KB 以内
- [ ] E2E テストケース: 89 → 130+ 件
- [ ] any 残存数: 195 → ≤ 100 箇所（strict 強化継続）
