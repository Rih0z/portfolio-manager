# バグ報告: 通貨・価格・為替レートの不具合（3件）

**報告日**: 2026-03-08
**ステータス**: 原因特定済み → 修正中

---

## Bug 1: ドル資産がすべて円として登録される

### 症状
Webull等からAI経由でドル建て資産をインポートすると、すべてJPY（円）として登録される。

### 根本原因
**`portfolioStore.ts` の `validateAssetTypes` が通貨フィールドを検証・修正しない**

1. `importData` は `validateAssetTypes` を呼び出して資産を検証する
2. `validateAssetTypes` は `fundType`, `fees`, `dividends` のみ検証し、`currency` は無視
3. AI経由のインポートデータに `currency` フィールドが欠けている場合、修正されない
4. `csvParsers.ts` の `guessCurrency` は英字1-5文字のティッカーを `USD` と判定するが、`validateAssetTypes` からは呼ばれていない

### 修正方法
`validateAssetTypes` に通貨検証ロジックを追加。ティッカーパターンから適切な通貨を推定し、不正な値を修正する。

---

## Bug 2: GLD等一部資産の価格が正しくない

### 症状
GLD等の一部の資産で正確な価格が取得できず、フォールバック値（100）が使用される。

### 根本原因
**`apiUtils.ts` の `generateFallbackData` が全US株に固定価格 `100` を使用**

1. API取得失敗時に `generateFallbackData` が呼ばれる
2. 日本株=1000, 投資信託=10000, US株/ETF=100 の固定値
3. GLD（約$180-200）等のETFに対しても100が使用される
4. フォールバック価格が実勢から大きく乖離

### 修正方法
主要な米国ETFの概算価格テーブルを追加し、フォールバック時により正確な価格を提供する。

---

## Bug 3: 円ドル為替レートの取得が機能していない

### 症状
為替レートの取得が失敗し、デフォルト値（150円/ドル）が永続的に使用される。

### 根本原因
**`fetchExchangeRate` がエラー時に `success: false` を返し、`updateExchangeRate` がキャッシュしない**

1. `fetchExchangeRate`（marketDataService.ts:108-119）: エラー時に `success: false` + `rate: 150` を返す
2. `updateExchangeRate`（portfolioStore.ts:396）: `result.success` が true の場合のみキャッシュ
3. フォールバックレートがキャッシュされないため、毎回APIリクエストが発生→毎回失敗
4. 5分ごとのリトライも同じ問題で失敗し続ける

### 修正方法
`updateExchangeRate` で `result.rate` が存在する場合はキャッシュする（success フラグに関わらず）。
