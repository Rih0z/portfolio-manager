# Portfolio Manager テストファイル構成

## 基本設定ファイル
1. `__test__/setup.js` - テスト実行前後の共通処理設定
2. `__test__/mocks/handlers.js` - MSWモックサーバーのAPIハンドラー定義
3. `__test__/mocks/data.js` - テスト用モックデータ

## 単体テスト
1. `__test__/unit/components/Table.test.js` - テーブルコンポーネントのテスト
2. `__test__/unit/components/Chart.test.js` - チャートコンポーネントのテスト
3. `__test__/unit/store/userStore.test.js` - ユーザーストアのテスト
4. `__test__/unit/store/dataStore.test.js` - データストアのテスト
5. `__test__/unit/utils/formatters.test.js` - フォーマッターユーティリティのテスト
6. `__test__/unit/utils/apiUtils.test.js` - APIユーティリティのテスト
7. `__test__/unit/utils/envUtils.test.js` - 環境設定ユーティリティのテスト
8. `__test__/unit/services/marketDataService.test.js` - 市場データサービスのテスト

## 統合テスト
1. `__test__/integration/auth/googleAuth.test.js` - Google認証フローのテスト
2. `__test__/integration/forms/userForm.test.js` - ユーザーフォーム統合テスト
3. `__test__/integration/api/dataFlow.test.js` - データフロー統合テスト

## E2Eテスト
1. `__test__/e2e/UserManagement_test.js` - ユーザー管理E2Eテスト
2. `__test__/e2e/DataOperations_test.js` - データ操作E2Eテスト
