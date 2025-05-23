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
