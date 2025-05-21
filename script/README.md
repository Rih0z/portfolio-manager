# テスト実行スクリプト

このディレクトリには、ポートフォリオマネージャーのテスト実行を自動化するスクリプトが含まれています。

## スクリプト一覧

- `run-all-tests.js` - すべてのテスト（単体/統合/E2E）を一括実行
- `run-unit-tests.js` - 単体テストのみを実行
- `run-integration-tests.js` - 統合テストのみを実行
- `run-e2e-tests.js` - E2Eテストのみを実行
- `generate-coverage-report.js` - カバレッジレポートを生成
- `setup-permissions.sh` - スクリプトに実行権限を付与（Unix環境）

## 使用方法

### 初期セットアップ（Unix環境）

Unix環境（Linux / macOS）の場合、まず実行権限を付与します：

```bash
# スクリプトに実行権限を付与
chmod +x script/setup-permissions.sh
./script/setup-permissions.sh
```

### すべてのテストを実行

```bash
# Node.jsから実行する場合
node script/run-all-tests.js

# Unix環境で直接実行する場合（権限設定後）
./script/run-all-tests.js
```

### 単体テストを実行

```bash
# すべての単体テストを実行
node script/run-unit-tests.js

# 特定のコンポーネントのテストのみ実行
node script/run-unit-tests.js Table

# ウォッチモードで実行（変更を監視）
node script/run-unit-tests.js --watch
```

### 統合テストを実行

```bash
# すべての統合テストを実行
node script/run-integration-tests.js

# 特定のカテゴリのみ実行（例：認証関連）
node script/run-integration-tests.js auth
```

### E2Eテストを実行

```bash
# すべてのE2Eテストを実行
node script/run-e2e-tests.js

# 特定のE2Eテストのみ実行
node script/run-e2e-tests.js UserManagement
```

### カバレッジレポートを生成

```bash
# すべてのテストからカバレッジレポートを生成
node script/generate-coverage-report.js
```

生成されたレポートは `coverage/lcov-report/index.html` で確認できます。

## テスト結果の確認

テスト実行後、以下のファイルでテスト結果を確認できます：

- **JUnit XML形式**: `test-results/*.xml`
  - CI/CDシステム（例：Jenkins、GitLab CI）で読み込み可能な形式
  - 各テストカテゴリごとに個別のXMLファイルが生成されます

- **HTML形式**: `test-results/*.html`
  - ブラウザで閲覧可能な形式
  - 実行結果の概要、成功/失敗テスト、実行時間などが確認できます

テスト結果のサンプルディレクトリ構造：
```
test-results/
├── unit-all-report.html        # 単体テスト結果HTML
├── unit-all-results.xml        # 単体テスト結果XML
├── integration-all-report.html # 統合テスト結果HTML
├── integration-all-results.xml # 統合テスト結果XML
├── e2e-all-report.html         # E2Eテスト結果HTML
└── e2e-all-results.xml         # E2Eテスト結果XML
```

## 注意事項

- テスト実行前に必要な依存パッケージがインストールされていることを確認してください：
  ```bash
  npm install
  ```

- 最新のテストを実行する前に、コードベースが最新であることを確認してください：
  ```bash
  git pull
  ```

- 長時間実行されるE2Eテストでは、十分なシステムリソースを確保してください。
