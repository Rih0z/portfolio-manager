# Phase 9-C': ドーパミンダッシュボード再設計 + ペルソナUXレビュースキル

**作成日**: 2026-03-11
**依存**: 競合分析 → `docs/tmp/competitor-analysis-dopamine-design.md`
**目的**: タケシが毎日開きたくなるダッシュボード + レビュー品質の向上

---

## 概要

### やること（3つの柱）

1. **ダッシュボードのドーパミン再設計** — 開いた瞬間に「投資の成果」が飛び込む
2. **マイルストーン祝福システム** — 「責任あるゲーミフィケーション」で成長実感
3. **ペルソナ適合マルチエージェントレビュースキル** — UI/UXをペルソナ視点で自動レビュー

---

## 1. ダッシュボード再設計

### 1-A: ヒーローPnLカード（最優先）

**現状の問題**: PnLSummaryは小さなカードで、総投資額→評価額→損益の3行。情報が埋もれている。

**再設計**:
```
┌─────────────────────────────────────────────────────┐
│  ┌─ 背景グラデーション（利益時: green-500/5、損失時: red-500/5）──┐  │
│  │                                                              │  │
│  │  参考評価額                                                   │  │
│  │  ¥2,450,000                    ← 超大文字(3xl/4xl)           │  │
│  │                                                              │  │
│  │  +¥125,340 (+5.4%)  [Badge]   ← 大文字、緑/赤               │  │
│  │                                                              │  │
│  │  ┌──────────┬──────────┬──────────┐                          │  │
│  │  │ 前日比    │ 先週比    │ 先月比    │ ← 3列比較              │  │
│  │  │ +¥2,100  │ +¥12,000 │ +¥45,000 │                          │  │
│  │  │ (+0.1%)  │ (+0.5%)  │ (+1.9%)  │                          │  │
│  │  └──────────┴──────────┴──────────┘                          │  │
│  │                                                              │  │
│  │  総投資額: ¥2,324,660           ← 控えめ表示                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**変更ファイル**:
- `src/components/dashboard/PnLSummary.tsx` — 全面書き換え
- `src/utils/plCalculation.ts` — 期間別損益計算の追加（weekChange, monthChange）

**設計原則**:
- 評価額を画面の最上部、最大フォントで表示（Robinhood方式）
- 背景グラデーションでポートフォリオの状態を色で伝える
- 期間別比較（前日/先週/先月）で「成長実感」を提供
- 総投資額は補助情報として控えめに

### 1-B: ダッシュボードレイアウト再構成

**現状の問題**: 情報が縦に長く、重要な情報（チャート、スコア）が画面下部に埋もれている。

**再設計 — 情報の優先度順に再配置**:
```
1. DataStatusBar           ← 維持
2. ★ HeroPnLCard          ← 新: 評価額+損益+期間比較（画面の40%を占める）
3. ★ MiniTrendChart        ← 新: PnLカード直下にインラインチャート（1行）
4. ★ WeeklyDigest          ← 新: 「今週のハイライト」カード
5. PortfolioScoreCard      ← 上に移動（スコア変動バッジ付き）
6. GoalProgressSection     ← 維持（予測線追加は別フェーズ）
7. StrengthsWeaknessCard   ← 維持
8. PortfolioSummary        ← 維持
9. PortfolioCharts         ← 維持
10. PnLTrendChart          ← 維持（詳細版として残す）
11. DifferenceChart        ← 維持
12. AssetsTable            ← 維持
13. NPSSurvey              ← 維持
```

**変更ファイル**:
- `src/pages/Dashboard.tsx` — コンポーネント配置順変更 + 新コンポーネント追加
- タイトル「ポートフォリオダッシュボード」→ 削除（HeroPnLカードが代替）

### 1-C: ミニトレンドチャート

**新コンポーネント**: `src/components/dashboard/MiniTrendChart.tsx`

HeroPnLカード直下に配置する、高さ60px程度のスパークラインチャート。
- 直近1ヶ月の資産推移をArea chartで表示
- 緑（上昇トレンド）/ 赤（下降トレンド）
- タップで既存のPnLTrendChartまでスクロール（詳細版へ導線）
- 軸ラベルなし、数値表示なし（視覚的なトレンド確認のみ）

### 1-D: ウィークリーダイジェスト

**新コンポーネント**: `src/components/dashboard/WeeklyDigest.tsx`

```
┌─ 今週のハイライト ────────────────────────────┐
│                                                │
│  📈 最も上昇: AAPL +5.2% (+¥8,200)            │
│  📉 最も下落: 7203 -1.3% (-¥3,900)            │
│  💰 スコア: 78点 (↑3 先週比)                   │
│  🎯 目標「老後資金」まであと ¥7,550,000        │
│                                                │
└────────────────────────────────────────────────┘
```

※ アイコンはLucide Icons使用（絵文字は使わない）

**データソース**:
- 最も上昇/下落: `currentAssets` の `dayChange` ソート
- スコア変動: `localStorage` にスコア履歴を保存、前週比を算出
- 目標: `goalStore` から最も近い目標の残額

### 1-E: スコア変動バッジ

**既存コンポーネント修正**: `src/components/dashboard/PortfolioScoreCard.tsx`

スコアの横に前回比のバッジを追加:
```
78点  ↑3  ← 前回75点からの変動
```

**実装**:
- `localStorage` に `pfwise_score_history` キーでスコア履歴を保存
  ```typescript
  { date: '2026-03-11', score: 78, grade: 'B' }
  ```
- Zustand persist ではなく単純なlocalStorage（既存のpersist統一に影響しないよう）
  → ただし8-C方針と整合性を取り、portfolioStoreのpersist状態に追加も検討
- 変動が正なら緑、負なら赤、0ならグレー

---

## 2. マイルストーン祝福システム

### 2-A: マイルストーン定義

**新ファイル**: `src/utils/milestones.ts`

```typescript
interface Milestone {
  id: string;
  type: 'asset_value' | 'pnl_percent' | 'score_grade' | 'holding_period' | 'diversification';
  condition: (context: MilestoneContext) => boolean;
  title: string;
  message: string;
  icon: string; // Lucide icon name
  celebration: 'confetti' | 'pulse' | 'badge'; // アニメーションタイプ
}
```

**初期マイルストーン一覧**:

| ID | タイプ | 条件 | メッセージ | 祝福 |
|----|--------|------|-----------|------|
| asset_100k | asset_value | 総資産 ≥ ¥100,000 | 資産10万円突破！ | pulse |
| asset_500k | asset_value | 総資産 ≥ ¥500,000 | 資産50万円突破！ | pulse |
| asset_1m | asset_value | 総資産 ≥ ¥1,000,000 | 資産100万円を達成しました！ | confetti |
| asset_5m | asset_value | 総資産 ≥ ¥5,000,000 | 資産500万円達成！ | confetti |
| asset_10m | asset_value | 総資産 ≥ ¥10,000,000 | 資産1,000万円の大台突破！ | confetti |
| pnl_5 | pnl_percent | 含み益 ≥ +5% | 含み益+5%達成！順調です | badge |
| pnl_10 | pnl_percent | 含み益 ≥ +10% | 含み益+10%達成！素晴らしい | pulse |
| pnl_20 | pnl_percent | 含み益 ≥ +20% | 含み益+20%！長期投資の成果です | confetti |
| score_a | score_grade | スコア ≥ 80 (A判定) | ポートフォリオがA判定に！ | pulse |
| score_s | score_grade | スコア ≥ 90 (S判定) | S判定達成！最高評価です | confetti |
| diversify_5 | diversification | 5銘柄以上保有 | 分散投資の第一歩！5銘柄達成 | badge |
| diversify_10 | diversification | 10銘柄以上保有 | 10銘柄で分散度が向上！ | pulse |

**重要**: 全て「良い投資行動」の祝福。取引回数やログイン頻度は祝福しない（Robinhoodの教訓）。

### 2-B: 達成済みマイルストーン管理

- `localStorage` に `pfwise_milestones_achieved` キーで達成済みリストを保存
- 同じマイルストーンは1度のみ祝福（再表示しない）
- ダッシュボード読み込み時にチェック、新規達成があれば祝福表示

### 2-C: 祝福UIコンポーネント

**新コンポーネント**: `src/components/common/MilestoneToast.tsx`

- `confetti`: canvas-confettiライブラリで紙吹雪 + トースト通知
- `pulse`: カードがパルスアニメーション + トースト通知
- `badge`: 控えめなバッジ表示 + トースト通知

**新ライブラリ**: `canvas-confetti` (軽量、5KB gzip)

---

## 3. ペルソナ適合マルチエージェントレビュースキル

### 3-A: 新スキル `review-persona-ux`

**ファイル**: `.claude/commands/review-persona-ux.md`

**目的**: ペルソナ「タケシ」の視点でUI/UXを総合レビュー

**レビュー観点**:

1. **ドーパミン設計チェック** (25点)
   - 開いた瞬間に「資産の成果」が見えるか
   - 色で利益/損失が直感的にわかるか
   - マイルストーン祝福が機能しているか
   - スコア変動が可視化されているか
   - 「毎日開きたくなる理由」があるか

2. **ペルソナ適合チェック** (25点)
   - タケシ（28-42歳、IT企業、日米分散投資）の語彙に合っているか
   - モバイルファーストか（通勤中にチェック）
   - 情報密度は適切か（データ重視のIT系）
   - 3大証券CSV取込→分析の最短パスが実現されているか
   - フリクションポイント（不要な確認、過剰な入力）がないか

3. **UIデザインチェック** (25点)
   - shadcn/ui準拠か
   - フィンテック信頼感（Blue/Grey基調、控えめ配色）
   - JetBrains Mono のtabular-nums使用
   - 緑赤は損益のみに限定されているか
   - 絵文字不使用（Lucide Iconsのみ）

4. **エンゲージメントチェック** (25点)
   - 「来てよかった」が3秒以内にあるか
   - Aha moment（初回CSV取込→ダッシュボード反映）が最短か
   - Free→Standard の転換トリガーが自然か
   - 情報階層が明確か（最重要→補助の順）
   - 空状態が「行動を促す」設計か

### 3-B: 新スキル `review-ux-dopamine`

**ファイル**: `.claude/commands/review-ux-dopamine.md`

**目的**: ドーパミン設計の専門レビュー（競合比較付き）

**レビュー観点**:
- Robinhood比較: 第一印象の数字は十分大きいか
- ロボフォリオ比較: サクサク感はあるか
- カビュウ比較: 視覚化の多彩さはあるか
- WealthNavi比較: 信頼感は出ているか
- マネーフォワード比較: 広告・ノイズはないか

---

## 実装順序

```
Step 1: レビュースキル作成（review-persona-ux, review-ux-dopamine）
  ↓
Step 2: 現状レビュー実行 → ベースライン点数を記録
  ↓
Step 3: HeroPnLCard 再設計（1-A）
  ↓
Step 4: ダッシュボードレイアウト再構成（1-B）
  ↓
Step 5: MiniTrendChart 追加（1-C）
  ↓
Step 6: WeeklyDigest 追加（1-D）
  ↓
Step 7: スコア変動バッジ（1-E）
  ↓
Step 8: マイルストーン祝福システム（2-A〜2-C）
  ↓
Step 9: テスト追加 + /test-quality-review 実行
  ↓
Step 10: 再レビュー実行 → 改善点数を確認
  ↓
Step 11: ビルド + デプロイ + GitHub push
```

---

## 受け入れ基準

- [ ] ダッシュボード開いた瞬間に評価額が最大フォントで表示される
- [ ] 利益時は緑グラデーション、損失時は赤グラデーションの背景
- [ ] 前日比・先週比・先月比の3列比較が表示される
- [ ] ミニトレンドチャート（スパークライン）がPnLカード直下に表示
- [ ] ウィークリーダイジェストが表示される（最上昇/最下落/スコア/目標）
- [ ] スコア変動バッジが前回比で表示される
- [ ] マイルストーン達成時に祝福アニメーション（confetti/pulse/badge）が表示される
- [ ] 同じマイルストーンは2度祝福されない
- [ ] review-persona-ux スキルが機能する
- [ ] review-ux-dopamine スキルが機能する
- [ ] 全テスト通過・TypeScript 0 errors・ビルド成功
- [ ] 通貨換算ルール遵守（新コンポーネントの金額表示は全てbaseCurrency換算）
