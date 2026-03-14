# PortfolioWise 統合改善計画書

**作成日**: 2026-03-08 → **最終更新**: 2026-03-13 (10-A 完了・S評価96点・VMオフラインテスト済・WCAG完全準拠)
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
| 9-A | 取得単価入力 UI（HoldingCard 拡張）+ レビュー100点対応 | 2026-03-10 |
| 9-B | マネックス証券 CSV パーサー追加（detectBrokerFormat・parseMonexCSV・UI統合） | 2026-03-10 |
| 9-BX | 通貨換算バグ A〜F 全修正 + テスト品質強化 + `/test-quality-review` スキル作成 | 2026-03-11 |
| 9-BY | ペルソナ適合+ドーパミン戦略+競合対策（Landing改善・PCグリッド・blur・配当予測・ストリーク・セレブレーション） | 2026-03-12 |
| 9-BY-S | S評価対応（ストリーク寛容化+Freeze・7日トライアル・WeeklyRebalanceCard・深掘り競合分析11社・43juni訴求） | 2026-03-12 |
| 9-BY-100 | UX100点対応（Landing トライアル訴求・Pricing 差別化拡充・43juni FAQ・トライアル残日数バッジ） | 2026-03-12 |
| 9-C | PDFエクスポート（Standard機能、lazy import、日本語フォント対応、blur preview） | 2026-03-12 |
| 10-A | 配当カレンダー詳細ビュー（月別詳細+利回りランキング+WAI-ARIA Tabs+50テスト・S評価96点・VMオフラインテスト済） | 2026-03-13 |

---

## 現在の成功指標

| 指標 | 開始時 | 現在 | 目標 | 状態 |
|------|--------|------|------|------|
| ブラウザネイティブダイアログ | 7+ | 0 | 0 | ✅ |
| 絵文字使用箇所 | 38 | 0 | 0 | ✅ |
| EN/JP混在箇所 | 50+ | 0 | 0 | ✅ |
| ハードコード色値 | 35+ | 4 | ≤4 | ✅ |
| テスト品質 | 脆弱 | 堅牢 | 堅牢 | ✅ |
| ユニットテスト | 2254 PASS | 2434+ PASS / 15 skip | 全PASS | ✅ |
| テストカバレッジ（statements） | 77.85% | 81.97% | ≥80% | ✅ |
| テストカバレッジ（branches） | — | 73.19% | ≥70% | ✅ |
| テストカバレッジ（functions） | — | 80.41% | ≥75% | ✅ |
| テストカバレッジ（lines） | — | 82.95% | ≥80% | ✅ |
| TypeScript エラー数 | — | 0 | 0 | ✅ |
| any 残存数（本番コード） | 304 | 195 | ≤100 | ⚠️ |
| 通貨換算バグ既知数 | — | 0（A〜F 全修正済み） | 0 | ✅ |
| テスト品質スキル | なし | `/test-quality-review` 作成済み | — | ✅ |
| E2E spec ファイル数 | 2 | 19 | 25 | ✅ |
| E2E テストケース数 | 17 | 89 | 130+ | ✅ |
| TanStack Query フック数 | 0 | 26 | — | ✅ |
| ドーパミンソース数 | 3 | 11（受動5+能動3+習慣3） | 10+ | ✅ |
| PCグリッドレイアウト | なし | 2カラム | — | ✅ |
| 競合分析 | なし | 11社完了（投資8社+異業種3社） | — | ✅ |
| ストリーク追跡 | なし | engagementStore（寛容化+Freeze） | — | ✅ |
| 配当予測カード | なし | DividendForecast（3タブ・月別詳細・利回りランキング・WAI-ARIA） | — | ✅ |
| トライアル訴求 | なし | Landing Hero+Pricing+Dashboard バッジ | — | ✅ |
| 43juni移行導線 | なし | Hero訴求+FAQ+配当予測 | — | ✅ |
| Landing Pricing差別化 | 5項目 | Free 7項目 / Standard 7項目（均等化） | — | ✅ |
| 実装品質レビュー評価 | — | S評価（96/100点 — 10-A最終） | S評価 | ✅ |
| WAI-ARIA Tabs | 未対応 | ←→キー・Home/End・roving tabindex・disabled対応 | — | ✅ |

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

完了済み:
  9-A: 取得単価入力 UI（HoldingCard 拡張）  ✅ 完了 (2026-03-10)
      └ レビュー100点対応: 精度丸め・FREE_FEATURE_LIMITS・トースト・Enterキー・JPY step最適化

完了済み:
  9-B: マネックス証券 CSV パーサー追加      ✅ 完了 (2026-03-10)

完了済み（バグ修正・品質強化）:
  9-BX: 通貨換算バグ A〜F 全修正 + テスト品質強化  ✅ 完了 (2026-03-11)
      └ Bug E（portfolioScore.ts）・Bug F（alertEvaluation）を新規発見・修正
      └ /test-quality-review スキル作成
      └ 再発防止ルール策定（「通貨換算バグ再発防止ルール」参照）

完了済み（UX改善・ドーパミン戦略）:
  9-BY: ペルソナ適合 + ドーパミン + 競合対策  ✅ 完了 (2026-03-12)
      └ Landing: Solution→Pain順序入れ替え・FAQ最適化・スタッツバー改善
      └ Dashboard: PCグリッドレイアウト（2カラム）・配当予測カード・ストリークバッジ
      └ ScoreCard: ロック指標blur表示（Curiosity Gap）・スコア変動追跡
      └ GoalCard: 目標達成セレブレーション・マイルストーン通知
      └ 新規: engagementStore（ストリーク・スコア履歴・イベント管理）
      └ 新規: ScoreChangeIndicator（ランクアップ通知）
      └ 新規: DividendForecast（配当予測 — 43juni競合対策）

  9-BY-S: S評価対応  ✅ 完了 (2026-03-12)
      └ ストリーク寛容化: 1日空き許容（全ユーザー）+ Freeze月3回（Standard特典）
      └ 7日間トライアル: 初回10銘柄→期限後5銘柄（価値先行 — Slack/Notionモデル）
      └ WeeklyRebalanceCard: 能動的アクション動機（乖離チェック→シミュレーション誘導）
      └ Landing 43juni訴求: Hero下に移行訴求テキスト追加
      └ 深掘り競合分析: 投資ツール8社+異業種3社（Duolingo/Strava/Spotify）
      └ 反面教師マトリクス: 各競合の良い点→取入れ / 悪い点→回避を体系化

  9-BY-100: UX100点対応  ✅ 完了 (2026-03-12)
      └ Landing: Hero にトライアル訴求バッジ追加（「初回7日間は10銘柄まで無料体験」）
      └ Landing: Pricing Free 欄に初回7日間注記追加 + Free 7項目に拡充（高さ均等化）
      └ Landing: Pricing Standard 欄に「配当予測・リバランス乖離チェック」「ストリーク Freeze」追加
      └ Landing: FAQ に「43juniをお使いだった方へ — 移行方法は？」追加
      └ Dashboard: トライアル残日数バッジ追加（非Premium+トライアル中のみ表示）
      └ レビュー指摘修正: WeeklyRebalanceCard に data-testid="drift-item" 追加
      └ レビュー指摘修正: DividendForecast テストの年間配当アサーション強化（Badge要素限定）

  実装品質レビュー: S評価 91/100点  ✅ 完了 (2026-03-12)
      └ テスト実装品質: 18/20（90+テスト、精確値アサーション、エッジケース網羅）
      └ 処理の正確性: 19/20（通貨換算ルール準拠、タイマーcleanup、persist設計）
      └ マネタイズ設計整合性: 18/20（Curiosity Gap blur、トライアル→Free→Standard導線）
      └ ペルソナ適合実装: 18/20（43juni移行、ドーパミン11ソース、日本語統一）
      └ UX品質: 18/20（PCグリッド、アクセシビリティ role/aria-live、モバイル対応）
      └ クリティカルイシュー: 0件

次フェーズ:
  9-C: PDF エクスポート（Standard 機能）    ✅ 完了 (2026-03-12)
      └ jsPDF + jspdf-autotable（lazy import でメインバンドル影響ゼロ）
      └ NotoSansJP フォント動的ロード（public/fonts/ からセルフホスト）
      └ 全ラベル日本語化（損益サマリー・保有資産一覧・ポートフォリオスコア）
      └ 通貨換算ルール準拠（baseCurrency + exchangeRate 必須引数）
      └ Free: blur プレビュー + UpgradePrompt（P3 Curiosity Gap）
      └ Standard: PDF ダウンロード + エラーリトライ
      └ テスト: 19件（pdfExport） + 15件（ExportOptions）全通過
  ↓
  10-A: 配当カレンダー（月別詳細ビュー）    ✅ 完了 (2026-03-13)
      └ 既存 DividendForecast を shadcn/ui Tabs で拡張（新ファイル不要）
      └ タブ1「サマリー」: 既存バーチャート+トップ銘柄（変更なし）
      └ タブ2「月別詳細」: MonthlyDetail テーブル（ARIA table ロール付き）
      └ タブ3「利回りランキング」: 利回り%降順、全配当銘柄、Badge表示
      └ WAI-ARIA Tabs: ←→キー循環・Home/End・roving tabindex・disabled対応
      └ アクセシビリティ: aria-label（ticker/月）・role="table/row/cell"
      └ font-mono tabular-nums 全金額・利回りに適用
      └ テスト: 40件（エッジケース・キーボード・a11y含む）全通過
      └ 実装品質レビュー: S評価 96/100点（3回レビュー＋独立エージェント3名レビュー）
      └ VMオフラインテスト: 全アセットHTTP 200・SW precache・PWA対応確認
      └ WCAG完全準拠: text-[11px]・USD小数2桁・min-h-[44px]タッチターゲット
  ↓
  10-B: セクター分析（円グラフ）            [43juni後継ユーザー獲得]  [← 次回実行]
  10-C: ユーザー獲得戦略（SEO + SNS）       [MAU 500達成の前提]
  ↓
  9-D: E2E テスト拡充（89 → 130+）         [各フェーズ完了後に追加]

9-C 実装チェックリスト（全完了）:
  ✅ PDF生成ライブラリ選定: jsPDF + jspdf-autotable
  ✅ pdfExport.ts に baseCurrency + exchangeRate パラメータを必須設計
  ✅ PDF内金額表示の通貨換算テスト（USD/JPY混在）を先に書く（TDD）
  ✅ 日本語フォント対応（NotoSansJP TTF セルフホスト）
  ✅ 全ラベル日本語化（ペルソナ原則準拠）
  ✅ Day Change 行除去（priceHistories 不要化）
  ✅ Free ユーザー向け blur プレビュー（P3 転換トリガー）
  ✅ エラーリトライボタン追加
  ✅ 未使用 import 削除
  ✅ レビュー S 評価対応（全5件+任意）
```

---

## Phase 9: 機能 UI 完成 + 品質強化（2026-04〜05 予定）

> **前提**: Phase 8-C（Zustand persist 統一）完了後に 9-A/9-C 着手。9-B は 8-C 前でも可。
> Phase 8-E で機能基盤（型・計算ロジック・ストア・UIコンポーネント骨格）は完成済み。
> Phase 9 は「接続・入力 UI 完成」と「Standard 差別化強化」が中心。

### 9-A: 取得単価入力 UI — HoldingCard 拡張 ✅ **完了・100点** (2026-03-10)

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

**受け入れ基準（全て達成）:**
- [x] HoldingCard に「取得単価」入力フィールドが表示される（Standard のみ編集可）
- [x] Free ユーザーは入力欄がロック表示 + アップグレード誘導
- [x] 入力後に PnLSummary の含み益/損が即座に更新される（Zustand リアクティブ）
- [x] 0・負値入力時はバリデーションエラー表示
- [x] テスト: 正常系・境界値・小数点丸め・Enter/Escapeキー・トースト通知（25件）
- [x] テスト全件通過・TypeScript 0 errors・ビルド成功（commit c7ee867f）

**レビュー改善（100点対応）:**
- [x] `parseFloat(value.toFixed(2))` で精度丸め統一（`updateHoldings` と一致）
- [x] `FREE_FEATURE_LIMITS` に `purchasePrice: false` 登録 → `useCanUseFeature` 一元管理
- [x] `addNotification` トースト通知（保存成功）
- [x] Enterキー保存・Escapeキーキャンセル
- [x] JPY銘柄は `step="1"`、USD は `step="0.01"` に通貨別最適化

### 9-B: マネックス証券 CSV パーサー追加 ✅ **完了** (2026-03-10)

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

### 9-BX: 通貨換算バグ全修正 + テスト品質強化 ✅ **完了** (2026-03-11)

**経緯**: 2271件のテストが全パスしていたにもかかわらず、通貨切り替え時に金額が変わらない
重大バグが発見された。根本原因分析により 6件の独立バグを特定・全修正した。

**修正バグ一覧:**

| バグ | ファイル | 問題 |
|-----|---------|------|
| A | `portfolioStore.ts` `initializeData` | `currency` のみ変更の場合 `validateAssetTypes` 結果が未適用 |
| B | `portfolioDataEnricher.ts` `totalValue` | `assetConvertedValues[]` なし → GoalProgressSection 値が誤り |
| C | `PnLTrendChart.tsx` | 価格履歴なし資産の通貨換算なし |
| D | `Simulation.tsx` | `additionalBudget` を baseCurrency に換算せず `totalAssets` に加算 |
| **E** | `portfolioScore.ts` `calculatePortfolioScore` | 全6スコア指標の重み計算に通貨換算なし（新規発見） |
| **F** | `useAlertEvaluation.ts` + `notificationStore.ts` | リバランスドリフト算出に通貨換算なし（新規発見） |

**テスト改善:**
- 弱いアサーション（`toBeGreaterThan(0)`）を精確な値検証（`toBe(2025000)`, `toBeCloseTo(2666.67, 1)`）に修正
- USD/JPY混在・`currency: undefined` シナリオのテスト追加
- Bug A〜E のリグレッションテスト追加
- テスト総数: 2254 → 2434（+180件）

**再発防止体制:**
- `/test-quality-review` スキル作成（`~/.claude/commands/test-quality-review.md`）
- 下記「通貨換算バグ再発防止ルール」を開発標準として策定

**コミット**: 3c494245 — テスト全通過・ビルド成功・本番デプロイ済み

---

### 通貨換算バグ再発防止ルール（開発標準 — 全フェーズ共通）

> このルールは 9-BX の事後分析から策定した。以降の全フェーズで遵守すること。

#### ルール 1: `price * holdings` を含む全関数に通貨換算チェックを実施する

新規実装・修正時に `price * holdings`（または `price || 0) * (holdings || 0`）を含む
コードを書いた場合、**直後に通貨換算ロジックがあるか** 確認する。

```typescript
// ❌ 禁止: 換算なし
const total = assets.reduce((sum, a) => sum + a.price * a.holdings, 0);

// ✅ 必須: 換算あり
const total = assets.reduce((sum, a) => {
  let val = (a.price || 0) * (a.holdings || 0);
  const c = a.currency || 'USD';
  if (c !== baseCurrency) {
    if (c === 'USD' && baseCurrency === 'JPY') val *= exchangeRate;
    else if (c === 'JPY' && baseCurrency === 'USD') val /= exchangeRate;
  }
  return sum + val;
}, 0);
```

#### ルール 2: 金融値テストは精確な値でアサートする

```typescript
// ❌ 禁止
expect(result.totalValue).toBeGreaterThan(0);

// ✅ 必須（コメントに計算根拠を書く）
// AAPL: $100*10=$1000, 7203: ¥15000*10÷150=$1000 → total $2000
expect(result.totalValue).toBeCloseTo(2000, 1);
```

#### ルール 3: 通貨換算を含む全関数に混在テストを必須とする

新規・修正した計算関数には以下の3シナリオをテストする:
1. `baseCurrency='JPY'` + USD資産 → 円換算
2. `baseCurrency='USD'` + JPY資産 → ドル換算
3. `currency: undefined` → デフォルト動作（クラッシュしない）

#### ルール 4: 新フェーズ開始前に `/test-quality-review` を実行する

各フェーズの実装完了後、`/test-quality-review` を実行してギャップが
ないことを確認してからコミットする。

---

### 9-C: PDF エクスポート（Standard 専用機能）（2026-05）

**ターゲット**: Standard プラン ¥700/月 の追加価値 → タケシが投資記録を PDF で保存・共有
**Standard**: CSV + PDF | **Free**: CSV のみ

**現状**: `useSubscription.ts` に PDF エクスポートの機能フラグ定義あり。実装は未着手。

**変更ファイル:**
- `src/utils/pdfExport.ts`（NEW）: PDF 生成ロジック
  ```typescript
  // ⚠️ 9-BX 教訓: baseCurrency + exchangeRate を必須引数に設計すること
  export async function generatePortfolioPDF(
    assets: CurrentAsset[],
    pnl: PortfolioPnL,
    score: PortfolioScore,
    baseCurrency: string,   // ← 必須
    exchangeRate: number    // ← 必須（金額の通貨換算に使用）
  ): Promise<Blob>
  ```
  - `@react-pdf/renderer` または `jsPDF` を使用（バンドルサイズ要検討）
  - PDF 内容: 保有資産一覧・含み益/損サマリー・ポートフォリオスコア・生成日時
  - **⚠️ 通貨換算ルール**: PDF内の全金額は `baseCurrency` に換算して表示
- `src/components/data/ExportOptions.tsx`: PDF ダウンロードボタン追加（Standard のみ）
- `package.json`: PDF ライブラリ依存追加

**受け入れ基準:**
- [ ] Standard ユーザーが「PDF でエクスポート」ボタンをクリックするとダウンロードが始まる
- [ ] Free ユーザーはボタンに UpgradePrompt が重なる
- [ ] PDF に保有資産・損益・スコアが正確に記載される
- [ ] **通貨換算テスト（9-BX 教訓）**: USD資産 + JPY資産混在で PDF生成 → 各金額が `baseCurrency` に正しく換算されている
- [ ] `baseCurrency='JPY'` 時: USD資産の金額が `×exchangeRate` で円換算されている
- [ ] `baseCurrency='USD'` 時: JPY資産の金額が `÷exchangeRate` でドル換算されている
- [ ] バンドルサイズ増加: +100KB 以内（lazy import で分割）
- [ ] テスト: PDF 生成の smoke test（エラーなし確認）
- [ ] `/test-quality-review` 実行済み（弱いアサーション・換算漏れなし）
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
| 3 | 取得単価入力ロック | ✅ 実装済み | HoldingCard（`useCanUseFeature('purchasePrice')`）|
| 4 | PDF エクスポートロック | ✅ 実装済み | `UpgradePrompt`（ExportOptions）|
| 5 | アラートルール制限（Free: 設定不可）| ✅ 実装済み | `UpgradePrompt`（AlertRulesManager）|
| 6 | 目標管理（Free: 1目標, Standard: 5目標）| ✅ 実装済み | `UpgradePrompt`（GoalDialog）|
| 7 | 詳細スコア 8指標（Free: 3指標）| ✅ 実装済み | `UpgradePrompt`（PortfolioScoreCard）|

**タケシが Standard を選ぶ主な理由（価値の言語化）:**
> 「¥700/月で5銘柄制限がなくなり、SBI・楽天のCSVをそのまま取り込め、
> 含み益/損がリアルタイムで確認でき、リバランスの乖離アラートも受け取れる。
> 投資額に対して十分に安い。」

### ポジティブ転換トリガー（ネガティブ制限到達以外のアップグレード動機）✅ 9-BY追加

| # | トリガー | 種類 | 心理効果 | 実装状況 |
|---|---------|------|---------|---------|
| P1 | ロック指標のblur値チラ見せ | Curiosity Gap | 「見たい」 | ✅ 9-BY |
| P2 | スコア変動通知「Standardユーザーの平均は87点」 | Social Proof | 「自分も」 | ⚠️ Phase 10 |
| P3 | PDFエクスポートのプレビュー表示（DL時にUpgrade） | Preview | 「もう少しで手に入る」 | ✅ 9-C |
| P4 | 目標達成セレブレーション + 「次の目標はStandardで」 | Achievement | ゲーム的進行 | ✅ 9-BY (部分) |

---

## 競合分析（2026-03-12 実施 → 2026-03-12 深掘り更新）

### 市場環境

**43juni（しさんじゅーに）が2023年11月にサービス終了** — 日本の個人投資家向けPF管理で最も人気だったツール。
元43juniユーザーの受け皿として PortfolioWise は最適なポジションにある。

### 競合比較（投資管理ツール 8社 + 異業種エンゲージメント 3社）

#### A. 投資管理ツール直接競合

| 機能 | 43juni(終了) | マネフォ | ロボフォリオ | Empower | Moneytree | Sharesight | Simply Wall St | Yahoo Finance | **PFWise** |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 無料プラン | 完全無料 | ¥500制限 | 完全無料 | 完全無料 | 無料制限 | 1PFまで | 制限 | 完全無料 | Free+¥700 |
| CSV取込 | 手動 | API連携 | API連携 | API連携 | API連携 | CSV+API | なし | なし | **3大証券CSV** |
| 日米株対応 | ○ | ○ | △ | 米国のみ | △ | ○（税対応） | ○ | ○ | **○** |
| セクター分析 | **円グラフ** | × | × | ○ | × | × | **スノーフレーク** | × | ⚠️→10-B |
| 配当管理 | **月別** | × | **○** | × | × | **税込/税後** | 予測 | × | ✅予測→10-A |
| PFスコア | × | × | × | × | × | × | **独自評価** | × | **8指標** |
| AI分析 | × | × | AI提案 | × | × | × | × | × | **プロンプト** |
| ゲーミフィケーション | × | × | × | × | × | × | × | × | **✅ストリーク+スコア** |
| 能動的アクション | × | × | × | × | × | × | × | × | **✅リバランスチェック** |
| サービス継続性 | **終了** | 安定 | リスク | 安定 | 安定 | 安定 | 安定 | 安定 | 収益モデルあり |

#### B. 異業種エンゲージメント分析（反面教師）

| アプリ | 良い点（取り入れ） | 悪い点（回避） | PFWise への反映 |
|--------|-------------------|---------------|----------------|
| **Duolingo** | ストリーク Freeze（有料）/ プッシュ通知の心理術 / 「5分だけ」の低ハードルタスク | 過度な通知でうんざり / 罰的リセットで離脱 | ✅ Freeze=Standard特典 / ✅ 2日猶予で寛容化 / ✅ WeeklyRebalanceCard（能動タスク） |
| **Strava** | 週次サマリー / 友人比較 / アクティビティ記録が能動的 | 無料制限が緩すぎて課金動機薄い | ✅ 週次リバランスチェック / ⚠️ Peer Comparison→Phase 10 / ✅ 7日トライアル後に壁 |
| **Spotify Wrapped** | 年次振り返りの共有欲 / データの「自分ごと化」 | 年1回限りで日次習慣にならない | ⚠️ 年次投資サマリー→Phase 11 / ✅ 日次PnL+週次リバランス |

### 競合の良い点 → 取り入れ状況

| 競合機能 | 出典 | 取り入れ状況 |
|---------|------|------------|
| 月別配当カレンダー | 43juni | ✅ DividendForecast (9-BY + 10-A 完了: 3タブ・月別詳細・利回りランキング) |
| 年間配当予測 | 43juni | ✅ DividendForecast (9-BY) |
| セクター分析円グラフ | 43juni | ⚠️ Phase 10-B で実装予定 |
| スノーフレーク銘柄評価 | Simply Wall St | △ PFスコア内で部分対応。独立画面は将来検討 |
| 税込/税後配当切替 | Sharesight | ⚠️ 将来Phase で対応予定（10-A は月別詳細+ランキングに集中） |
| Fee Analyzer | Empower | △ スコア内に簡易版。独立画面は将来検討 |
| ストリーク Freeze（有料） | Duolingo | ✅ Standard特典（月3回）— 9-BY-S で実装 |
| 能動的タスク（「5分だけ」） | Duolingo | ✅ WeeklyRebalanceCard — 9-BY-S で実装 |
| 週次サマリー | Strava | ⚠️ Phase 11 でメール配信予定 |
| 初回トライアル（価値先行） | Slack/Notion/Strava | ✅ 7日間10銘柄トライアル — 9-BY-S で実装 |
| 適時開示通知 | ロボフォリオ | △ 低優先（API連携が必要） |

### 競合の悪い点 → 回避状況（全て回避済み ✅）

- マネーフォワード: 重い/情報過多 → PortfolioWise は軽量SPA
- ロボフォリオ: API連携セキュリティ懸念 → CSV方式（認証情報不要）
- 43juni/ロボフォリオ: サービス終了リスク → Stripe収益モデルあり
- 証券会社アプリ: 自社口座のみ → ブローカー横断
- Empower: 日本語非対応 → 日本語ファースト
- Duolingo: 過度な罰的リセット → 2日猶予 + Standard Freeze
- Strava: 無料が緩すぎて課金動機なし → 7日トライアル後に5銘柄壁
- Moneytree: データ可視化のみでアクション不在 → WeeklyRebalanceCard
- Yahoo Finance: 分析ツールなし → PFスコア + AI分析

---

## ドーパミンデリバリー戦略（9-BY 策定）

### ドーパミンソース一覧

| # | 機能 | 種類 | トリガー | 頻度 | 実装状況 |
|---|------|------|---------|------|---------|
| 1 | PFスコア(100点) + 変動通知 | 達成系 | 数値向上 | 更新時 | ✅ 9-BY |
| 2 | PnL損益 + 前日比 | 確認系 | 利益確認 | 日次 | ✅ 実装済み |
| 3 | 目標進捗 + セレブレーション | 達成系 | バー充填 | 目標変動時 | ✅ 9-BY |
| 4 | ランクアップ通知 | 達成系 | S/A/B昇格 | スコア変動時 | ✅ 9-BY |
| 5 | ストリーク（寛容リセット） | 習慣系 | 連続アクセス | 日次 | ✅ 9-BY-S強化 |
| 6 | 配当予測 | 期待系 | 将来収入 | 更新時 | ✅ 9-BY |
| 7 | リファラル報酬 | 報酬系 | 紹介成約 | 不定期 | ✅ 実装済み |
| 8 | ロック指標チラ見せ(blur) | 好奇心系 | Curiosity Gap | 常時 | ✅ 9-BY |
| **9** | **週次リバランスチェック** | **🆕能動系** | **乖離確認→シミュレーション** | **週次** | **✅ 9-BY-S** |
| **10** | **ストリーク Freeze（Standard）** | **🆕報酬系** | **課金特典の実感** | **月3回** | **✅ 9-BY-S** |
| **11** | **7日トライアル期限** | **🆕緊急系** | **残り日数カウントダウン** | **トライアル中** | **✅ 9-BY-S** |

### 訪問動機（受動＋能動の二軸設計）

**受動的確認（見るだけで満足）:**
1. **PnL前日比** — 「昨日と比べてどうなった？」
2. **配当予測** — 「次の配当はいつ？いくら？」
3. **スコア変動** — 「リバランス後にスコアは上がった？」

**能動的アクション（操作を伴う）:** ← Duolingo/Strava の反面教師
4. **リバランスチェック** — 「乖離3%超の銘柄がある → シミュレーションで調整」
5. **ストリーク維持** — 「2日空いたけど Freeze 使う？」（Standard のみ）

**習慣形成トリガー:**
6. **ストリークバッジ** — 「連続記録を途切れさせたくない」（2日猶予で離脱防止）
7. **トライアル残日数** — 「あと3日で10銘柄→5銘柄に戻る」（初週のみ）

### 将来追加予定

- **デイリーインサイト** (Phase 11) — バックエンド日次バッチ生成（能動アクション候補）
- **週次サマリーメール** (Phase 11) — メール配信基盤が前提（Strava モデル）
- **年次投資サマリー** (Phase 11) — Spotify Wrapped 的な共有可能レポート
- **Peer Comparison ミニカード** (Phase 10) — 集計データが前提

---

## Phase 10: 競合対策 + ユーザー獲得（2026-06〜07 予定）

### 10-A: 配当カレンダー詳細ビュー ✅ 完了 (2026-03-13)

**ターゲット**: 43juniの元ユーザーが最も愛用した配当カレンダー機能を完全再現
**現状**: DividendForecast（9-BY）で年間予測+月別バーチャートは実装済み → **10-Aで3タブ拡張完了**
**詳細計画**: `docs/planning/phase-10a-plan.md`
**工数実績**: 1日（計画1〜2日 → 1日で完了）
**品質**: S評価（93/100点）

**アプローチ**: 既存 DividendForecast.tsx を shadcn/ui Tabs で拡張（新ファイル不要）

**実装内容:**
- タブ1「サマリー」: 既存の月別バーチャート+トップ銘柄（変更なし）
- タブ2「月別詳細」: `MonthlyDetail` テーブル（月→銘柄→金額→頻度、月合計行、ARIA table ロール付き）
- タブ3「利回りランキング」: 配当利回り%降順で全配当銘柄を表示（Badge + 年間金額）
- Tabs コンポーネント: WAI-ARIA準拠（←→キー循環・Home/End・roving tabindex・disabled対応）
- アクセシビリティ: aria-label（abbreviated ticker・月番号）、role="table/row/cell"

**追加した型:**
```typescript
interface MonthlyDetail {
  month: number;
  label: string;
  assets: { ticker: string; name: string; amount: number; frequency: string; }[];
  total: number;
}
```

**受け入れ基準:**
- [x] タブ切り替えで「サマリー」「月別詳細」「ランキング」が表示される ✅
- [x] 月別詳細: 各月に配当がある銘柄名・金額・頻度が表示される ✅
- [x] 月別詳細: 各月の合計金額が正確（`convertToBaseCurrency` 経由、通貨換算済み） ✅
- [x] 利回りランキング: 利回り%降順で全配当銘柄が表示される ✅
- [x] 通貨換算: baseCurrency=JPY/USD 両方で正確な金額表示 ✅
- [x] 配当なし資産のみの場合: コンポーネント非表示（既存動作維持） ✅
- [x] モバイル: テーブルが横スクロールせず、カード形式で表示 ✅
- [x] テスト: 40件（月別詳細・ランキング・タブ切替・エッジケース・キーボード・a11y・USD/JPY混在） ✅
- [x] フィンテック信頼感デザイン: font-mono tabular-nums で全金額・利回り表示 ✅
- [x] ビルド成功 + 全テスト通過 ✅
- [x] 実装品質レビュー: S評価（96/100点、3回レビュー＋独立エージェント3名レビュー） ✅
- [x] WAI-ARIA Tabs: ←→キー・Home/End・roving tabindex 実装 ✅ (bonus)
- [x] ARIA table ロール: role="table/row/cell" + aria-label 月別詳細 ✅ (bonus)

### 10-B: セクター分析

**ターゲット**: 43juniのセクター円グラフ機能を取り入れ
**現状**: Asset型に `region?: string` のみ。セクター未対応。
**工数見積もり**: 2〜3日
**優先度**: 高（ポートフォリオ分散度の可視化、Standard 価値向上）
**依存関係**: なし（10-A と独立して実装可能）

**実装計画:**
- `portfolio.types.ts`: `sector?: string` フィールド追加
- `fundUtils.ts`: `TICKER_SPECIFIC_SECTORS` ルックアップテーブル（主要100銘柄）
- `portfolioScore.ts`: セクター分散度メトリクス追加（Herfindahl指数）
- UI: セクター別円グラフ（Recharts PieChart）
- ダッシュボードにセクター分析カードを追加

**受け入れ基準:**
- [ ] Asset型に `sector` フィールドが追加され、既存データとの後方互換性あり
- [ ] 主要100銘柄のセクター自動判定が動作する
- [ ] ダッシュボードにセクター別円グラフが表示される
- [ ] セクター分散度スコアがポートフォリオスコアに統合される
- [ ] 通貨換算: 各セクターの評価額が baseCurrency に換算されて表示される
- [ ] セクター未設定の銘柄は「その他」として分類される
- [ ] テスト: セクター判定・スコア計算・円グラフ表示のテスト追加
- [ ] ビルド成功 + 全テスト通過

### 10-C: ユーザー獲得戦略

**問題**: MAU 500 達成のためのチャネルが未定義
**工数見積もり**: 1週間（技術実装+コンテンツ作成）
**優先度**: 中（10-A/10-B の機能充実後に実施が効果的）
**依存関係**: 10-A, 10-B 完了後が望ましい（訴求機能が増える）

**施策:**
1. **SEO**: 「ポートフォリオ管理 無料」「43juni 代わり」「投資管理 アプリ 日本語」でのランディング
2. **SNS**: 投資系X(Twitter)アカウントへの露出、投信ブロガーへの紹介
3. **Reddit**: r/japanfinance, r/JapanLife での紹介
4. **Landing SEO強化**: メタデータ、OGP、構造化データ追加
5. **43juni移行ガイド**: 「43juniをお使いだった方へ」専用ページ

**受け入れ基準:**
- [ ] Landing ページに適切な SEO メタデータ（title, description, OGP, 構造化データ）が設定される
- [ ] 「43juniをお使いだった方へ」セクションまたは専用ページが存在する
- [ ] Google Search Console でインデックス登録が確認できる
- [ ] OGP プレビューが X(Twitter) / LINE で正しく表示される
- [ ] Lighthouse SEO スコア 90+ を達成する

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
- [x] 全テスト合格: 120ファイル / 2434 PASS / 0 failures
- [x] ビルド成功 + デプロイ: https://portfolio-wise.com/ (commit 6e07650f)

### Phase 8 完了基準（2026-03-10 確認済み）
- [x] テストカバレッジ: statements 81.97% / branches 73.19% / functions 80.41% / lines 82.95% ✅
- [x] TanStack Query: 26フック + 全7ストアのコンポーネント統合完了 ✅
- [x] Zustand persist: 全ストア統一（8-C 完了、commit 15476ee4）✅
- [x] TypeScript: strict: true + 0 errors ✅
- [x] 機能基盤（PnL・CSV・アラート・Goals）: 実装済み（Phase 8-E）✅

### Phase 9 受け入れ基準（目標: 2026-05 完了）
- [x] 取得単価入力 UI: HoldingCard に purchasePrice フィールド、Standard/Free 分岐・100点品質 ✅
- [x] マネックス証券 CSV: `parseMonexCSV()` 実装 + テスト ✅ (commit f83303ec)
- [x] 通貨換算バグ A〜F 全修正・テスト品質強化 ✅ (commit 3c494245)
- [x] ペルソナ適合+ドーパミン+競合対策 ✅ (9-BY)
- [x] S評価対応（ストリーク寛容化+Freeze・トライアル・WeeklyRebalance・競合分析11社） ✅ (9-BY-S)
- [x] UX100点対応（トライアル訴求・Pricing差別化・43juni FAQ・残日数バッジ） ✅ (9-BY-100)
- [x] 実装品質レビュー S評価（91/100点）達成 ✅ (review-implementation)
- [x] PDF エクスポート: Standard のみ、メインバンドル影響ゼロ（lazy import）、日本語フォント対応
- [ ] E2E テストケース: 89 → 130+ 件
- [ ] any 残存数: 195 → ≤ 100 箇所（strict 強化継続）
- [ ] **新規**: 全新機能実装前に `/test-quality-review` 実行済み
- [ ] **新規**: 通貨換算を含む全新規関数に USD/JPY混在テスト追加済み
