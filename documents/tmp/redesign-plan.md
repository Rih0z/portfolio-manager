# PortfolioWise 統合改善計画書

**作成日**: 2026-03-08 → **最終更新**: 2026-03-10 (Phase 8-D レビュー修正完了・計画更新)
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
| 8-B | TanStack Query 13 Query + 7 Mutation 実装 + コンポーネント統合（4ストア） | 2026-03-10 |
| 8-D | TypeScript strict: true 完全対応（0 errors, usePortfolioContext 完全型付け） | 2026-03-10 |
| 8-D-fix | Phase 8-D レビュー修正（残存 portfolio/updatePortfolio 参照 + ExchangeRate 型修正） | 2026-03-10 |

---

## 現在の成功指標

| 指標 | 開始時 | 現在 | 目標 | 状態 |
|------|--------|------|------|------|
| ブラウザネイティブダイアログ | 7+ | 0 | 0 | ✅ |
| 絵文字使用箇所 | 38 | 0 | 0 | ✅ |
| EN/JP混在箇所 | 50+ | 0 | 0 | ✅ |
| ハードコード色値 | 35+ | 4 | ≤4 | ✅ |
| テスト品質 | 脆弱 | 堅牢 | 堅牢 | ✅ |
| ユニットテスト | 2254 PASS | 2236 PASS / 15 skip | 全PASS | ✅ |
| テストカバレッジ（statements） | 77.85% | 81.45% | ≥80% | ✅ |
| テストカバレッジ（branches） | — | 72.47% | ≥70% | ✅ |
| テストカバレッジ（functions） | — | 79.68% | ≥75% | ✅ |
| テストカバレッジ（lines） | — | 82.71% | ≥80% | ✅ |
| TypeScript エラー数 | — | 0 | 0 | ✅ |
| any 残存数（本番コード） | 304 | 195 | ≤100 | ⚠️ |
| E2Eテスト | 17 | 19 | 25+ | ⚠️ |

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

### 8-B: TanStack Query カスタムフック導入 ✅ **完了** (2026-03-10)
- 13 Query + 7 Mutation 完備 ✅
- コンポーネント統合 4ストア（portfolio/ui/auth/subscription）完了 ✅
- **残タスク（8-C後に対応）**: 追加ストアのコンポーネント統合
  - socialStore → useUserShares / usePeerComparison
  - referralStore → useReferralCode / useReferralStats
  - notificationStore → useNotifications / useAlertRules

### 8-C: Zustand persist 統一（⚠️ 未着手 — 次回実行）
- **目的**: 手動 localStorage 操作を Zustand persist middleware に統一
- **対象ストア**: portfolioStore（`saveToLocalStorage` / `loadFromLocalStorage`）
- **実装方針**:
  - `persist` middleware + カスタム暗号化ストレージアダプタ
  - 既存の暗号化ロジック（`CryptoUtils`）を adapter に組み込む
  - マイグレーション関数で既存データを無停止で移行
- **受け入れ基準**:
  - `saveToLocalStorage` / `loadFromLocalStorage` 呼び出し箇所がゼロ
  - テスト全件通過、ビルド成功
  - ローカルストレージのデータが自動マイグレーションされる

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

完了済み（Phase 8: 技術基盤強化）:
  8-A（カバレッジ 81.45% 達成）
  → 8-A2（フォントセルフホスト）
  → 8-A3（OAuthエラーUI）
  → 8-B（TanStack Query 20本 + コンポーネント統合）
  → 8-D（TypeScript strict: true + 0 errors）
  → 8-D-fix（レビュー修正・型エラー全解消）  ✅

次フェーズ:
  8-C: Zustand persist 統一  ← 次回実行（技術負債）[必須: 9-A の前提]
  ↓
  Phase 9: 機能拡張（収益化強化・タケシのペイン直接解消）[8-C 完了後に着手]
    9-A: 損益管理（コスト基準価格・含み益/損トラッキング）[2026-04 着手予定]
    9-B: 日本証券会社 CSV インポート（SBI・楽天・マネックス）[2026-05 着手予定]
    9-C: アラート機能（価格アラート・リバランス乖離通知）[2026-06 着手予定]
    9-D: E2E テスト拡充（19 → 30本 目標）[各フェーズ完了時に追加]

⚠️ 注意: 8-C（persist統一）完了前に 9-A（costBasis フィールド追加）を実施すると
localStorage / persist の混在期が発生しデータ移行が複雑化する。
```

---

## Phase 9: 機能拡張 — Standard 収益化強化（2026-04〜06 予定）

> **前提**: Phase 8-C（Zustand persist 統一）完了後に着手すること。

**目的**: タケシの3大ペインを機能で直接解消し、Standard プラン ¥700/月 の価値を高める。

### 9-A: 損益管理（コスト基準価格・含み益/損トラッキング）

**ターゲット**: ペイン③「投資判断の不安」を解消
**Standard 機能**: コスト基準入力 + 損益グラフ履歴 + 税金計算
**Free**: 現在価格表示のみ（コスト基準入力不可）

**実装内容:**
1. `CurrentAsset` に `costBasis: number | null`（取得単価）フィールド追加
2. PnL 計算ユーティリティ `utils/plCalculation.ts` 実装
   - `(現在価格 - 取得単価) × 保有数` → 含み益/損（JPY/USD）
   - 為替適用後の JPY 換算損益
3. ダッシュボードに含み益/損カラム追加（Standard のみ）
4. `UpgradePrompt` をコスト基準入力フォームに配置

**受け入れ基準:**
- [ ] 取得単価入力 UI が Holdings 設定画面に追加
- [ ] 含み益/損が全銘柄合計・個別表示される（Standard）
- [ ] Free ユーザーはロック表示 + UpgradePrompt
- [ ] テスト: PnL 計算ロジックの正常系・異常系・境界値
- [ ] テスト全件通過・ビルド成功

### 9-B: 日本証券会社 CSV インポート改善

**ターゲット**: ペイン①「複数口座の統合管理」
**Standard 機能**: SBI・楽天・マネックス専用パーサー
**Free**: 汎用 CSV のみ

**実装内容:**
1. `services/csvParsers/` に証券会社別パーサー追加
   - `sbiParser.ts`: SBI 証券の保有株式一覧 CSV
   - `rakutenParser.ts`: 楽天証券の保有資産一覧 CSV
   - `monexParser.ts`: マネックス証券の口座サマリー CSV
2. ファイル選択時に証券会社自動判別（ヘッダー文字列で識別）
3. 取得単価もインポートデータから自動入力（9-A との連携）
4. インポート結果プレビュー → 確認 → 実行 の 3 ステップ

**受け入れ基準:**
- [ ] SBI / 楽天 / マネックス CSV が正しくパースされる
- [ ] 証券会社の自動判別率 ≥ 95%（主要フォーマット）
- [ ] Free ユーザーは汎用 CSV のみ（専用パーサーはロック）
- [ ] テスト: 各パーサーの正常系・異常系・空ファイル・文字化け
- [ ] テスト全件通過・ビルド成功

### 9-C: アラート機能（価格アラート・リバランス乖離通知）

**ターゲット**: ペイン②③「リバランス計算」「投資判断の不安」
**Standard 機能のみ**

**実装内容:**
1. `stores/alertStore.ts` 新規作成（Zustand + persist）
2. アラートルール設定 UI（価格 ±X% / 配分乖離 ±Y%）
3. `useAlertRules` TanStack Query フック（9-A の8-B残タスクと連携）
4. ブラウザ通知 API または in-app Toast 通知

**受け入れ基準:**
- [ ] 価格アラート（上限/下限）を設定・解除できる
- [ ] 配分乖離アラートが目標配分±5%超で発火
- [ ] Free ユーザーは設定画面自体に UpgradePrompt
- [ ] テスト全件通過・ビルド成功

### 9-D: E2E テスト拡充

**目的**: 重要ユーザーフローの回帰を自動検証
**目標**: 19 → 30 本

**追加対象フロー:**
1. 初回セットアップ → 銘柄追加 → ダッシュボード表示
2. CSV インポート → 保有数反映確認
3. リバランスシミュレーション → 一括購入実行
4. Free 制限到達 → UpgradePrompt → Stripe チェックアウト
5. ログアウト → ログイン → データ復元確認

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

### Phase 8 完了基準（2026-03-10 時点）
- [x] テストカバレッジ: statements 81.45% / branches 72.47% / functions 79.68% / lines 82.71% ✅
- [x] TanStack Query: 13 Query + 7 Mutation 実装 + コンポーネント統合 4ストア ✅
- [ ] Zustand persist: 全ストア統一（8-C 未着手）
- [x] TypeScript: strict: true + 0 errors（any 195箇所残存 → Phase 9 で継続削減） ✅

### Phase 9 受け入れ基準（目標）
- [ ] 損益管理: 取得単価入力 + 含み益/損計算が正確
- [ ] CSVインポート: SBI/楽天/マネックス 3社対応
- [ ] アラート機能: 価格・配分乖離アラートが動作
- [ ] E2Eテスト: 30本以上
- [ ] any 残存数: ≤ 100箇所（strict 強化継続）
