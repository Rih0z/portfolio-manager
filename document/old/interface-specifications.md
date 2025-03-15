# ポートフォリオマネージャー インターフェース仕様書

*本仕様書は、AIの別セッションでも開発を引き継げるよう設計されています。*

## 1. プロジェクト概要

「ポートフォリオマネージャー」は、資産管理を支援するWebアプリケーションです。ユーザーが保有資産と理想のポートフォリオ配分を比較・管理し、最適な資金配分のシミュレーションを実施できる環境を提供します。GoogleログインとGoogleドライブ連携機能を備え、複数デバイス間でのデータ共有をサポートします。

### 1.1 主要機能
- 資産管理（保有数の小数点以下4桁対応）
- 理想ポートフォリオ配分設定
- 資金配分シミュレーション
- データインポート/エクスポート
- Google認証・Googleドライブ連携
- 市場データの自動取得（複数ソース対応）
- iOS風タブバーによるナビゲーション

### 1.2 技術スタック
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

## 2. インターフェース構造

### 2.1 ページ構成
- **ダッシュボード** (`/`): 資産概要、グラフ、銘柄詳細
- **設定** (`/settings`): 銘柄追加、保有資産設定、目標配分設定
- **シミュレーション** (`/simulation`): 追加予算と購入シミュレーション
- **データ連携** (`/data`): インポート/エクスポート、Googleドライブ連携

### 2.2 ナビゲーション
- 画面下部固定のiOS風タブナビゲーション
- 4つのタブ（ホーム、設定、シミュレーション、データ）
- アイコンとテキストの組み合わせUI
- アクティブタブの視覚的強調（青色ハイライト）

### 2.3 レイアウト構造
```
+----------------------------------------+
|              ヘッダー                  |
| (通貨切替、データ更新、ユーザープロフィール) |
+----------------------------------------+
|                                        |
|             メインコンテンツ             |
|                                        |
|                                        |
|                                        |
+----------------------------------------+
|             タブナビゲーション           |
| [ホーム] [設定] [シミュレーション] [データ] |
+----------------------------------------+
```

## 3. 状態管理

### 3.1 コンテキスト設計
- **AuthContext**: 認証状態、ユーザー情報、Googleドライブ連携
- **PortfolioContext**: ポートフォリオデータ、資産情報、シミュレーション計算

### 3.2 主要な状態変数
- `baseCurrency`: 基準通貨 ('JPY' | 'USD')
- `exchangeRate`: 為替レート情報 ({ rate, source, lastUpdated })
- `currentAssets`: 保有資産の配列
- `targetPortfolio`: 目標配分の配列
- `additionalBudget`: 追加投資予算
- `isAuthenticated`: 認証状態
- `user`: ユーザー情報
- `notifications`: 通知メッセージの配列

### 3.3 データ構造
#### 保有資産 (Asset)
```typescript
interface Asset {
  id: string;
  name: string;
  ticker: string;
  exchangeMarket: string;
  price: number;
  currency: string;
  holdings: number; // 小数点以下4桁対応
  annualFee: number;
  lastUpdated?: string;
  source?: string;
}
```

#### 目標配分 (TargetAllocation)
```typescript
interface TargetAllocation {
  id: string;
  name: string;
  ticker: string;
  targetPercentage: number;
}
```

#### シミュレーション結果 (SimulationResult)
```typescript
interface SimulationResult {
  id: string;
  name: string;
  ticker: string;
  price: number;
  currency: string;
  targetPercentage: number;
  currentAmount: number;
  targetAmount: number;
  additionalAmount: number;
  additionalUnits: number; // 小数点以下4桁対応
  purchaseAmount: number;
  remark?: string;
}
```

## 4. コンポーネント仕様

### 4.1 ダッシュボード画面コンポーネント
- **PortfolioSummary**: 総資産、銘柄数、年間手数料の表示
- **PortfolioCharts**: 理想配分と現在配分の円グラフ
- **DifferenceChart**: 理想と現状の差分バーチャート
- **AssetsTable**: 保有資産の詳細テーブル
- **DataStatusBar**: データ更新状態と最終更新時刻の表示

### 4.2 設定画面コンポーネント
- **TickerSearch**: 銘柄検索と追加機能
- **PopularTickers**: 人気銘柄のワンクリック追加
- **HoldingsEditor**: 保有資産の編集（小数点4桁対応）
- **AllocationEditor**: 目標配分の編集

### 4.3 シミュレーション画面コンポーネント
- **BudgetInput**: 追加予算の入力と予算プリセット
- **SimulationResult**: シミュレーション結果表示と購入機能

### 4.4 データ連携画面コンポーネント
- **ExportOptions**: データエクスポート機能
- **ImportOptions**: データインポート機能
- **GoogleDriveIntegration**: Googleドライブ連携機能

### 4.5 共通コンポーネント
- **Header**: アプリヘッダー（通貨切替、更新ボタン）
- **TabNavigation**: iOS風タブナビゲーション
- **LoginButton**: Googleログインボタン
- **UserProfile**: ユーザープロフィール表示
- **ToastNotification**: 通知メッセージ表示

## 5. API・外部連携仕様

### 5.1 Yahoo Finance API連携
- **エンドポイント**: `/v7/finance/quote` (開発時プロキシ経由)
- **Netlify Functions**: 本番環境ではサーバーレス関数を使用
- **取得データ**: 銘柄情報、価格、為替レート
- **フォールバック**: API失敗時のデフォルト値使用

### 5.2 Alpha Vantage API（代替データソース）
- **エンドポイント**: `alpha-vantage-proxy`
- **機能**: Yahoo Finance APIのバックアップ
- **APIキー**: 環境変数 `REACT_APP_ALPHA_VANTAGE_KEY` で設定

### 5.3 Google OAuth認証
- **認証フロー**: ブラウザ上でのOAuth
- **スコープ**: ユーザー情報、Googleドライブアクセス
- **トークン管理**: localStorage保存、有効期限チェック

### 5.4 Googleドライブ連携
- **機能**: ポートフォリオデータの保存・読み込み
- **ファイル形式**: JSON
- **アクセス権**: アプリ固有のフォルダ内に保存

## 6. イベントフロー

### 6.1 銘柄追加フロー
1. ユーザーが銘柄シンボル入力 (TickerSearch)
2. `addTicker`関数呼び出し (PortfolioContext)
3. Yahoo Finance APIデータ取得 (fetchTickerData)
4. 保有資産と目標配分リストに追加
5. UI更新と結果通知

### 6.2 保有数量更新フロー
1. ユーザーが保有数量変更 (HoldingsEditor)
2. `updateHoldings`関数呼び出し (PortfolioContext)
3. 小数点以下4桁までの精度で保有数量更新
4. 資産評価額再計算
5. UI更新と結果通知

### 6.3 シミュレーション計算フロー
1. ユーザーが予算入力 (BudgetInput)
2. `calculateSimulation`関数実行 (PortfolioContext)
3. 各銘柄の目標額・不足額計算
4. 購入必要株数算出（小数点4桁対応）
5. シミュレーション結果表示 (SimulationResult)

### 6.4 購入実行フロー
1. ユーザーが購入ボタンクリック (SimulationResult)
2. 確認ダイアログ表示
3. `executePurchase`関数呼び出し (PortfolioContext)
4. 保有数量更新（現在値＋購入数）
5. UIの更新と結果通知

## 7. スタイリング規則

### 7.1 カラーパレット
- **プライマリ**: 青系 (#0088FE, #1E88E5, etc.)
- **アクセント**: 緑系 (#00C49F, #4CAF50, etc.)
- **警告**: 赤系 (#FF0000, #F44336, etc.)
- **背景**: 白/グレー系 (#FFFFFF, #F5F5F5, etc.)
- **テキスト**: 黒/グレー系 (#333333, #666666, etc.)

### 7.2 タイポグラフィ
- **フォント**: システムフォント（sans-serif）
- **見出し**: 16-20px、太字（font-bold）
- **本文**: 14-16px、通常（font-normal）
- **小テキスト**: 12px、軽量（font-light）

### 7.3 コンポーネントスタイル
- **カード**: 白背景、丸角、影付き
- **ボタン**: 背景色付き、丸角、ホバーエフェクト
- **入力フィールド**: 境界線付き、フォーカス時強調
- **テーブル**: 行の区切り線、隔行カラー、レスポンシブ

### 7.4 レスポンシブデザイン
- **モバイル優先**: 基本はモバイル表示に最適化
- **ブレークポイント**: sm(640px), md(768px), lg(1024px)
- **iOS互換**: セーフエリア対応、タブバー設計

## 8. エラー処理・通知

### 8.1 エラー種別
- **ネットワークエラー**: API接続失敗
- **認証エラー**: 認証失敗、トークン期限切れ
- **データエラー**: 不正なデータ形式、処理失敗
- **入力エラー**: バリデーション失敗

### 8.2 通知表示
- **成功通知**: 緑色背景、自動消去（5秒）
- **警告通知**: 黄色背景、自動消去（5秒）
- **エラー通知**: 赤色背景、手動消去可能
- **情報通知**: 青色背景、自動消去（5秒）

## 9. 開発環境設定

### 9.1 ローカル開発環境
1. リポジトリクローン
2. 依存パッケージインストール: `npm install`
3. 環境変数設定: `.env.local` 作成
   ```
   REACT_APP_GOOGLE_CLIENT_ID=あなたのGoogleクライアントID
   REACT_APP_ALPHA_VANTAGE_KEY=あなたのAlphaVantageAPIキー
   ```
4. 開発サーバー起動: `npm start`
5. ブラウザでアクセス: `http://localhost:3000`

### 9.2 必要な環境変数
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuthクライアントID
- `REACT_APP_ALPHA_VANTAGE_KEY`: Alpha Vantage APIキー（任意）

## 10. ビルド・デプロイ手順

### 10.1 ビルド手順
1. 環境変数の設定確認
2. 本番ビルド実行: `npm run build`
3. `build` ディレクトリに成果物生成

### 10.2 Netlifyデプロイ
#### CLIを使用
1. Netlify CLIインストール: `npm install -g netlify-cli`
2. ログイン: `netlify login`
3. デプロイ: `netlify deploy --prod`

#### ドラッグ＆ドロップ
1. Netlifyダッシュボードにアクセス
2. 「Sites」→「New site from upload」
3. `build` フォルダをドロップ

### 10.3 環境変数設定（Netlify）
1. サイト設定画面に移動
2. 「Build & deploy」→「Environment」
3. 以下の環境変数を追加:
   - `REACT_APP_GOOGLE_CLIENT_ID`
   - `REACT_APP_ALPHA_VANTAGE_KEY`
   - `ALPHA_VANTAGE_API_KEY` (Functions用)

## 11. 既知の問題と解決策

### 11.1 既知の問題
1. **保存データの消失**: ブラウザリロード時に状態が失われる
2. **ローカルストレージ非対応**: データの永続化が未実装
3. **Googleドライブ連携制限**: 完全なバックエンド実装なし
4. **API制限**: Yahoo FinanceとAlpha Vantageの制限あり

### 11.2 回避策・解決策
1. **データ消失対策**: 頻繁なエクスポート推奨、セッション終了前に保存
2. **API制限回避**: フォールバック値の使用、リトライ処理
3. **認証エラー対応**: 自動再ログイン機能
4. **エラー表示**: ユーザーにわかりやすいエラーメッセージ

## 12. 開発継続のためのリソース

### 12.1 コードリポジトリ
- GitHub/GitLabリポジトリURL（存在する場合）

### 12.2 デザインリソース
- Figma/Sketch設計URL（存在する場合）
- アイコンセット情報

### 12.3 APIドキュメント
- [Yahoo Finance API非公式ドキュメント](https://syncwith.com/yahoo-finance/yahoo-finance-api)
- [Alpha Vantage API公式ドキュメント](https://www.alphavantage.co/documentation/)
- [Google OAuth 2.0ドキュメント](https://developers.google.com/identity/protocols/oauth2)

### 12.4 ライブデモ
- デモサイトURL（存在する場合）

---

## 付録A: コンポーネント関係図

```
App
├── AuthProvider
│   └── PortfolioProvider
│       ├── Header
│       │   ├── CurrencyToggle
│       │   ├── RefreshButton
│       │   └── UserProfile/LoginButton
│       ├── Router
│       │   ├── Dashboard
│       │   │   ├── PortfolioSummary
│       │   │   ├── PortfolioCharts
│       │   │   ├── DifferenceChart
│       │   │   └── AssetsTable
│       │   ├── Settings
│       │   │   ├── TickerSearch
│       │   │   ├── PopularTickers
│       │   │   ├── HoldingsEditor
│       │   │   └── AllocationEditor
│       │   ├── Simulation
│       │   │   ├── BudgetInput
│       │   │   └── SimulationResult
│       │   └── DataIntegration
│       │       ├── ExportOptions
│       │       ├── ImportOptions
│       │       └── GoogleDriveIntegration
│       └── TabNavigation
```

## 付録B: ステート状態遷移図

```
初期状態
└── 銘柄追加
    ├── 目標配分設定
    │   └── 保有数量設定
    │       ├── シミュレーション実行
    │       │   └── 購入実行
    │       │       └── 更新された保有数量
    │       └── データエクスポート
    └── データインポート
        └── インポートされた状態
```

## 付録C: データフローダイアグラム

```
外部API ──────┐
               │
ユーザー入力 ───┼──> Context State ──> UI Components ──> ユーザー表示
               │
ローカルストレージ ┘
```
