# バックエンドAPI設定ガイド

提供されたバックエンドAPI（`https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com`）への接続テストを実施した結果、すべてのエンドポイントで403 Forbiddenエラーが発生しています。

## 現在の状況

### 試行したエンドポイント:
- `/prod/health`
- `/prod/api/exchange-rate`
- `/prod/api/us-stock`
- `/prod/api/jp-stock`
- `/test/*` (同様のパス)
- ステージなしの直接アクセス

すべて403エラーが返されています。

## 考えられる原因

1. **APIキー認証が必要**
   - AWS API GatewayでAPIキー認証が有効になっている可能性
   - ヘッダーに `x-api-key` を含める必要があるかもしれません

2. **CORS設定**
   - 特定のOriginからのアクセスのみ許可されている可能性
   - localhost:3000からのアクセスが拒否されている

3. **IP制限**
   - 特定のIPアドレスからのアクセスのみ許可されている可能性

4. **認証トークン**
   - Bearer tokenやカスタム認証ヘッダーが必要な可能性

## 推奨される対応

### 1. APIキーが必要な場合
```javascript
// .env.test に追加
REACT_APP_API_KEY=your-api-key-here

// リクエストヘッダーに追加
headers: {
  'x-api-key': process.env.REACT_APP_API_KEY
}
```

### 2. 現在の回避策
テスト環境では`USE_API_MOCKS=true`に設定し、MSW（Mock Service Worker）を使用してAPIをモックしています。これにより：
- テストは正常に実行可能
- 開発中はモックデータで動作確認が可能
- 本番環境では実際のAPIを使用

## 次のステップ

バックエンドAPIを正しく使用するために、以下の情報が必要です：

1. **認証方法**（APIキー、Bearer token、など）
2. **必要なリクエストヘッダー**
3. **正しいエンドポイントパス**
4. **CORS設定の詳細**

これらの情報を取得後、適切な設定を行うことで、実際のバックエンドAPIを使用できるようになります。