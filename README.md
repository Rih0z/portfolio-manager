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
- **市場データの自動取得**：Alpha Vantageをプライマリソース、フォールバック値をバックアップとして使用
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

### 本番ビルド

```bash
npm run build
```

## デプロイ方法

### Netlifyへのデプロイ

#### Netlify CLIを使用する方法

```bash
# Netlify CLIをインストール（まだの場合）
npm install -g netlify-cli

# Netlifyにログイン
netlify login

# プロジェクトの初期化（初回のみ）
netlify init

# 本番環境へのデプロイ
netlify deploy --prod
```

#### Netlifyダッシュボードを使用する方法

1. [Netlify](https://app.netlify.com/)にログイン
2. 「Add new site」→「Import an existing project」をクリック
3. GitHubなどのリポジトリプロバイダを選択し、リポジトリを選択
4. 以下のビルド設定を行う：
   - Build command: `CI= npm run build`
   - Publish directory: `build`
   - Functions directory: `functions`
5. 「Show advanced」をクリックし、環境変数を設定：
   - `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuthクライアントID
   - `REACT_APP_GOOGLE_API_KEY`: Google APIキー
   - `ALPHA_VANTAGE_API_KEY`: Alpha Vantage API用キー
6. 「Deploy site」をクリック

## 使用方法

### ダッシュボード画面

ダッシュボード画面では、総資産、銘柄数、年間手数料、年間配当金の概要を確認できます。円グラフで理想配分と現在配分の比較、バーチャートで理想と現状の差分を視覚的に表示します。テーブルでは保有資産の詳細を確認できます。

### 設定画面

設定画面では以下の操作が可能です：
- 銘柄検索と追加
- 人気銘柄のワンクリック追加
- 保有資産の編集（保有数量や手数料率）
- 目標配分の編集

### シミュレーション画面

シミュレーション画面では、追加予算を入力し、最適な購入プランをシミュレーションできます。予算プリセットボタンで素早く金額を設定できます。

### データ連携画面

データ連携画面では以下の操作が可能です：
- JSON/CSV形式でのデータエクスポート
- ファイル/クリップボード/テキスト入力によるデータインポート
- Googleドライブ連携によるクラウド保存/読み込み
- データ同期

## 特徴

### 銘柄タイプと手数料率の自動判定

ティッカーシンボルや名前からファンドタイプを自動判定し、適切な手数料率を推定します：
- 個別株は常に手数料率0%として扱われます
- ETF、インデックスファンド、REITなどは典型的な手数料率が自動設定されます
- 特定の人気銘柄は正確な手数料情報がデータベースから取得されます

### 配当情報の自動推定と年間配当金計算

ティッカーシンボルや名前から配当情報を自動推定します：
- 配当利回りの推定
- 配当頻度（毎月、四半期、半年、年1回）の推定
- 配当の有無の判定
- 特定の人気銘柄は正確な配当情報がデータベースから取得されます
- 保有銘柄の配当情報に基づいて年間配当金を自動計算
- 通貨換算対応（JPY/USD）の配当金計算

### データ永続化と同期

- **ローカルストレージ**: ブラウザのローカルストレージを使用してデータをBase64エンコーディングで暗号化して保存
- **Google認証**: Googleアカウントを使用して認証
- **Googleドライブ連携**: 認証後にクラウドストレージとしてGoogleドライブを使用可能
- **データ同期**: タイムスタンプに基づいて最新データを特定し同期

### 通知システム

- 通知タイプに応じた色分け表示（情報、成功、警告、エラー）
- エラー以外の通知は5秒後に自動消去
- すべての通知に手動消去ボタンを表示
- 画面右下に固定表示されるスタック形式の通知

### 市場データ取得

- **Alpha Vantage API**: 最新の市場データをプライマリソースとして使用
- **フォールバック機構**: API制限に達した場合や取得失敗時に代替値を使用
- **為替レート**: 通貨換算のための為替レートを自動取得

## トラブルシューティング

### Alpha Vantage APIのレート制限

Alpha Vantage APIには無料プランで1日当たり25回までのリクエスト制限があります。制限に達した場合は、自動的にフォールバック値が使用されます。

### ローカルストレージの問題

ローカルストレージに関する問題が発生した場合：
1. ブラウザのデベロッパーツールで「Application」→「Local Storage」を確認
2. 問題が続く場合は「Clear Site Data」でデータをクリアして再試行

### その他の問題

詳細なトラブルシューティングはセットアップガイドを参照してください。

## 既知のバグ

- **銘柄タイプ判定の誤り**: 一部のインデックスファンド、ETFが個別株として誤って登録される場合があります
- **手数料情報の不正確さ**: 一部のインデックスファンドについて適切な手数料情報を取得できないことがあります
- **Google連携の問題**: 特定の条件下でGoogleアカウント連携に失敗する場合があります
- **YFinance連携の問題**: Yahoo Finance (yfinance) との連携がうまく機能していない場合があります
- **株価の情報が正常に取得できない**: 一部の銘柄で株価情報の取得に失敗し、フォールバック値が使用される場合があります

## 将来の実装予定

- **利回り計算**: アプリ利用開始時からの利回りを計算・表示する機能
- **匿名のSNS機能実装**: 投資家同士がコミュニケーションを取れるSNS機能
  - フォロー機能: 他のユーザーをフォローできる機能
  - お気に入り機能: 気になる銘柄やポートフォリオをお気に入り登録できる機能
  - 類似ポートフォリオ検索: 自分と似たポートフォリオを持つユーザーを探してフォローできる機能

## 貢献方法

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

**重要な注意事項：**
- 貢献前に必ず各種ドキュメント（コード規約書、仕様書、インターフェース仕様書など）をAIに読ませるか、自身で熟読してください
- すべてのコードは[コード規約書](https://github.com/Rih0z/portfolio-manager/blob/main/document/updated-code-conventions.txt)に厳密に準拠する必要があります
- コードを変更した場合は、必ず関連する仕様書も合わせて更新してください
- ドキュメントの整合性を保つことは、プロジェクトの品質維持に不可欠です

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

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
