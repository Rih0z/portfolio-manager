# テストファイル構成

このドキュメントでは、本プロジェクトにおけるテストコードの配置場所と役割を簡潔にまとめます。`npm run test:all` または `script/run-tests.sh all` で全てのテストが実行されます。

## ディレクトリ構成

```
__tests__/
├── unit/            # ユニットテスト
│   ├── components/  # コンポーネントのテスト
│   ├── hooks/       # カスタムフックのテスト
│   ├── services/    # サービス層のテスト
│   ├── utils/       # ユーティリティのテスト
│   └── pages/       # ページコンポーネントのテスト
├── integration/     # 統合テスト
└── e2e/             # E2E テスト
```

- **unit**: 各モジュールを単体で検証します。今回 `pages` サブディレクトリを追加し、ページコンポーネントもテスト対象になりました。
- **integration**: モジュール間の連携を確認するテストを配置します（現状は空です）。
- **e2e**: 画面操作を通じた総合テストを配置します（現状は空です）。

## 実行方法

以下のスクリプトで全テストを実行し、カバレッジレポートも生成されます。

```bash
npm run test:all
# または
./script/run-tests.sh all
```

テスト結果は `test-results/`、カバレッジレポートは `coverage/` に出力されます。

## 追加テスト

カバレッジ向上のため、`ToastNotification` コンポーネントに
以下のユースケースを網羅したテストを追加しました。

- 自動消去の動作確認
- 手動閉じる操作の確認
- 通知タイプと表示位置によるスタイルの適用確認
- `duration=0` 指定時は自動で閉じないことの確認

これらのテストは `__tests__/unit/components/ToastNotification.test.js`
に実装されており、`script/run-tests.sh all` で他のテストと共に実行されます。

さらにカバレッジ向上のため、以下のコンポーネントにも
基本的なレンダリングテストを追加しました。

- `Header` コンポーネント
- `TabNavigation` コンポーネント
- `LoginButton` コンポーネント
- `UserProfile` コンポーネント

これらのテストは `__tests__/unit/components` 配下にあり、
各コンポーネントの表示内容とハンドラ呼び出しを検証します。

APIユーティリティ層の網羅率向上のため、`src/services/api.js` の
補助関数群にもテストを追加しました。動作確認は
`__tests__/unit/services/api.test.js` に実装しています。
また、Web Vitals 計測ユーティリティ `src/reportWebVitals.js` 用の
テスト `__tests__/unit/utils/reportWebVitals.test.js` も追加し、
コールバックが正しく各計測関数へ渡されるかを検証しています。

さらに `script/generate-coverage-chart.js` の単体テスト
`__tests__/unit/scripts/generateCoverageChart.test.js` を新設し、
チャート生成関数と履歴ファイル更新処理の動作を確認します。
その後、`loadCoverageData` 関数が複数のカバレッジファイルから正しく
データを読み取れるかを検証するテストを追加しました。

加えてテスト実行スクリプト `script/run-tests.sh` 自体の挙動確認用に、
`__tests__/unit/scripts/runTestsSh.test.js` を追加しました。`--help` オプ
ションや未知のオプションを与えた際のメッセージ出力と終了ステータス
を検証します。さらに `--clean`、`--chart`、`--html-coverage` オプションの
動作やテスト種別未指定・無効なターゲット指定時のエラー処理に加え、
`cross-env` が存在しない場合のフォールバック処理や `-s` オプションで
特定テストのみ実行する機能、`-i` オプションによるカバレッジエラー
無視時の終了ステータス変化もカバーしました。また `cross-env` が無い
環境で `jest` コマンドも見つからない場合は `npx jest` を自動的に利用
する挙動を追加し、これをテストで検証しています。このようにスクリプ
ト単体のカバレッジを大幅に向上させています。

さらに Node.js バージョン修正スクリプト `script/fix-node-version.sh`
の検証用に `__tests__/unit/scripts/fixNodeVersion.test.js` を追加しました。
既に Node.js 18 を使用している場合の早期終了と、nvm が存在しない
場合の処理を確認します。

さらにダッシュボードやシミュレーション機能のカバレッジ向上のため、
次のコンポーネントにもテストを追加しました。

- `AssetsTable` コンポーネント
- `GoogleDriveIntegration` コンポーネント
- `BudgetInput` コンポーネント
- `ExportOptions` コンポーネント

いずれも `__tests__/unit/components` 配下にあり、
データが存在しない場合の表示やユーザー操作による状態遷移を検証します。
`ExportOptions.test.js` ではクリップボードへのコピーとダウンロード処理を確認しています。

- `runTestsShOptions.test.js` では `-w` オプションや `--nvm` など追加オプションの挙動を検証しています。
- `runTestsShExtras.test.js` では `--verbose-coverage` や `--detect-open-handles` `--validate-coverage` など追加フラグの挙動と、`-m` `-f` `-t final` の処理、さらに `specific` テスト種別でパターン未指定時のエラー表示を確認しています。
- `runTestsShReports.test.js` では `--visual` と `--junit` オプションの動作および `--validate-coverage` が正常に完了するケースを検証しています。
- `fundUtils.extra.test.js` では `guessFundType`、`estimateAnnualFee`、`estimateDividendYield` の未カバーケースを追加し、REIT や債券、暗号資産、空文字ティッカーなどの判定を検証しています。
- `customReporter.test.js` ではカスタムJestレポーターのユーティリティ関数をテストし、デモカバレッジ生成やサマリー表示処理を確認しています。
- `setupProxy.test.js` では Express アプリへのプロキシミドルウェア登録処理をテストし、環境変数の設定と `http-proxy-middleware` の呼び出し内容を検証しています。
- `generateCoverageChartCli.test.js` では CLIとして `script/generate-coverage-chart.js` を実行し、SVGファイル生成と終了ステータスを検証しています。
- `runTestsShEdgeCases.test.js` では `--config` オプションによる設定ファイル指定と、`jest` と `npx` が共に存在しない環境でのエラー終了を確認しています。
