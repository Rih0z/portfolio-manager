# Portfolio Manager テストファイル構成

## 基本設定ファイル
1. `__tests__/setup.js` - テスト実行前後の共通処理設定
2. `__tests__/mocks/handlers.js` - MSWモックサーバーのAPIハンドラー定義
3. `__tests__/mocks/data.js` - テスト用モックデータ

## 単体テスト
1. `__tests__/unit/store/userStore.test.js` - ユーザーストアのテスト
2. `__tests__/unit/store/dataStore.test.js` - データストアのテスト
3. `__tests__/unit/utils/formatters.test.js` - フォーマッターユーティリティのテスト
4. `__tests__/unit/utils/apiUtils.test.js` - APIユーティリティのテスト
5. `__tests__/unit/utils/envUtils.test.js` - 環境設定ユーティリティのテスト
6. `__tests__/unit/services/marketDataService.test.js` - 市場データサービスのテスト

統合テストおよびE2Eテストは現在未実装です。必要に応じて`__tests__/integration/`や`__tests__/e2e/`以下にテストファイルを追加してください。

これらのテストファイルを実装することで、アプリケーションの品質保証と継続的な開発をサポートします。


