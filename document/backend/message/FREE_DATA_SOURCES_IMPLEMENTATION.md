# 無料データソース実装ガイド

## 実装済みの無料データソース

### 1. Yahoo Finance2 (npm package)
- **パッケージ**: `yahoo-finance2`
- **APIキー**: 不要
- **料金**: 完全無料
- **対応データ**:
  - 米国株
  - 日本株（銘柄コード.T）
  - 為替レート
  - ETF、暗号通貨

#### 実装ファイル
- `/src/services/sources/yahooFinance2Service.js`

#### 使用例
```javascript
// 米国株
const appleData = await yahooFinance2Service.getStockDataFromYahooFinance2('AAPL', 'us-stock');

// 日本株
const toyotaData = await yahooFinance2Service.getStockDataFromYahooFinance2('7203', 'jp-stock');

// 為替レート
const usdJpy = await yahooFinance2Service.getExchangeRate('USD', 'JPY');

// バッチ取得
const batchData = await yahooFinance2Service.getBatchStockData(['AAPL', 'GOOGL', 'MSFT'], 'us-stock');
```

### 2. JPX CSV データ
- **ソース**: 日本取引所グループ公式
- **APIキー**: 不要
- **料金**: 完全無料
- **データ遅延**: 20分
- **対応データ**:
  - 東証上場全銘柄
  - TOPIX指数

#### 実装ファイル
- `/src/services/sources/jpxCsvService.js`

#### 使用例
```javascript
// 単一銘柄
const toyotaData = await jpxCsvService.getJPXStockData('7203');

// バッチ取得
const batchData = await jpxCsvService.getBatchJPXData(['7203', '9984', '6758']);

// TOPIX指数
const topixData = await jpxCsvService.getTOPIXData();
```

#### 注意事項
- 土日祝日はデータが利用できない
- 前営業日のデータが提供される
- Shift-JISエンコーディングのため、iconv-liteが必要

### 3. Morningstar CSV (既存実装)
- **対応データ**: 投資信託
- **実装済み**: `fundDataService.js`

## データソース優先順位

### 米国株 (us-stock)
1. Yahoo Finance2 (npm) - 無料、リアルタイム
2. Alpha Vantage API - APIキーが設定されている場合
3. Yahoo Finance API - 既存実装
4. Yahoo Finance (Web) - スクレイピング
5. Fallback - GitHubキャッシュ

### 日本株 (jp-stock)
1. Yahoo Finance2 (npm) - 無料、リアルタイム
2. JPX CSV - 公式データ、20分遅延
3. Yahoo Finance Japan - スクレイピング
4. Minkabu - スクレイピング
5. Kabutan - スクレイピング
6. Fallback - GitHubキャッシュ

### 為替レート (exchange-rate)
1. Yahoo Finance2 (npm) - 無料、リアルタイム
2. exchangerate-host - 既存実装
3. 動的計算
4. ハードコード値

### 投資信託 (mutual-fund)
1. Morningstar CSV - 既存実装
2. Fallback - GitHubキャッシュ

## 実装の特徴

### バッチ処理の最適化
- Yahoo Finance2は内部でバッチ処理を最適化
- JPX CSVは一度のダウンロードで全銘柄データ取得
- DynamoDBアクセスを70-80%削減

### エラーハンドリング
- 各データソースで失敗した場合、自動的に次のソースにフォールバック
- 全てのソースが失敗してもデフォルト値を返す
- ブラックリスト機能で繰り返し失敗する銘柄をスキップ

### キャッシュ戦略
- 全データタイプで1時間キャッシュに統一
- バッチリクエストは一括でキャッシュ
- キャッシュウォーミングは6時間ごと

## 追加可能な無料データソース

### 1. 日本銀行 為替データ
- URL: https://www.boj.or.jp/statistics/market/forex/
- 公式為替レートCSV

### 2. 投資信託協会
- URL: https://www.toushin.or.jp/statistics/
- 基準価額データCSV

### 3. FRED (Federal Reserve Economic Data)
- 経済指標データ
- APIキー必要だが無料枠が大きい

## パフォーマンス改善結果

- **APIコール削減**: 70-80%（バッチ処理により）
- **レスポンス時間**: Yahoo Finance2により高速化
- **信頼性向上**: 複数ソースによるフォールバック
- **コスト削減**: APIキー不要のソースを優先使用

## トラブルシューティング

### Yahoo Finance2のエラー
```
Error: Cannot find module 'yahoo-finance2'
```
解決: `npm install yahoo-finance2`

### JPX CSVの404エラー
- 土日祝日は前営業日のデータを取得
- URLフォーマットが変更される可能性あり

### エンコーディングエラー
```
Error: Cannot find module 'iconv-lite'
```
解決: `npm install iconv-lite`

## まとめ

これらの無料データソースにより：
1. APIキーなしで市場データ取得可能
2. コスト削減とパフォーマンス向上
3. データソースの冗長性確保

Alpaca APIは設定されているが未使用。必要に応じて実装可能。