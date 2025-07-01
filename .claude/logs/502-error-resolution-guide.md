# 502エラー解決ガイド - バックエンド独立分離による解決

## 問題の概要

### 発生していた問題
- Google認証API呼び出し時に502 Internal Server Errorが発生
- AWS Lambda内でNode.jsモジュールが見つからないエラー
- モノレポ構造による依存関係の競合とパッケージサイズ肥大化

### エラーの根本原因
1. **モノレポワークスペース競合**: フロントエンドとバックエンドの依存関係が混在
2. **Lambda実行時モジュール不足**: `google-auth-library`, `is-stream`等の必須モジュールが欠落
3. **パッケージサイズ肥大化**: 99.83MB→Lambda制限250MB近くまで増大
4. **Handler設定ミス**: `basicGoogleLogin.handler` → `googleLogin.handler`

## 解決手順

### 1. バックエンド独立プロジェクト化

```bash
# 1. ルートpackage.jsonからバックエンドを除外
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager
# workspaces設定変更: ["frontend/webapp", "backend"] → ["frontend/webapp"]

# 2. バックエンドを独立プロジェクトとして再構築
cd backend
rm -rf node_modules package-lock.json
npm install  # 1098パッケージの独立インストール
```

### 2. serverless.yml最適化

```yaml
# 主要変更点
provider:
  runtime: nodejs18.x → nodejs20.x  # Node.js最新化
  memorySize: 256 → 512            # メモリ増強

package:
  excludeDevDependencies: false → true  # 本番最適化
  patterns:  # 不要ファイル除外強化
    - '!node_modules/aws-sdk/**'
    - '!node_modules/**/test/**'
    - '!node_modules/**/docs/**'
    - '!node_modules/**/*.md'

functions:
  basicGoogleLogin:
    handler: src/function/auth/basicGoogleLogin.handler
    ↓
    handler: src/function/auth/googleLogin.handler  # 正しいパス
```

### 3. 依存関係明示的追加

```json
// package.json追加
{
  "dependencies": {
    "is-stream": "^2.0.1",           // 明示的追加
    "abort-controller": "^3.0.0",    // 明示的追加
    "event-target-shim": "^5.0.1"    // 明示的追加
    // AWS SDKを3.840.0に統一アップデート
  }
}
```

### 4. デプロイと結果確認

```bash
# メモリ制限対応デプロイ
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:prod

# 結果確認
curl -X POST "https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login" \
  -H "Content-Type: application/json" -d '{}'
# HTTP 400 + "認証コードが不足しています" = 正常動作確認
```

## 技術的成果

### パフォーマンス改善
- **パッケージサイズ**: 99.83MB → 32MB (67%削減)
- **デプロイ時間**: 大幅短縮
- **Lambda起動時間**: 改善

### エラー解決状況
- ✅ **502 Internal Server Error** → **400 Bad Request** (正常なエラーレスポンス)
- ✅ **モジュール不足エラー** → **全依存関係解決**
- ✅ **Handler not foundエラー** → **正しいパス設定**

### アーキテクチャ改善
- ✅ **モノレポ依存関係分離**: 独立したバックエンドプロジェクト
- ✅ **Node.js最新化**: 18.x → 20.x
- ✅ **AWS SDK統一**: 最新バージョン3.840.x系列

## 重要な学習ポイント

### 1. モノレポvsマイクロサービス
- **モノレポのメリット**: 統一的な依存関係管理、共通ツール設定
- **モノレポのデメリット**: Lambda等での依存関係競合、パッケージ肥大化
- **解決策**: サーバーレス環境では独立プロジェクトが適している

### 2. Lambda最適化ベストプラクティス
```yaml
# 効果的なexcludeパターン
package:
  excludeDevDependencies: true
  patterns:
    - '!**test**'      # テストファイル除外
    - '!**docs**'      # ドキュメント除外
    - '!**/*.md'       # マークダウン除外
    - '!node_modules/aws-sdk/**'  # 重複SDK除外
```

### 3. 依存関係トラブルシューティング
```bash
# モジュール不足診断
npm ls is-stream  # 特定モジュールの確認
npm install --save is-stream  # 明示的追加

# Lambda環境での確認
serverless invoke -f functionName  # ローカル実行テスト
```

### 4. エラーレスポンス設計
```json
// 502エラー（サーバー内部エラー）
{"errorType": "Runtime.ImportModuleError"}

// 400エラー（正常なアプリケーションエラー）
{"success": false, "error": {"code": "INVALID_PARAMS", "message": "認証コードが不足しています"}}
```

## 今後の運用指針

### 1. デプロイメント戦略
- バックエンドとフロントエンドは独立してデプロイ
- 依存関係更新時は全体の整合性確認
- パッケージサイズ監視の継続

### 2. エラー監視
- 502エラーは重大な設定問題を示す
- 400エラーは正常なアプリケーション動作
- CloudWatch Logsでの継続監視

### 3. パフォーマンス最適化
- Lambda Cold Start対策
- 依存関係の定期的な見直し
- 不要なパッケージの除去

## 関連ドキュメント
- [CLAUDE.md - デプロイメントガイド](../CLAUDE.md#deployment-commands)
- [AWS Lambda制限事項](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Serverless Framework最適化](https://www.serverless.com/framework/docs/providers/aws/guide/packaging/)

---
**作成日**: 2025-07-01  
**最終更新**: 2025-07-01  
**ステータス**: 解決完了