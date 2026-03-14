# Portfolio Market Data API - テスト計画書

## 1. 現在のテスト実装状況

現在のテストカバレッジは100%近くまで向上しました。フェーズ1のタスクが完了し、現在フェーズ2に移行しています。下記に実装済みのテストファイルを示します。

### 単体テスト (Unit Tests)

#### 認証関連 (Auth)
- `__tests__/unit/function/auth/getSession.test.js`
- `__tests__/unit/function/auth/logout.test.js`
- `__tests__/unit/services/googleAuthService.test.js`
- `__tests__/unit/utils/tokenManager.test.js`

#### ドライブ関連 (Drive)
- `__tests__/unit/function/drive/fileVersions.test.js`
- `__tests__/unit/function/drive/listFiles.test.js`
- `__tests__/unit/function/drive/saveFile.test.js` // 実装済み
- `__tests__/unit/function/drive/loadFile.test.js` // 実装済み
- `__tests__/unit/services/googleDriveService.test.js`

#### ポートフォリオ関連
- `__tests__/unit/services/portfolioService.test.js`

#### データソース関連 (Data Sources)
- `__tests__/unit/services/sources/exchangeRate.test.js`
- `__tests__/unit/services/sources/fundDataService.test.js`
- `__tests__/unit/services/sources/yahooFinance.test.js`

#### マーケットデータ関連
- `__tests__/unit/function/marketData.test.js` // 実装済み
- `__tests__/unit/function/marketData.internal.test.js` // 内部関数テスト追加

#### キャッシュとフォールバックデータ関連
- `__tests__/unit/services/cache.test.js`
- `__tests__/unit/services/fallbackDataStore.test.js` // 更新済み
- `__tests__/unit/services/usage.test.js` // 新規実装済み

#### アラート・メトリクス関連
- `__tests__/unit/services/alerts.test.js` // 新規実装
- `__tests__/unit/services/matrics.test.js` // 新規実装
- `__tests__/unit/services/matrics.utils.test.js` // slugifyとnormalizePriorityKeysのテスト

#### ユーティリティ関連 (Utils)
- `__tests__/unit/utils/cookieParser.test.js`
- `__tests__/unit/utils/responseUtils.test.js` 
- `__tests__/unit/utils/errorHandler.test.js` // 実装済み
- `__tests__/unit/utils/logger.test.js` // 実装済み
- `__tests__/unit/utils/cors.test.js` // 実装済み
- `__tests__/unit/utils/configManager.test.js` // 実装済み
- `__tests__/unit/utils/dataFetchWithFallback.test.js` // 新規実装
- `__tests__/unit/utils/budgetCheck.test.js` // 新規実装

#### スクリプト関連
- `__tests__/unit/scripts/runTestsScript.test.js`
- `__tests__/unit/scripts/runTestsAllScript.test.js`
- `__tests__/unit/scripts/runTestsAllScript.extra.test.js` // 新規実装
- `__tests__/unit/scripts/runTestsAllScript.coverage.test.js` // 追加テスト
- `__tests__/unit/scripts/runTestsAllScript.forceVerbose.test.js` // --force-coverageと--verbose-coverageオプションのテスト
- `__tests__/unit/scripts/runTestsAllScript.misc.test.js` // --html-coverageや--visual等の追加オプションテスト
- `__tests__/unit/scripts/generateCoverageChart.test.js`
- `__tests__/unit/customReporter.test.js`

### 統合テスト (Integration Tests)

#### 認証関連 (Auth)
- `__tests__/integration/auth/googleLogin.test.js`
- `__tests__/integration/auth/authFlow.test.js`

#### 市場データ関連 (Market Data)
- `__tests__/integration/marketData/dataFetching.test.js`

### E2Eテスト (End-to-End Tests)
- `__tests__/e2e/API_test.js`
- `__tests__/e2e/errorResponses.test.js`
- `__tests__/e2e/complexDataScenarios.test.js`

## 2. テスト実装が必要な領域

既存のファイル構造と実行結果から、以下の領域についてテストが必要です。

### ミドルウェア (Middleware)

```javascript
// __tests__/unit/middleware/errorHandler.test.js - 未実装
describe('エラーハンドリングミドルウェア', () => {
  test('一般的なエラーを正しく処理する', () => {/* ... */});
  test('バリデーションエラーを正しく処理する', () => {/* ... */});
  test('認証エラーを正しく処理する', () => {/* ... */});
  test('レート制限エラーを正しく処理する', () => {/* ... */});
});
```

### API エンドポイント (Functions)

#### 市場データ関連
```javascript
// __tests__/unit/function/marketData.test.js - 実装済み
describe('市場データ取得エンドポイント', () => {
  test('正常系：米国株データを取得して返す', () => {/* ... */});
  test('正常系：日本株データを取得して返す', () => {/* ... */});
  test('正常系：為替レートデータを取得して返す', () => {/* ... */});
  test('異常系：無効なマーケットタイプの場合はエラーを返す', () => {/* ... */});
  test('異常系：APIの呼び出し制限を超えた場合はレート制限エラーを返す', () => {/* ... */});
});
```

#### ポートフォリオ関連
```javascript
// ポートフォリオ関連のテストはDrive APIを通じて実装
// __tests__/unit/function/drive/saveFile.test.js - 実装済み
// __tests__/unit/function/drive/loadFile.test.js - 実装済み
```

### データサービス (Services)

#### データ変換サービス
```javascript
// __tests__/unit/services/dataTransformerService.test.js
describe('データ変換サービス', () => {
  test('ポートフォリオデータを正しくクライアント用フォーマットに変換する', () => {/* ... */});
  test('市場データを正しくクライアント用フォーマットに変換する', () => {/* ... */});
  test('履歴データを正しく時系列フォーマットに変換する', () => {/* ... */});
});
```

#### 日本株データサービス
```javascript
// __tests__/unit/services/sources/japanStockService.test.js
describe('日本株データサービス', () => {
  test('単一銘柄コードのデータを取得する', () => {/* ... */});
  test('複数銘柄コードのデータを一括取得する', () => {/* ... */});
  test('スクレイピングエラーが発生した場合の処理', () => {/* ... */});
  test('データキャッシュが正しく機能する', () => {/* ... */});
});
```

#### 暗号資産データサービス
```javascript
// __tests__/unit/services/sources/cryptoDataService.test.js
describe('暗号資産データサービス', () => {
  test('単一通貨のデータを取得する', () => {/* ... */});
  test('複数通貨のデータを一括取得する', () => {/* ... */});
  test('APIエラーが発生した場合のフォールバック処理', () => {/* ... */});
  test('過去データを正しく取得する', () => {/* ... */});
});
```

### ユーザー管理 (User Management)

```javascript
// __tests__/unit/services/userService.test.js
describe('ユーザーサービス', () => {
  test('新規ユーザーを作成する', () => {/* ... */});
  test('ユーザー情報を取得する', () => {/* ... */});
  test('ユーザー設定を更新する', () => {/* ... */});
  test('ユーザーアカウントを削除する', () => {/* ... */});
  test('ユーザーの利用統計を取得する', () => {/* ... */});
});

// __tests__/unit/function/user/updateUserSettings.test.js
describe('ユーザー設定更新エンドポイント', () => {
  test('正常系：ユーザー設定を更新して保存する', () => {/* ... */});
  test('異常系：無効な設定データの場合はエラーを返す', () => {/* ... */});
  test('異常系：認証がない場合はエラーを返す', () => {/* ... */});
});

// __tests__/unit/function/user/getUserProfile.test.js
describe('ユーザープロフィール取得エンドポイント', () => {
  test('正常系：認証されたユーザーのプロフィールを取得する', () => {/* ... */});
  test('異常系：認証がない場合はエラーを返す', () => {/* ... */});
});
```

### 設定管理 (Configuration)

```javascript
// __tests__/unit/utils/configManager.test.js - 実装済み
describe('設定管理ユーティリティ', () => {
  test('環境変数から設定値を正しく読み込む', () => {/* ... */});
  test('デフォルト値が適用される', () => {/* ... */});
  test('環境に応じた設定値が適用される', () => {/* ... */});
  test('機密情報が適切に処理される', () => {/* ... */});
});
```

### バリデーション (Validation)

```javascript
// __tests__/unit/utils/schemaValidator.test.js
describe('スキーマバリデーションユーティリティ', () => {
  test('有効なポートフォリオデータを検証する', () => {/* ... */});
  test('無効なポートフォリオデータを検出する', () => {/* ... */});
  test('有効なユーザー設定を検証する', () => {/* ... */});
  test('無効なユーザー設定を検出する', () => {/* ... */});
});
```

## 3. 統合テスト・E2Eテストの拡充

### 統合テスト (Integration Tests)

```javascript
// __tests__/integration/marketData/portfolioUpdates.test.js
describe('ポートフォリオ更新の統合テスト', () => {
  test('市場データの更新がポートフォリオ評価額に反映される', () => {/* ... */});
  test('過去のスナップショットとの比較', () => {/* ... */});
});
```

### E2Eテスト (End-to-End Tests)

```javascript
// __tests__/e2e/portfolioLifecycle.test.js
describe('ポートフォリオのライフサイクルテスト', () => {
  test('ポートフォリオの作成、分析、更新、削除の一連のフロー', () => {/* ... */});
  test('複数のデバイスからのポートフォリオアクセスと同期', () => {/* ... */});
});

// __tests__/e2e/userExperience.test.js
describe('ユーザー体験テスト', () => {
  test('初回ユーザー登録からポートフォリオ作成までのフロー', () => {/* ... */});
  test('市場データの更新とポートフォリオ評価の自動更新', () => {/* ... */});
  test('大規模ポートフォリオのパフォーマンス検証', () => {/* ... */});
});
```

## 4. 優先順位とアプローチ

### 優先順位

1. **高優先度**:
   - ✅ ミドルウェアテスト（ロギング）- 実装済み
   - ✅ ミドルウェアテスト（CORS）- 実装済み（`__tests__/unit/utils/cors.test.js`）
   - ✅ エラーハンドリングユーティリティ（`errorHandler.test.js`として実装済み）
   - ✅ 市場データ取得エンドポイント（`marketData.test.js`として実装済み）
   - ✅ ポートフォリオ関連エンドポイント（`saveFile.test.js`、`loadFile.test.js`として実装済み）
   - ✅ フォールバックデータサービス（`fallbackDataStore.test.js`として更新済み）
   - ✅ 非推奨プロキシモジュール（`usage.test.js`として実装済み）
   - ✅ アラートサービス（`alerts.test.js`として実装済み）
   - ✅ メトリクスサービス（`matrics.test.js`として実装済み）

2. **中優先度**:
   - ユーザー管理関連のテスト（`userService.test.js`、`updateUserSettings.test.js`）
   - データ変換サービスのテスト（`dataTransformerService.test.js`）
   - 外部APIインテグレーション（`japanStockService.test.js`、`cryptoDataService.test.js`）

3. **低優先度**:
   - 設定管理のテスト（`configManager.test.js`）
   - バリデーションユーティリティのテスト（`schemaValidator.test.js`）
   - 追加の統合テスト・E2Eテスト

### 実装アプローチ

1. **単体テスト**:
   - 各モジュールの機能を独立してテスト
   - 外部依存はモックを使用して切り離す
   - 境界条件とエラーケースを重点的にテスト

2. **統合テスト**:
   - 実際のモジュール間の連携をテスト
   - LocalStackを使用したAWSサービスのテスト
   - Googleサービス（Drive、Auth）とのインテグレーション

3. **E2Eテスト**:
   - 実際のAPIエンドポイントを呼び出して全体フローをテスト
   - 実環境に近い条件での動作確認

## 5. テスト実装のためのベストプラクティス

1. **テスト粒度**:
   - 単体テスト：関数やメソッドの個別の挙動
   - 統合テスト：複数のコンポーネントが連携する処理
   - E2Eテスト：ユーザーが体験する一連のフロー

2. **モックの活用**:
   - 外部APIは常にモック化してテストの安定性を確保
   - LocalStackを使用したAWSサービスのテスト
   - Googleサービス（Drive、Auth）のモック化

3. **テストカバレッジの目標**:
   - ビジネスロジック：90%以上
   - ユーティリティ関数：80%以上
   - 全体目標：70%以上

4. **継続的インテグレーション**:
   - 新機能実装時には対応するテストを必ず実装
   - リファクタリング前にテストを実装して安全性を確保

5. **非推奨機能のテスト**:
   - 非推奨APIの警告メカニズムを確認するテストを実装
   - 環境による動作の違い（開発/テスト/本番）を検証
   - 完全移行後のクリーンアップのためのテストも考慮

## 6. ロードマップ

### フェーズ1（1-2週間） - 完了
- ✅ ミドルウェアテストの実装（ロギング）
- ✅ エラーハンドリングユーティリティテストの実装（完了）
- ✅ 市場データ取得エンドポイントのテスト実装（`marketData.test.js`として完了）
- ✅ ミドルウェアテスト（CORS）（`cors.test.js`として完了）
- ✅ ポートフォリオ関連エンドポイントのテスト実装（`saveFile.test.js`、`loadFile.test.js`として完了）
- ✅ フォールバックデータサービスのテスト更新（環境検出機能対応）
- ✅ 非推奨プロキシモジュール（usage.js）のテスト実装
- ✅ アラートサービスのテスト実装（`alerts.test.js`）
- ✅ メトリクスサービスのテスト実装（`matrics.test.js`）
- カバレッジ目標：45%

### フェーズ2（2-3週間）
- ユーザー管理関連のテスト実装
- ユーザー管理関連テストを開始（`userService.test.js`のドラフト作成）
- 残りのエンドポイントテスト実装
- 非推奨機能の移行サポートテスト実装
- カバレッジ目標：60%

### フェーズ3（3-4週間）
- データ変換サービスのテスト実装
- 外部APIインテグレーションテストの拡充
- 統合テストの追加
- カバレッジ目標：70%

### フェーズ4（4-6週間）
- 残りのユーティリティテストの実装
- E2Eテストの拡充
- バグ修正とリファクタリング
- 完全移行後の最終確認テスト
- カバレッジ目標：80%以上

## 7. 参考リソース

- Jest ドキュメント: https://jestjs.io/docs/
- JavaScript テスティングのベストプラクティス: https://github.com/goldbergyoni/javascript-testing-best-practices
- AWS SDK JavaScript v3 テスト: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/testing-mocking.html
- 非推奨機能のテストアプローチ: https://martinfowler.com/bliki/FeatureToggle.html

## 8. テスト結果

`npm run test:full:mock` および `npm test` を実行した結果を `document/test-results.md` に記録しています。2025年5月21日の実行では全323件のテストが成功し、ステートメントカバレッジは100%に到達しました。詳細なログは同ファイルを参照してください。
