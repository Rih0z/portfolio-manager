# セキュリティ推奨事項

## 現在の公開APIのリスクと対策

### リスク
1. **DDoS攻撃**: 大量のリクエストによるサービス停止とコスト増大
2. **データスクレイピング**: 市場データAPIの不正利用
3. **コスト爆発**: AWS Lambda/API Gatewayの従量課金

### 即座に実施すべき対策

#### 1. Cloudflare側の設定（無料で可能）
```
Cloudflare Dashboard > セキュリティ > 設定
- Bot Fight Mode: ON
- チャレンジパッセージ: 1週間
- セキュリティレベル: 中
```

#### 2. AWS WAFの追加（月額$5〜）
```bash
# Rate limiting rule
aws wafv2 create-rate-based-rule \
  --name RateLimitRule \
  --scope REGIONAL \
  --rate-limit 100 \
  --rate-key IP
```

#### 3. API Gateway使用量プランの設定
```yaml
# serverless.yml に追加
provider:
  usagePlan:
    quota:
      limit: 10000
      period: DAY
    throttle:
      burstLimit: 100
      rateLimit: 50
```

### 中期的な対策

#### 1. エンドポイントの分離
```
/public/config    # 最小限の公開情報のみ（キャッシュ可能）
/api/*           # すべて認証必須
/admin/*         # IP制限 + 認証
```

#### 2. CloudflareワーカーでのAPI保護
```javascript
// Cloudflare Worker
export default {
  async fetch(request, env) {
    // Botスコアチェック
    const cf = request.cf;
    if (cf.botManagement?.score < 30) {
      return new Response('Access denied', { status: 403 });
    }
    
    // レート制限
    const ip = request.headers.get('CF-Connecting-IP');
    const rateLimitKey = `rate_limit:${ip}`;
    const count = await env.KV.get(rateLimitKey) || 0;
    
    if (count > 100) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    // バックエンドへプロキシ
    return fetch(request);
  }
};
```

#### 3. 費用アラートの設定
```bash
# AWS Budget Alert
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

### 長期的な対策

#### 1. 認証の完全実装
- すべてのAPIエンドポイントにJWT認証を要求
- 公開情報は静的ファイルとして配信

#### 2. API Keyの実装
- 開発者向けにAPI Keyを発行
- 使用量の追跡と課金

#### 3. GraphQLへの移行
- 必要なデータのみ取得
- クエリの複雑度制限

## コスト削減のヒント

1. **CloudFront経由でのキャッシュ**
   - `/config/client`の結果を1時間キャッシュ
   - 99%のリクエストをオリジンに到達させない

2. **Lambda@Edgeでの前処理**
   - 不正なリクエストをエッジで拒否
   - オリジンへの負荷を削減

3. **予算アラート**
   - $10/日を超えたらアラート
   - $50/日で自動的にAPIを無効化

## 緊急時の対応

APIが攻撃を受けた場合：

1. **即座にCloudflareのUnder Attack Modeを有効化**
2. **API Gatewayのスロットリング設定を厳しくする**
3. **特定のIPアドレスをブロック**
4. **必要に応じて一時的にAPIを無効化**

```bash
# 緊急停止スクリプト
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-operations op=replace,path=/throttle/rateLimit,value=1
```