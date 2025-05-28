# Lambda関数のCORS対応コード

## Lambda関数の完全なコード例

以下のコードをLambda関数に設定してください：

```javascript
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // CORSヘッダーの定義
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
    
    try {
        // クエリパラメータの取得
        const params = event.queryStringParameters || {};
        console.log('Query parameters:', params);
        
        let responseData;
        
        // 既存のビジネスロジックをここに配置
        // 例：
        switch (params.type) {
            case 'exchange-rate':
                responseData = await getExchangeRate(params.base, params.target);
                break;
                
            case 'us-stock':
                responseData = await getUSStockData(params.symbols);
                break;
                
            case 'jp-stock':
                responseData = await getJPStockData(params.symbols);
                break;
                
            case 'mutual-fund':
                responseData = await getMutualFundData(params.symbols);
                break;
                
            default:
                throw new Error('Invalid type parameter: ' + params.type);
        }
        
        // 成功レスポンス（CORSヘッダー付き）
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(responseData)
        };
        
    } catch (error) {
        console.error('Error processing request:', error);
        
        // エラーレスポンス（CORSヘッダー付き）
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

// 既存の関数例（実際のコードに合わせて修正してください）
async function getExchangeRate(base, target) {
    // 既存の為替レート取得ロジック
    return {
        success: true,
        data: {
            [`${base}-${target}`]: {
                rate: 150.0,
                base: base,
                target: target,
                lastUpdated: new Date().toISOString()
            }
        }
    };
}

async function getUSStockData(symbols) {
    // 既存の米国株データ取得ロジック
    const symbolList = symbols ? symbols.split(',') : [];
    const data = {};
    
    for (const symbol of symbolList) {
        data[symbol] = {
            ticker: symbol,
            price: 150.00,
            currency: 'USD',
            lastUpdated: new Date().toISOString()
        };
    }
    
    return {
        success: true,
        data: data
    };
}

async function getJPStockData(symbols) {
    // 既存の日本株データ取得ロジック
    const symbolList = symbols ? symbols.split(',') : [];
    const data = {};
    
    for (const symbol of symbolList) {
        data[symbol] = {
            ticker: symbol,
            price: 2500,
            currency: 'JPY',
            lastUpdated: new Date().toISOString()
        };
    }
    
    return {
        success: true,
        data: data
    };
}

async function getMutualFundData(symbols) {
    // 既存の投資信託データ取得ロジック
    const symbolList = symbols ? symbols.split(',') : [];
    const data = {};
    
    for (const symbol of symbolList) {
        data[symbol] = {
            ticker: symbol,
            price: 10000,
            currency: 'JPY',
            lastUpdated: new Date().toISOString()
        };
    }
    
    return {
        success: true,
        data: data
    };
}
```

## Lambda関数の更新手順

### 1. AWSコンソールでの更新

1. **AWS Lambda**コンソールを開く
2. 対象の関数を選択
3. **コード**タブで上記のコードをコピー＆ペースト
4. **Deploy**ボタンをクリック

### 2. AWS CLIでの更新

```bash
# 1. コードをファイルに保存
cat > lambda-function.js << 'EOF'
// 上記のコードをここに貼り付け
EOF

# 2. ZIPファイルを作成
zip function.zip lambda-function.js

# 3. Lambda関数を更新
aws lambda update-function-code \
    --function-name YOUR_FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region us-west-2
```

## 重要なポイント

### 1. すべてのレスポンスにCORSヘッダーを付ける
```javascript
// 成功時
return {
    statusCode: 200,
    headers: corsHeaders,  // 必ず含める
    body: JSON.stringify(data)
};

// エラー時
return {
    statusCode: 500,
    headers: corsHeaders,  // 必ず含める
    body: JSON.stringify(error)
};
```

### 2. OPTIONSメソッドの処理を忘れない
```javascript
if (event.httpMethod === 'OPTIONS') {
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
    };
}
```

### 3. エラーハンドリングでもCORSヘッダーを返す
エラーレスポンスでもCORSヘッダーがないとブラウザがエラー内容を読めません。

## テスト方法

Lambda関数を更新後：

```bash
# 1. OPTIONSリクエストのテスト
curl -X OPTIONS -i \
    -H "Origin: http://localhost:3000" \
    https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data

# 2. 実際のリクエストのテスト
curl -i \
    -H "Origin: http://localhost:3000" \
    "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data?type=us-stock&symbols=AAPL"
```

レスポンスヘッダーに以下が含まれていることを確認：
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`

## これで解決すること

1. ブラウザからのアクセスが可能になる
2. プリフライトリクエストが正常に処理される
3. 開発環境から本番APIにアクセスできる