# E2E Testing Guide

## 概要

このプロジェクトでは、Playwrightを使用してクライアントとAWS環境の統合テストを自動化しています。

## テストカテゴリ

### 1. AWS統合テスト (`e2e/aws-integration.spec.js`)
- APIヘルスチェック
- マーケットデータAPI（株価、為替レート）
- レート制限
- エラーハンドリング
- CORS設定
- セッション管理

### 2. パフォーマンステスト (`e2e/performance.spec.js`)
- ページ読み込み速度
- Core Web Vitals（CLS、LCP、FID）
- API応答時間
- メモリ使用量
- バンドルサイズ
- ストレステスト

### 3. UI統合テスト
- 認証フロー
- ポートフォリオデータ操作
- リアルタイムデータ更新
- エラーシナリオ

## ローカル実行

### セットアップ
```bash
# 依存関係のインストール
npm install
npx playwright install

# 環境変数の設定
export REACT_APP_API_BASE_URL=https://your-api.amazonaws.com
```

### テスト実行
```bash
# すべてのテスト
npm run e2e

# AWS統合テストのみ
npm run e2e:aws

# パフォーマンステストのみ
npm run e2e:performance

# UIテストのみ
npm run e2e:ui

# デバッグモード（ブラウザ表示）
npm run e2e:debug

# テストレポートの表示
npm run e2e:report
```

### ヘッドレスモードとヘッドモード
```bash
# ヘッドレスモード（デフォルト）
./scripts/run-e2e-tests.sh all

# ヘッドモード（ブラウザ表示）
./scripts/run-e2e-tests.sh all headed
```

## CI/CD実行

GitHub Actionsで自動実行されます：
- プッシュ時（main、developブランチ）
- プルリクエスト時
- 毎日定期実行（JST 11:00）

### 必要なSecrets
- `REACT_APP_API_BASE_URL`: APIのベースURL
- `E2E_BASE_URL`: テスト対象のURL（オプション）
- `AWS_ACCESS_KEY_ID`: AWS認証用
- `AWS_SECRET_ACCESS_KEY`: AWS認証用
- `AWS_REGION`: AWSリージョン
- `PROD_API_BASE_URL`: 本番環境のAPI URL

## テストレポート

### 1. HTMLレポート
`e2e-report/index.html` - Playwrightの標準レポート

### 2. JUnitレポート
`e2e-results.xml` - CI/CD統合用

### 3. カスタムレポート
`e2e-report/aws-integration-report.html` - AWS統合テストの詳細レポート
- API呼び出しの統計
- パフォーマンスメトリクス
- エラー詳細

### 4. GitHub Actions Artifacts
- `playwright-report-{browser}`: 各ブラウザのレポート
- `screenshots-{browser}`: 失敗時のスクリーンショット
- `videos-{browser}`: 失敗時の動画
- `performance-results`: パフォーマンステスト結果
- `aws-integration-results`: AWS統合テスト結果

## トラブルシューティング

### よくある問題

1. **テストがタイムアウトする**
   ```bash
   # タイムアウトを延長
   npx playwright test --timeout=60000
   ```

2. **認証エラー**
   - 環境変数が正しく設定されているか確認
   - AWSの認証情報が有効か確認

3. **ブラウザが起動しない**
   ```bash
   # ブラウザを再インストール
   npx playwright install --force
   ```

### デバッグ方法

1. **インタラクティブデバッグ**
   ```bash
   PWDEBUG=1 npx playwright test
   ```

2. **特定のテストのみ実行**
   ```bash
   npx playwright test -g "API health check"
   ```

3. **詳細ログ**
   ```bash
   DEBUG=pw:api npx playwright test
   ```

## ベストプラクティス

1. **テストの独立性**
   - 各テストは独立して実行可能にする
   - テスト間の依存関係を避ける

2. **待機戦略**
   - 固定待機時間ではなく、要素の表示を待つ
   - `waitForSelector`、`waitForResponse`を使用

3. **セレクタ**
   - data-testid属性を優先的に使用
   - テキストベースのセレクタは最小限に

4. **エラーハンドリング**
   - すべてのテストでエラーケースを考慮
   - スクリーンショットとビデオで失敗を記録

5. **パフォーマンス**
   - 並列実行を活用
   - 不要な待機を避ける

## 拡張方法

### 新しいテストの追加
1. `e2e/`ディレクトリに`.spec.js`ファイルを作成
2. 必要に応じてヘルパー関数を追加
3. CI設定を更新（必要な場合）

### カスタムレポーターの追加
1. `e2e/reporter/`にレポーターを作成
2. `playwright.config.js`に追加

### 新しい環境の追加
1. 環境変数を定義
2. GitHub Secretsに追加
3. テストで環境変数を使用