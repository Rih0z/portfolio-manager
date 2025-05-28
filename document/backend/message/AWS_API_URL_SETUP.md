# AWS API URL 設定ガイド

## 概要
Portfolio ManagerアプリケーションがAWSのAPIサーバーと通信するために、環境変数`REACT_APP_API_BASE_URL`を設定する必要があります。

## セキュリティ上の注意
- **重要**: 実際のAWS API URLは公開リポジトリにコミットしないでください
- `.env`ファイルは`.gitignore`に含まれているため、誤ってコミットされることはありません
- 本番環境では、ホスティングプラットフォーム（Netlify、Vercel等）の環境変数設定を使用してください

## ローカル開発環境での設定

1. `.env.development`ファイルを作成（または編集）:
   ```bash
   cp .env.example .env.development
   ```

2. `.env.development`ファイルを編集し、AWS API URLを設定:
   ```env
   REACT_APP_API_BASE_URL=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com
   ```

3. `.env.production`ファイルも同様に設定:
   ```bash
   cp .env.example .env.production
   # ファイルを編集してREACT_APP_API_BASE_URLを設定
   ```

## 本番環境での設定

### Netlifyの場合
1. Netlifyダッシュボードにログイン
2. Site settings → Environment variables
3. 以下の環境変数を追加:
   - Key: `REACT_APP_API_BASE_URL`
   - Value: `https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com`

### Vercelの場合
1. Vercelダッシュボードにログイン
2. Project Settings → Environment Variables
3. 環境変数を追加（Production、Preview、Development環境ごとに設定可能）

## 動作確認

アプリケーションが正しくAWS APIと通信できているか確認:

1. 開発サーバーを起動:
   ```bash
   npm start
   ```

2. ブラウザの開発者ツールでネットワークタブを確認
3. APIリクエストが指定したURLに送信されていることを確認

## トラブルシューティング

### API URLが反映されない場合
1. 開発サーバーを再起動
2. `.env`ファイルの変数名が正確に`REACT_APP_API_BASE_URL`であることを確認
3. ブラウザのキャッシュをクリア

### CORSエラーが発生する場合
AWS API側でCORSが正しく設定されているか確認してください。
詳細は`CORS_AND_COOKIE_FIX_REQUEST.md`を参照。

## 関連ファイル
- `/src/services/configService.js` - API設定を管理するサービス
- `.env.example` - 環境変数のテンプレート
- `.gitignore` - 環境ファイルを除外する設定