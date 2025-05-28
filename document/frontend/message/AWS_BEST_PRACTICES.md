# AWS API Gateway設定のベストプラクティス

## 問題の診断

現在、以下の問題が発生しています：
- curlでは動作するが、ブラウザからアクセスできない → **CORS設定の問題**
- プロキシで大量のリクエストが発生 → **リトライループの問題**

## 推奨される解決方法

### 方法1: Lambda関数でCORSを完全に制御（推奨）

**Lambda関数を以下のように修正してください：**

```javascript
exports.handler = async (event) => {
    // すべてのレスポンスに付けるCORSヘッダー
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Max-Age": "86400"
    };
    
    // OPTIONSリクエスト（プリフライト）の処理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    // 既存の処理にCORSヘッダーを追加
    try {
        // 既存のビジネスロジック
        const result = await yourBusinessLogic(event);
        
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

### 方法2: API GatewayでCORSを設定（AWSコンソール）

1. **API Gatewayコンソール**を開く
2. 対象のAPI（`x4scpbsuv2`）を選択
3. **リソース** → `/dev/api/market-data`を選択
4. **アクション** → **メソッドの作成** → **OPTIONS**を追加

5. **OPTIONSメソッドの設定**:
   - 統合タイプ: **Mock**
   - **保存**

6. **メソッドレスポンス**で`200`レスポンスにヘッダーを追加:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Headers` 
   - `Access-Control-Allow-Methods`

7. **統合レスポンス**でヘッダーの値を設定:
   ```
   Access-Control-Allow-Origin: '*'
   Access-Control-Allow-Headers: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
   Access-Control-Allow-Methods: 'GET,POST,OPTIONS'
   ```

8. **GETメソッド**にも同じヘッダーを追加

9. **APIをデプロイ**:
   - アクション → APIのデプロイ
   - ステージ: dev

### 方法3: API Gateway REST APIでCORS設定（CLI）

AWS CLIを使用してCORSを設定：

```bash
# リソースIDを取得
aws apigateway get-resources --rest-api-id x4scpbsuv2 --region us-west-2

# OPTIONSメソッドを追加
aws apigateway put-method \
  --rest-api-id x4scpbsuv2 \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region us-west-2

# Mock統合を設定
aws apigateway put-integration \
  --rest-api-id x4scpbsuv2 \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region us-west-2

# レスポンスを設定
aws apigateway put-method-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
  --region us-west-2

# 統合レスポンスを設定
aws apigateway put-integration-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,OPTIONS'"'"'"}' \
  --region us-west-2

# デプロイ
aws apigateway create-deployment \
  --rest-api-id x4scpbsuv2 \
  --stage-name dev \
  --region us-west-2
```

## ローカル開発環境の設定

### 開発時の推奨設定

1. **ローカル開発ではモックを使用**:
```javascript
// .env.development
REACT_APP_USE_MOCK_API=true
REACT_APP_MARKET_DATA_API_URL=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com
```

2. **APIサービスでモックとの切り替え**:
```javascript
// src/services/marketDataService.js
const USE_MOCK = process.env.REACT_APP_USE_MOCK_API === 'true';

export const fetchExchangeRate = async (fromCurrency = 'USD', toCurrency = 'JPY') => {
  if (USE_MOCK) {
    // モックデータを返す
    return {
      success: true,
      rate: 150.0,
      source: 'Mock'
    };
  }
  
  // 実際のAPI呼び出し
  return fetchWithRetry(...);
};
```

## 確認方法

1. **CORSヘッダーの確認**:
```bash
curl -I -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data
```

2. **ブラウザのコンソールで確認**:
- Network タブでOPTIONSリクエストが200を返すか
- CORSエラーが出ていないか

## まとめ

最も簡単で確実な方法は**Lambda関数でCORSヘッダーを追加**することです。これにより：
- API Gatewayの複雑な設定を避けられる
- すべてのレスポンスに確実にCORSヘッダーが付く
- デプロイが簡単

Lambda関数を更新してデプロイすれば、すぐに動作するはずです。