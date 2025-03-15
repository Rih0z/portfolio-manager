# ポートフォリオマネージャー 実装仕様書（更新版）

## 1. 概要

本書は、資産管理を支援するWeb／モバイルアプリケーション「ポートフォリオマネージャー」の実装仕様を定義する文書です。
本アプリケーションは、ユーザーが保有資産（金額ベース）と理想のポートフォリオ配分（％ベース）を直感的に比較・管理し、最適な資金配分のシミュレーションを実施できる環境を提供します。スライドバーを使わず、ボタン操作と数値入力で直感的に操作できるUI設計を採用しています。また、年間手数料の把握、最新の市場情報（為替レートおよび各金融資産の現時点価格）の更新、Yahoo Finance API を利用した情報取得、データのインポート・エクスポート機能、シミュレーション結果の編集と購入操作、及び個別の購入・売却ボタンによる保有資産編集機能を実装します。さらに、Google OAuth認証とGoogleドライブとのデータ連携機能を提供し、複数デバイス間でのデータ共有を可能にします。

## 2. 技術スタック

- **フロントエンド**: React.js
- **認証**: Google OAuth 2.0 (@react-oauth/google)
- **スタイリング**: Tailwind CSS
- **ステート管理**: React Context API
- **ルーティング**: React Router
- **データ可視化**: Recharts
- **API通信**: Axios
- **ユーティリティ**: Lodash, Day.js, jwt-decode
- **データ処理**: PapaParse (CSV処理)
- **サーバーレス関数**: Netlify Functions
- **デプロイ**: Netlify

## 3. アプリケーション機能

### 3.1 ダッシュボード機能

#### 実装済み機能
- 総資産額の表示（ユーザーが選択した基準通貨に換算）
- 設定銘柄数の表示
- 為替レート表示と最終取得日時の表示
- Yahoo Finance APIからの為替レート取得（または適切なフォールバック）
- 年間手数料の表示（総額と割合）
- 理想ポートフォリオ配分（％ベース）の円グラフ表示
- 現在のポートフォリオ配分（％ベース）の円グラフ表示
- 理想と現状の差分（％ポイント）のバーチャート表示
- 銘柄詳細テーブルの実データ表示

### 3.2 設定機能

#### 実装済み機能
- 銘柄追加フォームUI
- 人気銘柄のワンクリック追加UI
- 保有資産設定テーブルUI
- 目標配分設定UI
- Yahoo Finance APIと連携した銘柄情報の自動取得
- **保有数量の小数点以下4桁までの対応**（暗号資産や分数株にも対応）
- 保有数量のプラス/マイナスボタン操作と直接入力
- 購入/売却モーダル機能
- 目標配分の調整機能

### 3.3 シミュレーション機能

#### 実装済み機能
- 追加予算入力UI（プラス/マイナスボタン、直接入力）
- 予算プリセットボタン（10万、30万、50万、100万）
- シミュレーション結果テーブルUI
- 購入株数・金額編集UI（**小数点以下4桁までの精度対応**）
- 追加投資シミュレーション計算ロジック
- 購入株数と購入金額の連動計算
- 個別銘柄の購入処理
- 全銘柄一括購入処理

### 3.4 データ連携機能

#### 実装済み機能
- エクスポート形式選択UI（JSON/CSV）
- ファイルエクスポートおよびクリップボードコピーボタン
- インポート形式選択UI
- 複数のインポート方法UI（ファイル、クリップボード、テキスト入力）
- JSONおよびCSV形式のデータエクスポート処理
- クリップボードへのコピー機能
- ファイルアップロードによるインポート機能
- クリップボードからのインポート機能
- テキスト入力からのインポート機能
- Google認証によるユーザーログイン機能
- Googleドライブとのデータ連携UI
- ポートフォリオデータのGoogleドライブ保存機能
- Googleドライブからのデータ読み込み機能

### 3.5 通貨対応および市場情報更新

#### 実装済み機能
- 通貨切替ボタン（円/ドル）
- 市場情報更新ボタン
- 更新日時の表示
- 複数のデータソースから為替レートを取得
  - Yahoo Finance API（第一データソース）
  - Alpha Vantage API（代替データソース）
  - 財務省為替レート（代替データソース）
- データソースの取得状況表示
- データ取得エラーの通知機能
- 為替レートの自動更新メカニズム
- 円/ドル間の実際の通貨換算処理
- 銘柄情報の保存と更新
- データ鮮度のチェックと通知
- 失敗時のフォールバック処理
- オフラインおよび取得失敗時の動作継続保証

### 3.6 認証機能

#### 実装済み機能
- Google OAuthによるユーザー認証
- ユーザープロフィール表示（アバター、名前）
- ログイン/ログアウト機能
- 認証状態の永続化（localStorage）
- トークンの有効性検証

### 3.7 通知機能

#### 実装済み機能
- トースト通知UI
- エラー通知
- データ更新失敗の通知
- データの鮮度低下の通知
- トランザクション成功通知
- 通知の自動消去
- 通知の手動消去
- 通知タイプ（エラー、警告、情報、成功）
- 通知の優先度管理

### 3.8 UIデザイン強化

#### 実装済み機能
- **iOS風のタブバーナビゲーション**（画面下部固定）
- **モバイルフレンドリーなレイアウト**
- **iPhoneのセーフエリア対応**（ホームバー対応）
- 直感的なアイコン表示
- スムーズな遷移アニメーション
- レスポンシブデザイン

## 4. アプリケーション構造

### 4.1 ディレクトリ構造（更新版）

```
portfolio-manager/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx        # 通貨選択・更新ボタン・ユーザー情報を含むヘッダー
│   │   │   ├── TabNavigation.jsx # 画面下部のiOS風タブナビゲーション
│   │   │   └── DataStatusBar.jsx # データ状態表示バー
│   │   ├── auth/
│   │   │   ├── LoginButton.jsx   # Googleログインボタン
│   │   │   └── UserProfile.jsx   # ユーザープロフィール表示
│   │   ├── dashboard/
│   │   │   ├── PortfolioSummary.jsx    # 総資産額などのサマリー
│   │   │   ├── PortfolioCharts.jsx     # 理想と現在の円グラフ
│   │   │   ├── DifferenceChart.jsx     # 差分バーチャート
│   │   │   └── AssetsTable.jsx         # 銘柄詳細テーブル
│   │   ├── settings/
│   │   │   ├── TickerSearch.jsx        # 銘柄検索・追加
│   │   │   ├── PopularTickers.jsx      # 人気銘柄ワンクリック追加
│   │   │   ├── HoldingsEditor.jsx      # 保有資産設定（小数点4桁対応）
│   │   │   └── AllocationEditor.jsx    # 目標配分設定
│   │   ├── simulation/
│   │   │   ├── BudgetInput.jsx         # 追加予算入力
│   │   │   └── SimulationResult.jsx    # シミュレーション結果テーブル（小数点4桁対応）
│   │   ├── data/
│   │   │   ├── ExportOptions.jsx       # エクスポート機能
│   │   │   ├── ImportOptions.jsx       # インポート機能
│   │   │   └── GoogleDriveIntegration.jsx # Googleドライブ連携
│   │   └── common/
│   │       ├── CurrencyFormat.jsx      # 通貨フォーマット
│   │       ├── NumberInput.jsx         # プラス/マイナスボタン付き入力
│   │       ├── Modal.jsx               # モーダルコンポーネント
│   │       ├── ToastNotification.jsx   # トースト通知コンポーネント
│   │       ├── DataSourceBadge.jsx     # データソース表示バッジ
│   │       └── ErrorBoundary.jsx       # エラーバウンダリーコンポーネント
│   ├── pages/
│   │   ├── Dashboard.jsx          # ダッシュボード画面
│   │   ├── Settings.jsx           # 目標と保有設定画面
│   │   ├── Simulation.jsx         # シミュレーション画面
│   │   └── DataIntegration.jsx    # データ連携画面
│   ├── services/
│   │   ├── api.js                 # API通信の基本関数
│   │   └── marketDataService.js   # 市場データ取得サービス
│   ├── hooks/
│   │   ├── usePortfolioContext.js # ポートフォリオ状態管理フック
│   │   └── useAuth.js            # 認証状態管理フック
│   ├── utils/
│   │   └── formatters.js          # 数値・通貨フォーマット
│   ├── context/
│   │   ├── PortfolioContext.js    # ポートフォリオContextとProvider
│   │   └── AuthContext.js        # 認証ContextとProvider
│   ├── App.jsx                    # アプリケーションルート
│   ├── index.js                   # エントリーポイント
│   └── index.css                  # Tailwind CSS設定とiOS対応スタイル
├── functions/
│   ├── yahoo-finance-proxy.js     # Yahoo Finance APIプロキシ関数
│   ├── alpha-vantage-proxy.js     # Alpha Vantage APIプロキシ関数
│   └── mof-exchange-rate-proxy.js # 財務省為替レートプロキシ関数
├── package.json                   # プロキシ設定を含む
├── .env.local                     # 環境変数（Git管理対象外）
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                   # Netlify設定ファイル（重要）
└── README.md
```

### 4.2 主要なファイルと役割（更新版）

- **App.jsx**: アプリケーションのルートコンポーネント、認証プロバイダー、ルーティング設定、iOS風タブバーレイアウト
- **context/AuthContext.js**: Google認証管理のコンテキスト
- **context/PortfolioContext.js**: ポートフォリオ状態・ロジック管理、小数点以下4桁までの保有数量対応
- **hooks/usePortfolioContext.js**: ポートフォリオコンテキスト使用フック
- **hooks/useAuth.js**: 認証状態管理フック
- **services/api.js**: Yahoo Finance APIと通信するサービス
- **services/marketDataService.js**: 複数データソースからの市場データ取得
- **utils/formatters.js**: 数値・通貨・日付のフォーマット関数
- **netlify.toml**: Netlify設定ファイル（API連携に不可欠）
- **components/layout/TabNavigation.jsx**: iOS風の画面下部タブナビゲーション
- **index.css**: Tailwind CSSとiOS用のスタイル設定

## 5. 小数点対応機能の詳細仕様（新規）

### 5.1 保有数量の小数点対応

保有数量を小数点以下4桁まで対応させることで、暗号資産や分数株の管理を可能にします。

#### 5.1.1 実装されたコンポーネント

- **保有資産設定 (HoldingsEditor.jsx)**
  - 保有数量の入力フィールドで `step="0.0001"` を設定
  - 数値表示に `.toFixed(4)` を使用して4桁まで表示
  - 増減ボタンの単位を0.0001に調整

- **シミュレーション結果 (SimulationResult.jsx)**
  - 購入株数の入力と表示で小数点以下4桁まで対応
  - 計算時の丸め処理を `.toFixed(4)` で統一

#### 5.1.2 Context処理の変更

- **updateHoldings**関数
  ```javascript
  const updateHoldings = useCallback((id, holdings) => {
    setCurrentAssets(prev => 
      prev.map(item => 
        item.id === id 
        ? { ...item, holdings: parseFloat(parseFloat(holdings).toFixed(4)) || 0 } 
        : item
      )
    );
  }, []);
  ```

- **executePurchase**関数
  ```javascript
  const executePurchase = useCallback((tickerId, units) => {
    setCurrentAssets(prev => 
      prev.map(asset => 
        asset.id === tickerId 
        ? { ...asset, holdings: parseFloat((asset.holdings + parseFloat(units)).toFixed(4)) } 
        : asset
      )
    );
  }, []);
  ```

- **calculateSimulation**関数内の変更
  ```javascript
  // 小数点以下4桁まで対応
  additionalUnits = parseFloat((additionalAmount / priceInBaseCurrency).toFixed(4));
  ```

### 5.2 対応するデータタイプ

- **暗号資産**: Bitcoin, Ethereum等の小数単位での保有が一般的な資産
- **分数株**: 一株未満の単位で取引される株式
- **ETF/投資信託**: 正確な口数管理が必要な金融商品
- **外貨**: 小数点以下の単位での保有額管理

## 6. iOS風タブナビゲーションの詳細仕様（新規）

### 6.1 デザイン仕様

#### 6.1.1 タブバーの基本デザイン
- 画面下部に固定表示
- 半透明背景（backdrop-filter使用）
- アイコン＋テキストラベルの組み合わせ
- 選択状態は青色、非選択状態はグレー

#### 6.1.2 レイアウト構成
```html
<nav className="fixed bottom-0 left-0 right-0 tab-nav-ios border-t border-gray-200 z-10">
  <div className="grid grid-cols-4 h-16">
    <!-- タブアイテム -->
  </div>
  <div className="h-safe-bottom"></div> <!-- iPhoneのホームバー対応 -->
</nav>
```

#### 6.1.3 タブアイテム構成
- ホーム（ダッシュボード）
- 設定
- シミュレーション
- データ（データ連携）

#### 6.1.4 アイコンとラベル
各タブには専用のSVGアイコンとテキストラベルを表示。
```html
<div className="flex flex-col items-center justify-center">
  <div className="mb-1">
    <!-- SVGアイコン -->
  </div>
  <span className="text-xs font-medium">ラベル</span>
</div>
```

### 6.2 iPhoneセーフエリア対応

#### 6.2.1 ホームバー対応
```css
.h-safe-bottom {
  height: env(safe-area-inset-bottom, 0);
}
```

#### 6.2.2 コンテンツ領域の調整
```css
.ios-content-margin {
  margin-bottom: calc(4rem + env(safe-area-inset-bottom, 0));
}
```

#### 6.2.3 アニメーション効果
```css
.ios-animation {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 7. ローカル環境での実行手順

（既存の内容と同じ）

## 8. 本番環境へのデプロイ手順

（既存の内容と同じ）

## 9. 現在の制限事項と今後の開発計画

### 9.1 現在の制限事項

- Googleドライブ連携は完全なバックエンド実装なしでは限定的な機能のみ提供
- リアルタイムの同期機能は未実装
- ユーザーごとのデータ分離は現状フロントエンドのみで実装
- PortfolioContextの状態はブラウザリロード時に失われる（永続化必要）

### 9.2 今後の開発計画

1. ローカルストレージによるデータ永続化
2. Netlify Functionsを使用したGoogleドライブAPI完全連携
3. 複数ポートフォリオのクラウド保存と管理
4. 複数デバイス間でのリアルタイムデータ同期
5. 証券会社APIとの連携によるデータ自動更新
6. モバイル専用アプリの開発（React Native）
7. 共有ポートフォリオと共同編集機能
8. **暗号資産APIとの直接連携機能強化**
9. **保有資産のインポート/エクスポート機能強化**
10. **複数通貨間のレート計算機能の拡張**

## 10. 市場データ取得機能の詳細仕様

（既存の内容と同じ）

## 改訂履歴

版数 | 日付 | 改訂内容 | 担当者
-----|------|---------|-------
1.0 | 2025/03/12 | 初版作成 | 
2.0 | 2025/03/13 | Google認証とGoogleドライブ連携機能の追加 |
3.0 | 2025/03/14 | トラブルシューティングセクション追加、主要コンポーネント説明の強化、実装時の注意点を追記 |
4.0 | 2025/03/15 | 市場データ取得機能の拡張（複数データソース、エラー処理、通知システム）|
5.0 | 2025/03/16 | 保有数量の小数点以下4桁対応とiOS風タブバーナビゲーションの実装 |
