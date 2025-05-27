# AWS API Gateway CORS設定ガイド

## 現在の状況

curlコマンドでは正常にアクセスできますが、ブラウザからのアクセスで403エラーが発生しています。これはCORS（Cross-Origin Resource Sharing）の設定が原因です。

現在のレスポンスヘッダー:
```
access-control-allow-origin: *
access-control-allow-credentials: true
```

## AWS API Gatewayで必要な設定

### 1. API GatewayコンソールでCORSを有効化

1. **AWSコンソール**にログイン
2. **API Gateway**サービスを開く
3. 対象のAPI（`x4scpbsuv2`）を選択
4. **リソース**セクションで各エンドポイントを選択

### 2. 各エンドポイントにCORS設定を追加

各リソース（`/dev/api/market-data`など）に対して：

1. **アクション** → **CORSの有効化**を選択
2. 以下の設定を適用：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,OPTIONS
```

### 3. OPTIONSメソッドの追加

ブラウザはCORSプリフライトリクエストでOPTIONSメソッドを送信します：

1. 各リソースに**OPTIONSメソッド**を追加
2. **統合タイプ**: Mock
3. **メソッドレスポンス**で200を返すように設定
4. **統合レスポンス**でCORSヘッダーを追加：

```json
{
  "statusCode": 200,
  "responseParameters": {
    "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods": "'GET,POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin": "'*'"
  }
}
```

### 4. APIをデプロイ

1. **アクション** → **APIのデプロイ**
2. **デプロイメントステージ**: dev
3. **デプロイ**をクリック

## 代替案: Lambda関数でCORSヘッダーを追加

Lambda関数のレスポンスに直接CORSヘッダーを追加する方法：

```javascript
exports.handler = async (event) => {
    // 既存の処理...
    
    const response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        body: JSON.stringify(result)
    };
    
    return response;
};
```

## 確認方法

設定後、以下のコマンドで確認：

```bash
# OPTIONSリクエストのテスト
curl -X OPTIONS -i "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"
```

正常な場合、以下のようなレスポンスが返ります：
```
HTTP/2 200
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
```