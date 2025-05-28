# API Key セキュリティガイド

## 現在のセキュリティ状況

### APIキーが必要なエンドポイント
- `/admin/*` - 管理者機能（`private: true`）

### APIキーが不要なエンドポイント
- `/api/market-data` - マーケットデータ取得
- `/auth/*` - 認証関連
- `/drive/*` - Google Drive連携

## セキュリティ強化の推奨事項

### 1. マーケットデータAPIにもAPIキー認証を追加

#### メリット
- **不正利用防止**: 誰でもアクセスできる状態を回避
- **利用状況の追跡**: APIキーごとの利用状況を把握
- **レート制限の実装**: APIキーごとに異なる制限を設定可能
- **収益化の可能性**: 将来的な有料プランの実装が容易

#### デメリット
- フロントエンドでAPIキーの管理が必要
- 開発時の複雑性が増加

### 2. 実装方法

#### Option A: 全エンドポイントにAPIキー必須
```yaml
# serverless.yml
marketData:
  handler: src/function/marketData.handler
  events:
    - http:
        path: api/market-data
        method: get
        private: true  # APIキーを必須に
        cors: ${self:custom.cors}
```

#### Option B: 段階的なAPIキー実装
```yaml
# 無料枠（APIキーなし）
marketData:
  handler: src/function/marketData.handler
  events:
    - http:
        path: api/market-data
        method: get
        cors: ${self:custom.cors}

# プレミアム版（APIキー必須）
marketDataPremium:
  handler: src/function/marketData.handler
  events:
    - http:
        path: api/v2/market-data
        method: get
        private: true
        cors: ${self:custom.cors}
```

### 3. APIキーの発行と管理

#### AWS API Gatewayでの設定
```yaml
resources:
  Resources:
    # Usage Plan の作成
    ApiUsagePlan:
      Type: AWS::ApiGateway::UsagePlan
      Properties:
        UsagePlanName: ${self:service}-${self:provider.stage}-usage-plan
        Description: Usage plan for pfwise API
        ApiStages:
          - ApiId: !Ref ApiGatewayRestApi
            Stage: ${self:provider.stage}
        Throttle:
          BurstLimit: 100
          RateLimit: 50
        Quota:
          Limit: 10000
          Period: DAY

    # APIキーの作成
    ApiKey:
      Type: AWS::ApiGateway::ApiKey
      Properties:
        Name: ${self:service}-${self:provider.stage}-key
        Description: API key for pfwise API
        Enabled: true
        StageKeys:
          - RestApiId: !Ref ApiGatewayRestApi
            StageName: ${self:provider.stage}

    # Usage PlanとAPIキーの関連付け
    ApiUsagePlanKey:
      Type: AWS::ApiGateway::UsagePlanKey
      Properties:
        KeyId: !Ref ApiKey
        KeyType: API_KEY
        UsagePlanId: !Ref ApiUsagePlan
```

### 4. クライアント側の実装

#### APIキーの安全な管理
```javascript
// 環境変数で管理（フロントエンド）
const API_KEY = process.env.REACT_APP_API_KEY;

// APIリクエスト時にヘッダーに追加
const fetchMarketData = async (type, symbols) => {
  const response = await fetch(`${API_URL}/api/market-data?type=${type}&symbols=${symbols}`, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

#### バックエンドでのプロキシ実装（推奨）
```javascript
// Next.js API Route の例
export default async function handler(req, res) {
  // サーバー側でAPIキーを管理
  const response = await fetch(`${INTERNAL_API_URL}/api/market-data?${req.query}`, {
    headers: {
      'x-api-key': process.env.API_KEY // サーバー側の環境変数
    }
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

### 5. 段階的移行プラン

#### Phase 1: 現状維持
- 管理者APIのみAPIキー必須
- マーケットデータは公開

#### Phase 2: レート制限の実装
- IPベースのレート制限追加
- 異常なアクセスパターンの検出

#### Phase 3: オプショナルAPIキー
- APIキーありの場合は高いレート制限
- APIキーなしの場合は低いレート制限

#### Phase 4: APIキー必須化
- 全ユーザーにAPIキー発行
- 無料プランと有料プランの差別化

### 6. セキュリティベストプラクティス

1. **APIキーのローテーション**
   - 定期的なAPIキーの更新
   - 古いキーの無効化

2. **IP制限**
   - 特定のIPアドレスからのみアクセス許可
   - CloudFrontやWAFの活用

3. **HTTPS必須**
   - 全ての通信をHTTPS化
   - 証明書の適切な管理

4. **監査ログ**
   - 全APIアクセスのログ記録
   - 異常なパターンの検出

5. **エラーハンドリング**
   - 詳細なエラー情報の隠蔽
   - 適切なエラーレスポンス

## 実装判断のポイント

### APIキーを必須にすべき場合
- 商用サービスとして提供
- 利用状況の詳細な把握が必要
- 悪用のリスクが高い
- SLAの提供が必要

### 公開APIとして維持すべき場合
- オープンデータの提供
- 開発者コミュニティの育成
- デモ・学習用途
- 低リスクなデータ

## 結論

現在の実装でも基本的なセキュリティは確保されていますが、以下の点でAPIキー認証の追加を推奨します：

1. **不正利用の防止**: 無制限アクセスによるAWSコスト増大リスク
2. **利用状況の把握**: ユーザーごとの利用パターン分析
3. **将来の収益化**: 有料プランへの移行が容易

ただし、開発の複雑性とユーザビリティのバランスを考慮し、段階的な導入が現実的です。