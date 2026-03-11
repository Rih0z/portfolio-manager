# バグ報告: 通貨切り替え時に金額が変わらない

**報告日**: 2026-03-10
**更新日**: 2026-03-11
**ステータス**: 全6件修正済み（Bug A〜F）→ ユーザー確認待ち
**関連**: `bug-report-currency-price-exchange.md` のBug 1と関連

---

## 症状

通貨アイコン（¥/$ ボタン）をクリックして円↔ドルを切り替えても、表示される金額が変わらない。
例: USDモードで$156 → JPYモードに切り替えても「156円」のまま（¥23,400に変わらない）

---

## 根本原因 — 4件の複合バグ

### Bug A（最重要）: initializeData が通貨修正を適用しない

**ファイル**: `src/stores/portfolioStore.ts` 約862行
**問題コード**:
```typescript
if (state.currentAssets.length > 0) {
  const { updatedAssets, changes } = get().validateAssetTypes(state.currentAssets);
  if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
    // ← currency変更のみの場合は updatedAssets が適用されない！
    updates.currentAssets = updatedAssets;
  }
}
```

**原因の連鎖**:
1. アプリ起動時に `initializeData` が localStorage から state を復元
2. `validateAssetTypes` を呼んで `currency` フィールドを修正（例: undefined → 'USD'）
3. ただし `fundType/fees/dividends` の変更がない場合、`updatedAssets` が `set()` されない
4. 資産が `currency: undefined` のまま残る
5. `selectTotalAssets` の変換条件 `asset.currency === 'USD'` / `=== 'JPY'` が false になり変換されない
6. 通貨トグル時: 数値は変わらずシンボルのみ変更される

**影響**: ページリロード後（市場データ更新前）に通貨切り替えが機能しない

---

### Bug B（重要）: portfolioDataEnricher の totalValue に通貨変換なし

**ファイル**: `src/utils/portfolioDataEnricher.ts` 304行
**問題コード**:
```typescript
const totalValue = safeAssets.reduce(
  (sum, a) => sum + (a.price || 0) * (a.holdings || 0),  // ← 通貨変換なし！
  0
);
```

**原因**: `enrichPortfolioData` は `baseCurrency` と `exchangeRate` を引数で受け取るのに、
`holdings.totalValue` の計算では使用していない。
`baseCurrency` が変わっても `totalValue` は常に同じ値を返す。

**影響**: `GoalProgressSection` に渡される `currentValue` が通貨変換されず、
通貨切り替え時に数値が変わらない（シンボルのみ変更）。

---

### Bug C（中）: PnLTrendChart の価格履歴なし資産に通貨変換なし

**ファイル**: `src/components/dashboard/PnLTrendChart.tsx` 65行
**問題コード**:
```typescript
totalValue += (asset.price || 0) * (asset.holdings || 0);  // ← 通貨変換なし
```

価格履歴がある資産は正しく変換されている（82-86行）が、
価格履歴がない資産は変換されない。PnLトレンドチャートの基準値がずれる。

---

### Bug D（中）: Simulation の合計資産計算で予算通貨を無視

**ファイル**: `src/pages/Simulation.tsx` 87行
**問題コード**:
```tsx
{formatCurrencyValue(totalAssets + additionalBudget.amount, baseCurrency)}
```

`totalAssets` は `baseCurrency` に換算済みだが、`additionalBudget.amount` は
`additionalBudget.currency`（例: JPY）のまま加算される。
例: baseCurrency='USD', totalAssets=$156, additionalBudget=¥300,000 →
  `$156 + 300000 = "$300,156"` ← 完全に誤り

---

## 修正案

### Fix A: initializeData — 通貨修正を常に適用

```typescript
// Before:
if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
  updates.currentAssets = updatedAssets;
  ...
}

// After:
if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0 || (changes.currency ?? 0) > 0) {
  updates.currentAssets = updatedAssets;
  if (changes.fundType > 0) notify(...);
  if (changes.fees > 0) notify(...);
  if ((changes.currency ?? 0) > 0) notify(`${changes.currency}件の銘柄で通貨情報を修正しました`, 'info');
}
```

### Fix B: portfolioDataEnricher — totalValue に通貨変換を追加

```typescript
const totalValue = safeAssets.reduce((sum, a) => {
  let assetValue = (a.price || 0) * (a.holdings || 0);
  if (a.currency && a.currency !== baseCurrency) {
    if (baseCurrency === 'JPY' && a.currency === 'USD') assetValue *= exchangeRate;
    else if (baseCurrency === 'USD' && a.currency === 'JPY') assetValue /= exchangeRate;
  }
  return sum + assetValue;
}, 0);
```

### Fix C: PnLTrendChart — 価格履歴なし資産の通貨変換

```typescript
// baseCurrency, exchangeRate をコンポーネントの引数から取得済みであることを確認
let rawValue = (asset.price || 0) * (asset.holdings || 0);
if (asset.currency && asset.currency !== baseCurrency) {
  if (baseCurrency === 'JPY' && asset.currency === 'USD') rawValue *= exchangeRate.rate;
  else if (baseCurrency === 'USD' && asset.currency === 'JPY') rawValue /= exchangeRate.rate;
}
totalValue += rawValue;
```

### Fix D: Simulation — 予算を baseCurrency に換算して加算

```typescript
// usePortfolioContext から convertCurrency を取得して使用
const budgetInBase = additionalBudget.currency === baseCurrency
  ? additionalBudget.amount
  : convertCurrency(additionalBudget.amount, additionalBudget.currency, baseCurrency);

{formatCurrencyValue(totalAssets + budgetInBase, baseCurrency)}
```

---

### Bug E（高）: portfolioScore.ts の totalValue に通貨換算なし

**ファイル**: `src/utils/portfolioScore.ts` 272行
**問題コード**:
```typescript
const totalValue = safeAssets.reduce((sum, a) => sum + a.price * a.holdings, 0);
```

**影響**: `calculatePortfolioScore` が `baseCurrency`/`exchangeRate` を受け取らないため、
混在通貨（USD+JPY）ポートフォリオで全6指標の重み計算が誤り。
JPY資産が支配的に見え、分散度・目標適合度・通貨分散スコアが完全に間違う。

**修正**: `baseCurrency`・`exchangeRate` を追加パラメータとし、`convertedValues[]` を事前計算。
全ヘルパー関数（`calcDiversification`/`calcTargetAlignment`/`calcCostEfficiency`/
`calcRebalanceHealth`/`calcCurrencyDiversification`/`calcDividendHealth`）を更新。

---

### Bug F（中）: useAlertEvaluation + notificationStore のアラート評価で通貨換算なし

**ファイル1**: `src/hooks/useAlertEvaluation.ts` 50-53行
**ファイル2**: `src/stores/notificationStore.ts` 335行

**問題**: リバランスドリフトのアラート計算で `totalValue` および個別 `assetValue` に通貨換算なし。
USD資産の場合 baseCurrency=JPY 時に `$1000` を `¥15,000,000` の分母で割るため、
現在配分が0.007%と誤計算され、アラートが誤発火または未発火する。

---

## 優先順位（全6バグ）

| バグ | 重要度 | 影響 | 状態 |
|------|--------|------|------|
| A: initializeData 通貨修正漏れ | 🔴 高 | 通貨切り替え全体が機能しない | ✅ 修正済み |
| B: portfolioDataEnricher totalValue | 🔴 高 | GoalProgressSection の値が間違い | ✅ 修正済み |
| C: PnLTrendChart 変換なし | 🟡 中 | チャートの絶対値がずれる | ✅ 修正済み |
| D: Simulation 予算通貨混在 | 🟡 中 | シミュレーション後総資産が大幅に誤り | ✅ 修正済み |
| E: portfolioScore.ts totalValue | 🔴 高 | 全スコア指標の重み計算が誤り | ✅ 修正済み |
| F: useAlertEvaluation + notificationStore | 🟡 中 | リバランスアラートの誤発火/未発火 | ✅ 修正済み |

---

## なぜテストで発見できなかったか

1. **弱いアサーション**: `expect(totalValue).toBeGreaterThan(0)` — 正の数であれば通る
2. **単一通貨テストデータ**: テストが全てUSD単体 or JPY単体 → 換算コードパスを通過しない
3. **`currency: undefined` の未テスト**: ページリロード後に発生する実際のバグを再現できない
4. **複合条件の未テスト**: `fundType`正常 + `currency`異常 → `initializeData`の条件分岐漏れを検出できない
5. **インテグレーションテストの欠如**: `initializeData` → `toggleCurrency` → `selectTotalAssets` の連続フローが未テスト

---

## 確認事項

ユーザーへ確認:
1. 「156円」はどの画面・どのカードに表示されていますか？（ダッシュボードの「総資産」？「投資目標」カード？シミュレーションページ？）
2. 市場データの更新ボタンを押した後でも同じ症状が出ますか？

