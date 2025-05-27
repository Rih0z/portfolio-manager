# Lambda関数でCORSヘッダーを追加する方法

API GatewayでCORSを有効化できない場合、Lambda関数のレスポンスに直接CORSヘッダーを追加します。

## Lambda関数の修正

以下のコードをLambda関数に追加してください：

### 1. レスポンスヘッダーの追加

```javascript
exports.handler = async (event) => {
    // CORSヘッダーの定義
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };
    
    // OPTIONSリクエストの処理（プリフライト）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'OK' })
        };
    }
    
    try {
        // 既存の処理...
        const result = await yourExistingLogic(event);
        
        // 成功レスポンスにCORSヘッダーを追加
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        // エラーレスポンスにもCORSヘッダーを追加
        return {
            statusCode: error.statusCode || 500,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: error.message || 'Internal Server Error'
            })
        };
    }
};
```

### 2. より詳細な実装例

```javascript
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // CORSヘッダー
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Max-Age": "86400"
    };
    
    // プリフライトリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        // クエリパラメータの取得
        const params = event.queryStringParameters || {};
        
        // 既存のビジネスロジック
        let responseData;
        
        switch (params.type) {
            case 'exchange-rate':
                responseData = await getExchangeRate(params);
                break;
            case 'us-stock':
                responseData = await getUSStock(params);
                break;
            case 'jp-stock':
                responseData = await getJPStock(params);
                break;
            case 'mutual-fund':
                responseData = await getMutualFund(params);
                break;
            default:
                throw new Error('Invalid type parameter');
        }
        
        // 成功レスポンス
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(responseData)
        };
        
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: error.statusCode || 500,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: false,
                error: {
                    message: error.message || 'Internal server error',
                    type: error.name || 'Error'
                }
            })
        };
    }
};
```

### 3. API Gateway統合レスポンスの確認

API Gatewayの統合レスポンスで、Lambda関数から返されたヘッダーが正しく伝達されるように設定：

1. API Gateway → 対象API → リソース
2. メソッド（GET/POST）を選択
3. **統合レスポンス** → **200**
4. **ヘッダーマッピング**で以下を確認：
   - `Access-Control-Allow-Origin` → `integration.response.header.Access-Control-Allow-Origin`

## 代替案: API Gatewayでメソッドレスポンスを設定

1. **メソッドレスポンス**で200レスポンスにヘッダーを追加：
   - Access-Control-Allow-Origin
   - Access-Control-Allow-Headers
   - Access-Control-Allow-Methods

2. **統合レスポンス**でヘッダーの値を設定：
   ```
   Access-Control-Allow-Origin: '*'
   Access-Control-Allow-Headers: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
   Access-Control-Allow-Methods: 'GET,POST,OPTIONS'
   ```

## テスト方法

Lambda関数を更新後、以下のコマンドでテスト：

```bash
# ブラウザと同じOriginヘッダーを付けてテスト
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -i "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data"

# 実際のGETリクエスト
curl -H "Origin: http://localhost:3000" \
     -i "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data?type=us-stock&symbols=AAPL"
```

正常な場合、レスポンスヘッダーに`Access-Control-Allow-Origin: *`が含まれます。