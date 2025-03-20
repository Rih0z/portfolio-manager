# ポートフォリオマネージャー

資産管理を支援するWebアプリケーション。保有資産と理想のポートフォリオ配分を比較・管理し、最適な資金配分のシミュレーションを実施できる環境を提供します。ブラウザのローカルストレージとGoogleドライブを活用したデータ永続化機能を備え、複数デバイス間でのデータ共有をサポートします。

## 主要機能

- **資産管理**：保有数の小数点以下4桁対応
- **銘柄タイプ自動判定**：個別株、ETF、インデックスファンドなど
- **年間手数料率の自動推定と計算**：個別株は0%固定
- **年間配当金の計算と配当情報管理**：保有銘柄の配当情報を取得し、年間配当金を自動計算。配当頻度、配当利回りの自動推定
- **理想ポートフォリオ配分設定**
- **資金配分シミュレーション**
- **データインポート/エクスポート**
- **ローカルストレージによるデータ永続化**
- **Google認証・Googleドライブ連携**
- **市場データの自動取得**：Alpha Vantageをプライマリソース、Yahoo Financeをフォールバックとして使用
- **iOS風タブバーによるナビゲーション**
- **自動消去機能付き通知システム**

## デモ

[デモサイト](https://delicate-malasada-1fb747.netlify.app/)で機能を試すことができます。

## 技術スタック

- **フロントエンド**: React.js 18.x
- **認証**: Google OAuth 2.0 (@react-oauth/google 0.11.0)
- **スタイリング**: Tailwind CSS 3.x
- **ステート管理**: React Context API
- **ルーティング**: React Router 6.x
- **データ可視化**: Recharts 2.x
- **API通信**: Axios 1.x
- **ユーティリティ**: Lodash 4.x, Day.js 1.x, jwt-decode 3.x
- **データ処理**: PapaParse 5.x (CSV処理)
- **UI拡張**: @headlessui/react 1.x
- **サーバーレス関数**: Netlify Functions
- **デプロイ**: Netlify
- **データ永続化**: ローカルストレージ（Base64暗号化）

## インストールと実行方法

### 前提条件

- Node.js v16.x以上
- npm v8.x以上
- Git

### ローカル環境でのセットアップ

1. **リポジトリのクローン**

```bash
git clone https://github.com/Rih0z/portfolio-manager.git
cd portfolio-manager
```

2. **依存パッケージのインストール**

```bash
npm install
```

3. **環境変数の設定**

プロジェクトのルートディレクトリに `.env.local` ファイルを作成し、必要な環境変数を設定します。

```
# Google OAuth認証用クライアントID
REACT_APP_GOOGLE_CLIENT_ID=あなたのGoogleクライアントID

# Google API Key
REACT_APP_GOOGLE_API_KEY=あなたのGoogle APIキー

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=あなたのAlpha Vantage APIキー
```

4. **開発サーバーの起動**

```bash
npm start
```

ブラウザが自動的に開き、`http://localhost:3000` でアプリケーションにアクセスできます。

5. **Netlify Functionsをローカルで実行**

```bash
# Netlify CLIをインストール（初回のみ）
npm install -g netlify-cli

# Netlify開発サーバーを起動
netlify dev
```

これにより、アプリケーションとFunctionsの両方が起動され、`http://localhost:8888` でアクセスできます。

## デプロイ方法については、同梱のセットアップガイドを参照してください。

## 更新履歴

### v3.2 (2025/03/20)
- マルチデータソース対応を実装
  - Alpha Vantage APIが制限に達した場合にYahoo Finance APIにフォールバック
  - すべてのAPIが失敗した場合にフォールバック値を使用
  - データソースの表示機能とユーザー通知の追加
- 日本株ティッカー変換の改善
- API障害時の詳細通知機能強化

### v3.1 (2025/03/19)
- 通知システムの自動消去機能追加（タイプ別）
- 初期化処理の重複実行防止機能追加
- 通知表示フローの詳細定義追加

### v3.0 (2025/03/18)
- 配当情報の管理機能追加
- 配当情報の表示UI実装
- Google Drive API連携の安定性向上

### v2.0 (2025/03/10)
- 銘柄タイプ自動判定と年間手数料の自動推定機能追加
- 個別株の手数料固定（0%）とファンド手数料計算ロジックの修正
- 人気銘柄リストの更新

### v1.0 (2025/03/05)
- 初版リリース
- 基本的なポートフォリオ管理機能
- Alpha Vantage APIによる市場データ取得
- ローカルストレージによるデータ保持

## ライセンス

MIT License

## 謝辞

- **Alpha Vantage**: 市場データAPI
- **Yahoo Finance**: 市場データAPIのフォールバック
- **Google**: 認証とクラウドストレージAPI
- **React コミュニティ**
- **Tailwind CSS チーム**

## 貢献方法

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## トラブルシューティング

### Alpha Vantage APIのレート制限

Alpha Vantage APIには無料プランで1日当たり25回までのリクエスト制限があります。制限に達した場合は、自動的にフォールバック値が使用されます。

### ローカルストレージの問題

ローカルストレージに関する問題が発生した場合：
1. ブラウザのデベロッパーツールで「Application」→「Local Storage」を確認
2. 問題が続く場合は「Clear Site Data」でデータをクリアして再試行

### その他の問題

詳細なトラブルシューティングは同梱のセットアップガイドを参照してください。

## 参考資料

- [コード規約書](https://github.com/Rih0z/portfolio-manager/blob/main/document/updated-code-conventions.txt)
- [インターフェース仕様書](https://github.com/Rih0z/portfolio-manager/blob/main/document/updated-interface-specifications.txt)
- [セットアップガイド](https://github.com/Rih0z/portfolio-manager/blob/main/document/updated-setup-guide.txt)
- [仕様書](https://github.com/Rih0z/portfolio-manager/blob/main/document/updated-specifications.txt)

ドキュメント一覧は[こちら](https://github.com/Rih0z/portfolio-manager/tree/main/document)でも確認できます。

## コンタクト

プロジェクト責任者 - [@Rih0z](https://github.com/Rih0z)
メールアドレス - riho.dare at gmail.com

プロジェクトリンク: [https://delicate-malasada-1fb747.netlify.app/settings](https://delicate-malasada-1fb747.netlify.app/settings)

## 既知のバグ

- **銘柄タイプ判定の誤り**: 一部のインデックスファンド、ETFが個別株として誤って登録される場合があります
- **手数料情報の不正確さ**: 一部のインデックスファンドについて適切な手数料情報を取得できないことがあります
- **Google連携の問題**: 特定の条件下でGoogleアカウント連携に失敗する場合があります
- **Yahoo Finance連携の問題**: Yahoo Finance (yfinance) との連携がうまく機能していない場合があります
- **株価の情報が正常に取得できない**: 一部の銘柄で株価情報の取得に失敗し、フォールバック値が使用される場合があります

## 将来の実装予定

- **利回り計算**: アプリ利用開始時からの利回りを計算・表示する機能
- **匿名のSNS機能実装**: 投資家同士がコミュニケーションを取れるSNS機能
  - フォロー機能: 他のユーザーをフォローできる機能
  - お気に入り機能: 気になる銘柄やポートフォリオをお気に入り登録できる機能
  - 類似ポートフォリオ検索: 自分と似たポートフォリオを持つユーザーを探してフォローできる機能
