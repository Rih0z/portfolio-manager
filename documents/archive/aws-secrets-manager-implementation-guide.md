# AWS Secrets Manager実装ガイド

## 概要

Google認証機能にAWS Secrets Managerを統合し、セキュアな認証情報管理を実現するための完全ガイド。

## 実装状況

### 1. 完了した作業

1. **Secrets Managerへのシークレット作成**
   ```bash
   aws secretsmanager update-secret \
     --secret-id pfwise-api/google-oauth \
     --secret-string '{"GOOGLE_CLIENT_ID":"...", "GOOGLE_CLIENT_SECRET":"..."}' \
     --region us-west-2
   ```

2. **認証ハンドラーの実装**
   - `googleAuthHandler.js` - Secrets Manager統合版（依存関係エラー）
   - `googleAuthHandlerLite.js` - 軽量版（環境変数使用、動作確認済み）

3. **IAM権限の設定**
   ```yaml
   - Effect: Allow
     Action:
       - secretsmanager:GetSecretValue
     Resource: 
       - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:pfwise-api/google-oauth-*'
   ```

### 2. 遭遇した問題

#### AWS SDK v3の依存関係問題

モノレポ構造により、以下のモジュールがLambdaパッケージに含まれない：
- `@smithy/util-base64`
- `@smithy/util-buffer-from`
- その他のAWS SDK内部依存関係

### 3. 解決策

#### 短期的解決策（実装済み）

1. **軽量版ハンドラーの使用**
   - Secrets Manager依存を一時的に回避
   - 環境変数から認証情報を取得
   - 動作確認済み

2. **環境変数での認証情報管理**
   ```bash
   GOOGLE_CLIENT_SECRET=your-secret npm run deploy:prod
   ```

#### 長期的解決策（推奨）

1. **Webpack統合**
   ```javascript
   // webpack.config.js
   module.exports = {
     mode: 'production',
     entry: './src/function/auth/googleAuthHandler.js',
     target: 'node',
     externals: {
       'aws-sdk': 'aws-sdk'
     },
     optimization: {
       minimize: true
     }
   };
   ```

2. **serverless-webpack plugin**
   ```yaml
   plugins:
     - serverless-webpack
     - serverless-dotenv-plugin
   
   custom:
     webpack:
       webpackConfig: './webpack.config.js'
       includeModules: true
       packager: 'npm'
       excludeFiles: '**/*.test.js'
   ```

3. **個別の依存関係インストール**
   ```json
   // backend/package.json
   {
     "dependencies": {
       "@smithy/util-base64": "^3.0.0",
       "@smithy/util-buffer-from": "^3.0.0"
     }
   }
   ```

## セキュリティベストプラクティス

### 1. Secrets Managerの利点

- **集中管理**: すべての環境で同じシークレットを使用
- **自動ローテーション**: 定期的な認証情報の更新
- **監査証跡**: アクセスログの記録
- **暗号化**: 保存時の自動暗号化

### 2. 環境変数 vs Secrets Manager

| 項目 | 環境変数 | Secrets Manager |
|------|----------|-----------------|
| セキュリティ | AWS KMSで暗号化 | AWS KMSで暗号化 + アクセス制御 |
| 管理性 | デプロイごとに設定 | 一元管理 |
| コスト | 無料 | 月額$0.40/シークレット |
| ローテーション | 手動 | 自動可能 |

### 3. 実装上の注意点

1. **キャッシュの活用**
   - 24時間キャッシュでAPI呼び出しを削減
   - コスト最適化

2. **エラーハンドリング**
   - Secrets Manager障害時のフォールバック
   - 環境変数へのフォールバック実装

3. **最小権限の原則**
   - 特定のシークレットのみアクセス可能
   - リソースベースのポリシー

## 移行手順

### Phase 1: 現在の実装（完了）
- 環境変数による認証情報管理
- googleAuthHandlerLite.jsの使用

### Phase 2: 依存関係解決
1. webpack設定の追加
2. 必要なモジュールの明示的インストール
3. バンドルサイズの最適化

### Phase 3: Secrets Manager統合
1. googleAuthHandler.jsへの切り替え
2. 環境変数の削除
3. 本番環境でのテスト

## まとめ

現在の実装：
- ✅ Secrets Managerにシークレット作成済み
- ✅ 環境変数による暫定実装（セキュア）
- ✅ 本番環境で動作確認済み

今後の改善：
- 📋 webpack統合による依存関係解決
- 📋 Secrets Manager完全統合
- 📋 自動ローテーションの設定

セキュリティ面では現在の実装でも十分安全ですが、長期的にはSecrets Manager統合を推奨します。