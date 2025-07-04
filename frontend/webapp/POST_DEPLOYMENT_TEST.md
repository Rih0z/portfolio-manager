# 本番環境 Google認証修正後の動作確認手順

## デプロイ情報
- **修正日時**: 2025-07-01
- **デプロイ先**: https://portfolio-wise.com/
- **プレビューURL**: https://c9d1f753.pfwise-portfolio-manager.pages.dev

## 修正内容
Google認証が失敗する問題を修正しました：
- 全ての認証エンドポイントをプロキシ経由（/api-proxy/）に統一
- CORS問題を回避
- デバッグログを強化

## 動作確認手順

### 1. 本番環境でのGoogle認証テスト
1. https://portfolio-wise.com/ にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Google認証画面が表示されることを確認
4. 正常にログイン完了することを確認

### 2. エラー確認（問題がある場合）
問題がある場合は、以下の手順でエラーを確認：

1. **開発者ツールを開く**
   - Chromeの場合: F12キー
   - Safariの場合: ⌘+⌥+I

2. **ネットワークタブで確認**
   - 「ネットワーク」タブを選択
   - 「Googleでログイン」をクリック
   - `/api-proxy/auth/google/login` リクエストを確認
   - ステータスコードとレスポンス内容を確認

3. **コンソールタブで確認**
   - 「コンソール」タブを選択
   - エラーメッセージを確認
   - 「認証エラー詳細:」で始まるログを確認

### 3. プロキシ動作確認
正常に動作している場合、以下のログが確認できるはずです：
```
ログインエンドポイント: /api-proxy/auth/google/login
環境: {isProduction: true, isDevelopment: false, hostname: "portfolio-wise.com"}
```

### 4. Cloudflare Pages Functions確認
プロキシが正常に動作していることを確認：
- `/api-proxy/auth/google/login` リクエストが404エラーにならない
- バックエンドAPI（AWS Lambda）への転送が成功している

## 想定される問題と対処法

### 問題1: プロキシが動作しない（404エラー）
**対処法**: Cloudflare Pages Functions が正しくデプロイされているか確認
```bash
# 再デプロイ
wrangler pages deploy build --project-name=pfwise-portfolio-manager
```

### 問題2: バックエンドへの転送が失敗（500エラー）
**対処法**: 
1. バックエンドAPI（AWS Lambda）が正常に動作しているか確認
2. CORS設定がCloudflare Pagesドメインを許可しているか確認

### 問題3: Google認証画面が表示されない
**対処法**: 
1. Google OAuth設定でリダイレクトURIが正しく設定されているか確認
2. Google Client IDが正しく設定されているか確認

## 成功判定基準
- ✅ Google認証画面が正常に表示される
- ✅ 認証後にダッシュボードが表示される
- ✅ コンソールエラーが発生しない
- ✅ ネットワークエラー（CORS、404、500）が発生しない

## 問題報告
問題が発生した場合は、以下の情報を含めて報告してください：
1. 使用ブラウザとバージョン
2. エラーメッセージ（コンソールログ）
3. ネットワークタブのリクエスト/レスポンス詳細
4. 再現手順

## 追加確認事項
- セッション維持が正常に動作すること
- ログアウト機能が正常に動作すること
- Google Drive連携（ある場合）が正常に動作すること