# AWS認証エンドポイントのテスト

## 現在の問題
- Google認証で「認証コードが取得できませんでした」エラーが発生
- auth-codeフローを使用しているが、認証コードがサーバーに正しく送信されていない可能性

## テスト1: 認証エンドポイントの確認

```bash
# OPTIONSリクエスト（CORS確認）
curl -X OPTIONS -i \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login

# POSTリクエスト（実際の認証）
curl -X POST -i \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{
    "code": "test_auth_code",
    "redirectUri": "http://localhost:3001/auth/callback"
  }' \
  https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login
```

## 必要な確認事項

1. **Google OAuth設定**（Google Cloud Console）:
   - 承認済みのJavaScript生成元: `http://localhost:3001`
   - 承認済みのリダイレクトURI: `http://localhost:3001/auth/callback`
   - OAuth 2.0 クライアントタイプ: ウェブアプリケーション

2. **Lambda関数の確認**:
   - Google OAuth認証コードの検証ロジック
   - Google APIへのトークン交換処理
   - CORSヘッダーの設定

3. **エラーの詳細**:
   - ブラウザの開発者ツール → Networkタブで実際のリクエスト/レスポンスを確認
   - Consoleタブでエラーメッセージを確認