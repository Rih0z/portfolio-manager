# テスト結果ログ

以下は `npm run test:full:mock` と `npm test` を実行した際の出力例です。

## 2025/05/26 テスト実行結果（最新）

実行日時: 2025/5/26
合計時間: 20.6秒

### サマリー
- 合計テスト数: 579
- 成功: 562
- 失敗: 17
- スキップ: 0
- 失敗したテストスイート: 4

### カバレッジ
| メトリクス     | カバード | 合計 | パーセント |
|--------------|------:|-----:|--------:|
| ステートメント | 2602 | 3548 | 73.33% |
| ブランチ      | 1152 | 1869 | 61.63% |
| 関数         | 327 | 406 | 80.54% |
| 行           | 2531 | 3450 | 73.36% |

### 主な変更点
- APIキー認証システムの実装
- IP制限とレート制限の追加
- Google One Tap認証のサポート追加
- AWS Secrets Manager統合
- セキュリティミドルウェアの追加

### 残っている問題
- カバレッジ閾値を満たしていないファイル（特にrateLimitService.js）
- 一部のタイマー関連テストの失敗

## 2025/05/22 テスト実行結果

実行日時: 2025/5/22 16:30:22
合計時間: 5.01秒

### サマリー
- 合計テスト数: 495
- 成功: 495
- 失敗: 0
- スキップ: 0

### カバレッジ
| メトリクス     | カバード | 合計 | パーセント |
|--------------|------:|-----:|--------:|
| ステートメント | 2500 | 3307 | 75.60% |
| ブランチ      | 1106 | 1722 | 64.23% |
| 関数         | 311 | 368 | 84.51% |
| 行           | 2421 | 3205 | 75.54% |

## 2025/05/21 テスト実行結果

実行日時: 2025/5/21 18:44:32
合計時間: 4.18秒

### サマリー
- 合計テスト数: 323
- 成功: 323
- 失敗: 0
- スキップ: 0

### カバレッジ
| メトリクス | カバード | 合計 | パーセント |
|--------------|------:|-----:|--------:|
| ステートメント | 3259 | 3259 | 100% |
| ブランチ      | 1712 | 1712 | 100% |
| 関数         | 359 | 359 | 100% |
| 行           | 3160 | 3160 | 100% |

### カバレッジ目標ステータス (initial)
| メトリクス | 現在 | 目標 | ステータス |
|--------------|-------:|-------:|----------|
| ステートメント | 100% | 30% | ✅ 達成 |
| ブランチ      | 100% | 20% | ✅ 達成 |
| 関数         | 100% | 25% | ✅ 達成 |
| 行           | 100% | 30% | ✅ 達成 |

### ファイルごとのカバレッジ

| ファイル | ステートメント | ブランチ | 関数 | 行 |
|---------|------------:|-------:|-----:|----:|
| src/config/constants.js | 100.00% | 0.00% | 0.00% | 100.00% |
| src/config/envConfig.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/function/admin/getBudgetStatus.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/function/admin/getStatus.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/function/admin/manageFallbacks.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/function/admin/resetUsage.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/function/auth/getSession.js | 83.72% | 78.79% | 100.00% | 83.72% |
| src/function/auth/googleLogin.js | 84.62% | 56.25% | 100.00% | 84.62% |
| src/function/auth/logout.js | 79.59% | 78.95% | 100.00% | 79.59% |
| src/function/drive/fileVersions.js | 86.96% | 72.73% | 100.00% | 86.67% |
| src/function/drive/listFiles.js | 97.06% | 62.50% | 100.00% | 100.00% |
| src/function/drive/loadFile.js | 100.00% | 90.00% | 100.00% | 100.00% |
| src/function/drive/saveFile.js | 100.00% | 89.47% | 100.00% | 100.00% |
| src/function/marketData.js | 9.38% | 0.00% | 0.00% | 9.41% |
| src/function/preWarmCache.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/services/alerts.js | 75.68% | 20.00% | 80.00% | 75.68% |
| src/services/cache.js | 74.07% | 76.47% | 78.57% | 73.33% |
| src/services/fallbackDataStore.js | 59.07% | 52.14% | 76.19% | 59.06% |
| src/services/googleAuthService.js | 93.24% | 79.17% | 100.00% | 94.52% |
| src/services/googleDriveService.js | 77.40% | 90.48% | 87.10% | 76.34% |
| src/services/matrics.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/services/portfolioService.js | 100.00% | 89.36% | 100.00% | 100.00% |
| src/services/sources/enhancedMarketDataService.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/services/sources/exchangeRate.js | 50.39% | 42.42% | 87.50% | 50.39% |
| src/services/sources/fundDataService.js | 82.79% | 64.81% | 92.86% | 82.91% |
| src/services/sources/marketDataProviders.js | 0.00% | 0.00% | 0.00% | 0.00% |
| src/services/sources/yahooFinance.js | 77.61% | 60.00% | 87.50% | 78.13% |
| src/services/usage.js | 100.00% | 100.00% | 100.00% | 100.00% |
| src/utils/awsConfig.js | 32.20% | 6.06% | 9.09% | 31.03% |
| src/utils/budgetCheck.js | 41.11% | 35.90% | 33.33% | 41.57% |
| src/utils/configManager.js | 90.48% | 78.95% | 100.00% | 100.00% |
| src/utils/cookieParser.js | 83.05% | 75.93% | 100.00% | 83.93% |
| src/utils/dataFetchUtils.js | 43.48% | 0.00% | 25.00% | 43.48% |
| src/utils/dataFetchWithFallback.js | 83.53% | 76.19% | 100.00% | 82.93% |
| src/utils/dataValidation.js | 86.59% | 72.92% | 100.00% | 87.01% |
| src/utils/deprecation.js | 90.00% | 16.67% | 100.00% | 90.00% |
| src/utils/dynamoDbService.js | 23.40% | 17.86% | 6.25% | 23.66% |
| src/utils/errorHandler.js | 93.33% | 77.55% | 100.00% | 93.33% |
| src/utils/logger.js | 97.56% | 81.25% | 100.00% | 97.50% |
| src/utils/responseUtils.js | 81.97% | 69.49% | 83.33% | 81.97% |
| src/utils/retry.js | 59.38% | 67.74% | 33.33% | 66.67% |
| src/utils/scrapingBlacklist.js | 13.48% | 29.63% | 0.00% | 13.48% |
| src/utils/tokenManager.js | 80.00% | 65.00% | 50.00% | 80.00% |
## `npm run test:full:mock`

```
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> pfwise-api@1.0.0 test:full:mock
> npm run test:reset && npm run test:setup && cross-env USE_API_MOCKS=true npm run test

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> pfwise-api@1.0.0 test:reset
> rm -rf ./test-results && mkdir -p ./test-results

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> pfwise-api@1.0.0 test:setup
> node scripts/setup-test-env.js

[WARNING] @aws-sdk/client-dynamodb が見つかりません。DynamoDB 関連の処理をスキップします
[INFO] テスト環境のセットアップを開始します...
=====================================
[STEP] テストディレクトリを作成しています...
[INFO] ディレクトリは既に存在します: ./test-results
[SUCCESS] ディレクトリを作成しました: ./test-results/junit
[INFO] ディレクトリは既に存在します: ./coverage
[INFO] ディレクトリは既に存在します: ./.jest-cache
[STEP] モックセットアップファイルを確認しています...
[SUCCESS] モックファイルの確認が完了しました
[STEP] テスト環境変数を設定しています...
[INFO] .env.test ファイルが見つかりました
[SUCCESS] 環境変数の設定が完了しました
[STEP] DynamoDB Local の確認・起動...
[WARNING] SKIP_DYNAMODB_CHECKS=true のため DynamoDB Local の起動をスキップします
[STEP] テスト実行前の準備...
[SUCCESS] テスト実行前の準備が完了しました
=====================================
[WARNING] DynamoDBの起動に問題があります。モックモードでテストを実行してください:
[INFO]   USE_API_MOCKS=true npm test
sh: 1: cross-env: not found
```

## `npm test`

```
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> pfwise-api@1.0.0 test
> jest --forceExit

sh: 1: jest: not found
```
