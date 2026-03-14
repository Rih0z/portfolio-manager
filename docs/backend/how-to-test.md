# テスト実行ガイド

このドキュメントでは、Portfolio Market Data APIのテスト実行方法について説明します。

## 目次

1. [テスト環境のセットアップ](#1-テスト環境のセットアップ)
2. [テスト実行スクリプトの使用方法](#2-テスト実行スクリプトの使用方法)
3. [npm スクリプトの一覧](#3-npm-スクリプトの一覧)
4. [テスト実行パターン別ガイド](#4-テスト実行パターン別ガイド)
5. [CI/CD 環境でのテスト実行](#5-cicd-環境でのテスト実行)
6. [トラブルシューティング](#6-トラブルシューティング)

## 1. テスト環境のセットアップ

テストを実行する前に、テスト環境をセットアップする必要があります。

### 前提条件

- Node.js 18.x
- Java（DynamoDB Localの実行に必要）
- npm

### 初期セットアップ

```bash
# 依存関係のインストール
npm install

# DynamoDB Localのセットアップ（初回のみ必要）
mkdir -p ./dynamodb-local
curl -L -o ./dynamodb-local/dynamodb-local-latest.tar.gz https://d1ni2b6xgvw0s0.cloudfront.net/dynamodb_local_latest.tar.gz
tar -xzf ./dynamodb-local/dynamodb-local-latest.tar.gz -C ./dynamodb-local

# テスト実行スクリプトに実行権限を付与
chmod +x scripts/run-tests.sh
```

## 2. テスト実行スクリプトの使用方法

`scripts/run-tests.sh`スクリプトを使用すると、さまざまなテスト設定を簡単に実行できます。

### 基本的な使用方法

```bash
./scripts/run-tests.sh [オプション] <テスト種別>
```

### オプション

- `-h, --help`: ヘルプメッセージを表示
- `-c, --clean`: テスト実行前にテスト環境をクリーンアップ
- `-v, --visual`: テスト結果をビジュアルレポートで表示
- `-a, --auto`: APIサーバーを自動起動（E2Eテスト用）
- `-m, --mock`: APIモックを使用（E2Eテスト用）
- `-w, --watch`: 監視モードでテストを実行（コード変更時に自動再実行）

### テスト種別

- `unit`: 単体テストのみ実行
- `integration`: 統合テストのみ実行
- `e2e`: エンドツーエンドテストのみ実行
- `all`: すべてのテストを実行
- `quick`: 単体テストと統合テストのみ高速実行（モック使用）

### 使用例

```bash
# 単体テストのみ実行
./scripts/run-tests.sh unit

# 環境クリーンアップ後、すべてのテストを実行
./scripts/run-tests.sh -c all

# APIサーバー自動起動でE2Eテストを実行し、結果をビジュアル表示
./scripts/run-tests.sh -a -v e2e

# モックを使用し、監視モードで単体テストを実行
./scripts/run-tests.sh -m -w unit

# 単体テストと統合テストを高速実行（モック使用）
./scripts/run-tests.sh quick

# カバレッジチャートを生成
./scripts/run-tests.sh --chart all
```

## 3. npm スクリプトの一覧

スクリプトを直接使用せずに、npm スクリプトを使用することもできます。

### 基本的なテストスクリプト

```bash
# すべてのテストを実行
npm test

# 単体テストのみ実行
npm run test:unit

# 統合テストのみ実行
npm run test:integration

# E2Eテストのみ実行
npm run test:e2e

# テストカバレッジを計測
npm run test:coverage

# 監視モードでテストを実行
npm run test:watch

# ビジュアルレポートを生成
npm run test:visual
```

### 特殊なテスト実行

```bash
# APIサーバー自動起動によるE2Eテスト
npm run test:e2e:auto

# モックを使用したE2Eテスト
npm run test:e2e:mock

# すべてのテストを順番に実行
npm run test:all

# 単体テストと統合テストのみ高速実行（モック使用）
npm run test:quick

# 開発環境向け監視モードテスト
npm run test:dev

# すべてのテストをモックモードで実行
npm run test:full:mock

# すべてのテストをAPIサーバー自動起動モードで実行
npm run test:full:auto
```

### テスト環境管理

```bash
# DynamoDB Localを起動
npm run dynamodb:start

# DynamoDB Localを停止
npm run dynamodb:stop

# テスト環境のセットアップ
npm run test:setup

# テスト結果ディレクトリをリセット
npm run test:reset

# テスト完全実行（リセット→セットアップ→テスト→結果表示）
npm run test:full

# テスト環境のクリーンアップ
npm run test:clean
```

## 4. テスト実行パターン別ガイド

### 通常の開発時

開発中は、変更に関連するテストだけを実行すると効率的です。

```bash
# 監視モードで単体テストを実行（コード変更時に自動再実行）
./scripts/run-tests.sh -w unit

# または npm スクリプトを使用
npm run test:dev
```

### プルリクエスト前の確認

プルリクエストを送信する前に、すべてのテストが通ることを確認しましょう。

```bash
# すべてのテストを実行（モックを使用して高速化）
./scripts/run-tests.sh -c -m all

# または npm スクリプトを使用
npm run test:clean && npm run test:full:mock
```

### E2Eテストの実行

E2Eテストは様々な方法で実行できます。

```bash
# APIサーバーを手動で起動してE2Eテスト
# ターミナル1
npm run dev
# ターミナル2
./scripts/run-tests.sh e2e

# APIサーバー自動起動でE2Eテスト
./scripts/run-tests.sh -a e2e

# モックを使用してE2Eテスト（最も高速）
./scripts/run-tests.sh -m e2e
```

### テストカバレッジの確認

コードカバレッジを計測してレポートを確認できます。

```bash
# テストカバレッジを計測してレポートを生成
npm run test:coverage

# カバレッジレポートを開く
open coverage/lcov-report/index.html
```

## 5. CI/CD 環境でのテスト実行

CI/CD環境では、次のコマンドを使用することをお勧めします。

```bash
# CI環境用のテスト実行（JUnit形式のレポートも生成）
npm run test:ci

# またはスクリプトを使用
./scripts/run-tests.sh -m all
```

GitHub Actionsのワークフローでは、次のように設定できます。

```yaml
- name: テスト実行
  run: npm run test:ci
  env:
    CI: true
    USE_API_MOCKS: true
```

## 6. トラブルシューティング

### APIサーバーが起動しない

```bash
# APIサーバーの状態を確認
lsof -i :3000

# モックを使用してテストを実行
./scripts/run-tests.sh -m e2e
```

### DynamoDB Localの問題

```bash
# DynamoDB Localの状態を確認
lsof -i :8000

# 強制的に停止して再起動
npm run dynamodb:stop
npm run dynamodb:start
```

### テストが遅い

```bash
# モックを使用して高速化
./scripts/run-tests.sh -m all

# または単体テストと統合テストのみ実行
./scripts/run-tests.sh quick
```

### ビジュアルレポートが開かない

```bash
# ブラウザで直接開く
open ./test-results/visual-report.html
```

---

このガイドについて質問や問題がある場合は、お気軽にお問い合わせください。
