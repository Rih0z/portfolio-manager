# バックエンドCORS設定修正依頼

## 問題の概要
Google Drive連携機能を実装しましたが、以下のエンドポイントでCORSエラーが発生しています：
- `GET /auth/google/drive/initiate`

## エラー詳細
1. **現象**：
   - Google認証（`/auth/google/login`）は正常に動作（200 OK）
   - Drive API認証開始（`/auth/google/drive/initiate`）でNetwork Error発生
   - ブラウザコンソールでCORSエラーの兆候が確認される

2. **リクエスト情報**：
   ```
   URL: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate
   Method: GET
   Headers: 
     - Accept: application/json
     - X-Requested-With: XMLHttpRequest
   Credentials: withCredentials: true (Cookie認証使用)
   ```

## 必要な対応

### 1. API Gateway設定の確認・修正
`/auth/google/drive/initiate` エンドポイントに以下のCORSヘッダーを追加してください：

```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With
Access-Control-Allow-Credentials: true
```

### 2. OPTIONS メソッドの有効化
プリフライトリクエスト用にOPTIONSメソッドを有効化し、上記と同じCORSヘッダーを返すようにしてください。

### 3. Lambda関数のレスポンス確認
Lambda関数でも明示的にCORSヘッダーを返しているか確認してください：

```python
return {
    'statusCode': 200,
    'headers': {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    },
    'body': json.dumps(response_data)
}
```

## 参考情報
- `/auth/google/login` エンドポイントは正常に動作しているため、そちらの設定を参考にしてください
- Cookie認証を使用しているため、`Access-Control-Allow-Credentials: true` は必須です
- 本番環境では `Access-Control-Allow-Origin` を適切なドメインに変更してください

## 確認方法
修正後、以下のコマンドでCORS設定を確認できます：
```bash
curl -X OPTIONS https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

よろしくお願いいたします。