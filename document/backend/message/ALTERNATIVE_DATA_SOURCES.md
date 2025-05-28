# Alternative Data Sources for Stock and Mutual Fund Data

## 現在の実装状況

### 使用中のデータソース
1. **Yahoo Finance API** - メインの米国株データソース
2. **exchangerate-host** - 為替レート
3. **Webスクレイピング** - Yahoo Finance Japan、Minkabu、Kabutan
4. **Morningstar CSV** - 投資信託データ

### 未使用の実装済みソース
- **Alpha Vantage** (`src/services/sources/alphaVantageService.js`は存在するが未使用)

## 推奨される代替データソース

### 1. Finnhub (推奨度: ★★★★★)
```javascript
// 実装例
const finnhubApiKey = 'YOUR_FREE_API_KEY';
const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`;

// 利点:
// - 60 calls/分の無料枠
// - リアルタイムデータ
// - WebSocketサポート
// - 良好なドキュメント
```

### 2. IEX Cloud (推奨度: ★★★★☆)
```javascript
// 実装例
const iexApiKey = 'YOUR_PUBLISHABLE_TOKEN';
const iexUrl = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${iexApiKey}`;

// 利点:
// - 50,000 messages/月の無料枠
// - 高品質データ
// - バッチリクエスト対応
```

### 3. Twelve Data (推奨度: ★★★★☆)
```javascript
// 実装例
const twelveDataApiKey = 'YOUR_API_KEY';
const twelveDataUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&apikey=${twelveDataApiKey}`;

// 利点:
// - 800 calls/日の無料枠
// - テクニカル指標対応
// - 為替データも取得可能
```

### 4. Polygon.io (推奨度: ★★★☆☆)
```javascript
// 実装例
const polygonApiKey = 'YOUR_API_KEY';
const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${polygonApiKey}`;

// 利点:
// - リアルタイムWebSocket
// - 詳細な市場データ
// 欠点:
// - 無料枠が限定的
```

## 日本市場向けデータソース

### 1. 日本取引所グループ (JPX)
- **URL**: https://www.jpx.co.jp/markets/statistics-equities/daily/
- **形式**: CSV
- **更新**: 日次（20分遅延）
- **実装方法**: 定期的なCSVダウンロードとパース

### 2. 投資信託協会
- **URL**: https://www.toushin.or.jp/statistics/
- **形式**: CSV/Excel
- **データ**: 基準価額、純資産総額
- **実装方法**: 定期的なダウンロードとキャッシュ

## 実装優先順位

### Phase 1 (即実装可能)
1. **Alpha Vantage の有効化**
   - 既にコードが存在
   - API keyをSecrets Managerに追加するだけ
   
2. **Finnhub の追加**
   - 無料枠が大きい
   - 実装が簡単

### Phase 2 (中期的)
1. **IEX Cloud の追加**
   - バッチ処理に最適
   - コスト効率が良い

2. **JPXデータの自動取得**
   - 日本株の安定したデータソース
   - 無料

### Phase 3 (長期的)
1. **複数ソースの自動切り替え**
   - ソースの健全性監視
   - 自動フェイルオーバー

## コスト比較

| サービス | 無料枠 | 有料プラン開始価格 | リアルタイム |
|---------|-------|------------------|------------|
| Yahoo Finance | 無制限* | N/A | No |
| Alpha Vantage | 500 calls/日 | $49.99/月 | No |
| Finnhub | 60 calls/分 | $0/月〜 | Yes |
| IEX Cloud | 50k msgs/月 | $9/月〜 | Yes |
| Twelve Data | 800 calls/日 | $29/月〜 | Yes |
| Polygon.io | 5 calls/分 | $29/月〜 | Yes |

*非公式API使用時

## 実装時の注意点

1. **レート制限の管理**
   - 各APIのレート制限を設定ファイルで管理
   - 自動的にレート制限を守る仕組み

2. **データ形式の統一**
   - 各APIからのレスポンスを統一形式に変換
   - 既存のデータ構造を維持

3. **エラーハンドリング**
   - API固有のエラーを適切に処理
   - フォールバック先の自動選択

4. **コスト監視**
   - 各APIの使用量を追跡
   - 無料枠の残量アラート

## 推奨実装アプローチ

```javascript
// src/services/sources/multiSourceProvider.js
class MultiSourceProvider {
  constructor() {
    this.sources = [
      { name: 'finnhub', priority: 1, rateLimit: 60 },
      { name: 'yahooFinance', priority: 2, rateLimit: null },
      { name: 'alphaVantage', priority: 3, rateLimit: 5 },
      { name: 'iexCloud', priority: 4, rateLimit: 100 }
    ];
  }

  async getStockData(symbol, preferredSource = null) {
    // 優先順位に基づいてソースを試行
    for (const source of this.sources) {
      try {
        if (this.checkRateLimit(source)) {
          const data = await this.fetchFromSource(source, symbol);
          if (data) return this.normalizeData(data, source.name);
        }
      } catch (error) {
        console.error(`Error from ${source.name}:`, error);
        continue;
      }
    }
    // 全て失敗した場合はフォールバックデータを返す
    return this.getFallbackData(symbol);
  }
}
```

## まとめ

1. **短期的には** Finnhub と Alpha Vantage (既存) の活用がコスト効率的
2. **中期的には** IEX Cloud の追加でバッチ処理を最適化
3. **長期的には** 複数ソースの自動管理システムで安定性向上

これらの実装により、データ取得の信頼性向上とコスト削減の両立が可能になります。