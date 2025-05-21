# AGENTS.md

## プロジェクト概要

このリポジトリは「ポートフォリオマネージャー」というウェブアプリケーションのソースコードを管理しています。このアプリケーションは、ユーザーが保有資産と理想のポートフォリオ配分を比較・管理し、最適な資金配分のシミュレーションを実施できる環境を提供します。バックエンド機能の一部はAWSに移行され、フロントエンドはReact.jsで実装され、Netlifyにホストされています。

## ファイル構造

プロジェクトは以下の構造になっています：

```
src/
├── App.css                    # アプリケーションのベーススタイル
├── App.jsx                    # アプリケーションルート
├── App.test.js                # Appコンポーネントのテスト
├── craco.config.js            # Create React App設定のオーバーライド
├── index.css                  # グローバルCSSスタイル
├── index.js                   # アプリケーションエントリーポイント
├── logo.svg                   # Reactロゴ
├── reportWebVitals.js         # パフォーマンス測定ユーティリティ
├── setupProxy.js              # 開発環境用プロキシ設定（AWS環境対応版）
├── setupTests.js              # テスト環境セットアップ
├── components/      # UIコンポーネント
│   ├── auth/        # 認証関連コンポーネント 
│   ├── common/      # 共通UIコンポーネント
│   ├── dashboard/   # ダッシュボード画面コンポーネント
│   ├── data/        # データ連携コンポーネント
│   ├── layout/      # レイアウト関連コンポーネント
│   ├── settings/    # 設定画面コンポーネント
│   └── simulation/  # シミュレーション画面コンポーネント
├── context/         # React Context定義
│   ├── AuthContext.js           # 認証コンテキスト（AWS環境対応版）
│   └── PortfolioContext.js      # ポートフォリオコンテキスト
├── hooks/           # カスタムReact Hooks
│   ├── useAuth.js               # 認証フック
│   ├── useGoogleDrive.js        # Googleドライブ連携フック
│   ├── usePortfolioContext.js   # ポートフォリオコンテキストフック
│   └── useLocalStorage.js       # ローカルストレージフック
├── pages/           # ページコンポーネント
│   ├── Dashboard.jsx           # ダッシュボードページ
│   ├── DataIntegration.jsx     # データ連携ページ
│   ├── Settings.jsx            # 設定ページ
│   └── Simulation.jsx          # シミュレーションページ
├── services/        # APIサービスとデータ処理
│   ├── adminService.js         # 管理者向けAPIサービス
│   ├── api.js                   # API関連のエントリーポイント
│   └── marketDataService.js     # 市場データサービス（AWS環境対応版）
└── utils/           # ユーティリティ関数
    ├── apiUtils.js              # API連携ユーティリティ
    ├── envUtils.js              # 環境設定ユーティリティ
    ├── formatters.js           # フォーマット関数
    └── fundUtils.js            # ファンドユーティリティ
```

## テスト構造

テストファイルは主にソースファイルと同じディレクトリに配置され、以下の命名規則に従っています：

```
src/
└── components/
    └── Button.test.js      # 単体テスト
src/
└── services/
    └── api.integration.test.js  # 統合テスト
```

また、テスト実行時に生成される成果物は以下の構成になっています：

```
test-results/           # テスト結果格納ディレクトリ
├── junit/              # JUnit形式のテスト結果
├── visual-report.html  # ビジュアルテストレポート
├── test-log.md         # テスト実行ログ
├── detailed-results.json # 詳細なテスト結果
└── coverage-history.json # カバレッジ履歴データ

coverage/               # カバレッジレポート
├── lcov-report/        # HTMLカバレッジレポート
└── coverage-final.json # 詳細カバレッジデータ
```

## 主要なドキュメントファイル

プロジェクトに関する詳細な情報は以下のドキュメントファイルに記載されています：

1. `document/API-specification.md` - 市場データ取得API仕様書（AWS環境移行対応版）
2. `document/code-convention.md` - ポートフォリオマネージャー コード規約書
3. `document/interface-specification.md` - インターフェース仕様書
4. `document/server-func.md` - AWS移行実装計画
5. `document/specifications.md` - 総合仕様書
6. `document/structure-and-modules.md` - モジュール構造と関数インターフェース概要
7. `document/test-files.md` - テストファイル構成

## 開発ガイドライン

### コード規約

- JSXコンポーネントはPascalCaseで命名してください（例: `PortfolioSummary.jsx`）
- 変数・関数名はcamelCaseを使用してください（例: `handleSubmit`）
- ブール値を持つ変数は`is`、`has`、`should`などのプレフィックスを使用してください（例: `isLoading`、`hasDividend`）
- 定数は大文字のSNAKE_CASEを使用してください（例: `MAX_RETRY_COUNT`）
- イベントハンドラ関数には`handle`プレフィックスを使用してください（例: `handleInputChange`）

詳細なコード規約は `document/code-convention.md` を参照してください。

### AWS環境対応

このプロジェクトは最近AWSに移行されました。環境に応じた設定は以下の方法で行われます：

- 環境変数は`.env.development`と`.env.production`ファイルで管理
- 環境判定と環境依存値の取得は`src/utils/envUtils.js`を使用
- API連携は`src/utils/apiUtils.js`の共通関数を使用

詳細な実装計画は `document/server-func.md` を参照してください。

### Google認証・Googleドライブ連携

Google認証とGoogleドライブ連携はAWS上のバックエンドAPIを介して実装されています：

- 認証は認可コードフローを使用
- セッション管理はHTTP-Onlyクッキーで実装
- Google Drive操作は`useGoogleDrive`フックを使用

詳細な実装仕様は `document/API-specification.md` と `document/interface-specification.md` を参照してください。

## テスト実行方法

テストは以下のコマンドで実行できます：

```
npm run test:all
```

単体テスト、統合テスト、E2Eテストがすべて実行されます。テストの詳細構成は `document/test-files.md` を参照してください。

また、個別のテスト実行には以下のコマンドが使用できます：

```
./script/run-tests.sh unit           # 単体テストのみ実行
./script/run-tests.sh integration    # 統合テストのみ実行
./script/run-tests.sh e2e            # E2Eテストのみ実行
./script/run-tests.sh -c all         # 環境クリーンアップ後にすべてのテストを実行
./script/run-tests.sh -v -m quick    # ビジュアル表示とモック使用で高速テスト実行
```

## ドキュメント管理

ソースコードを修正した場合、必要に応じて関連するドキュメントも更新してください。特に以下の場合は必ずドキュメントを更新する必要があります：

1. APIインターフェースの変更
2. データ構造の変更
3. コンポーネント構造の変更
4. 環境設定の変更
5. 重要な機能の追加・削除

各ファイルの詳細な仕様や使用方法は、上記ドキュメントファイルを参照してください。これらのドキュメントは最新の実装状態を反映していることが期待されています。

## 注意事項

- 環境変数に依存する処理は必ず`envUtils.js`を通して行ってください
- API呼び出しは必ず`apiUtils.js`の共通関数を使用してください
- エラーハンドリングはコンポーネントレベルで適切に実装してください
- AWSサーバーとの連携の際は適切な認証情報を設定してください
- テスト環境セットアップは自動的に必要な環境を作成します（不要なテストディレクトリは作成されないように設定済み）
