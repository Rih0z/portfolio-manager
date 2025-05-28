# AWS コスト最適化ガイド

## 現在の課金リスク

### 1. API Gateway 呼び出し回数
- セッションチェック: 15分ごと = 1日96回/ユーザー
- 100ユーザーで月約288,000回 = **約$1,008** (@ $3.50/百万リクエスト)

### 2. Lambda 実行時間
- 各リクエスト平均100ms想定
- 月288,000回 × 100ms = **約$5.76** (@ $0.20/百万リクエスト)

### 3. データ転送
- 各レスポンス平均5KB
- 月1.44GB = **約$0.13** (@ $0.09/GB)

## 推奨される最適化

### 1. セッションチェックの最適化
```javascript
// 現在: 15分ごと
// 推奨: 30分ごと + オンデマンド
setInterval(() => checkSession(), 30 * 60 * 1000);

// ユーザーアクション時のみチェック
const checkSessionOnDemand = debounce(() => {
  if (Date.now() - lastCheckTime > MIN_CHECK_INTERVAL) {
    checkSession();
  }
}, 5000);
```

### 2. バッチAPIの実装
```javascript
// 現在: 銘柄ごとに個別リクエスト
// 推奨: 一括取得エンドポイント
const batchFetchMarketData = async (tickers) => {
  return await fetch('/api/market-data/batch', {
    method: 'POST',
    body: JSON.stringify({ tickers })
  });
};
```

### 3. サーバーサイドキャッシュ
```javascript
// Lambda側での実装例
const cache = new Map();
const CACHE_TTL = 3600000; // 1時間

exports.handler = async (event) => {
  const cacheKey = generateCacheKey(event);
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // 実際のデータ取得処理
  const data = await fetchData();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};
```

### 4. 為替レートキャッシュの延長
```javascript
// 現在: 5分
// 推奨: 24時間（為替レートは日次更新で十分）
const EXCHANGE_RATE_CACHE_DURATION = 24 * 60 * 60 * 1000;
```

### 5. CloudFront CDNの活用
- 静的コンテンツをCDN配信
- APIレスポンスのキャッシュ（市場データ等）

## 予想されるコスト削減効果

### 最適化前
- 月額: 約$1,014 (100ユーザー想定)

### 最適化後
- セッションチェック50%削減: -$504
- バッチAPI導入で70%削減: -$350
- キャッシュ導入で追加30%削減: -$48
- **月額: 約$112** (89%削減)

## 実装優先順位

1. **高優先度**
   - セッションチェック間隔を30分に延長
   - 為替レートキャッシュを24時間に延長
   - バッチAPIエンドポイントの実装

2. **中優先度**
   - サーバーサイドキャッシュの実装
   - レスポンス圧縮の有効化
   - CloudFront CDNの導入

3. **低優先度**
   - WebSocketsへの移行
   - ページネーションの実装

## モニタリング

AWS CloudWatchで以下をモニタリング：
- API Gateway呼び出し回数
- Lambda実行時間
- データ転送量
- エラー率

アラート設定：
- API呼び出しが想定を超えた場合
- Lambda実行時間が長い場合
- エラー率が高い場合