# ポートフォリオマネージャー 総合仕様書（AWS APIサービス連携対応版）

**ファイルパス:** document/specifications.md  
**最終更新日時:** 2025-05-20 16:00

## 1. プロジェクト概要

「ポートフォリオマネージャー」は、資産管理を支援するWebアプリケーションです。ユーザーが保有資産と理想のポートフォリオ配分を比較・管理し、最適な資金配分のシミュレーションを実施できる環境を提供します。ブラウザのローカルストレージを活用したデータ永続化およびGoogleログインとGoogleドライブ連携機能を備え、複数デバイス間でのデータ共有をサポートします。バックエンド機能をAWSに移行し、Cloudflare Pagesにホストされるフロントエンドアプリはそれらのサービスと連携しています。

### 1.1 主要機能
- 資産管理（保有数の小数点以下4桁対応）
- 銘柄タイプ自動判定（個別株、ETF、インデックスファンド、投資信託など）
- 年間手数料率の自動推定と計算（個別株は0%固定、投資信託は信託報酬として表示）
- 年間配当金の計算と配当情報の管理
- 理想ポートフォリオ配分設定
- 複数通貨（円/ドル）対応の資金配分シミュレーション
- 購入可能株数の計算表示
- AI分析機能（ポートフォリオデータをAIアシスタントに分析させるプロンプト生成）
- データインポート/エクスポート
- ブラウザローカルストレージによるデータ永続化（URIエンコード+Base64による安全な暗号化）
- Google認証・Googleドライブ連携（AWS上のバックエンドAPI経由）
- 市場データの自動取得（AWS上の市場データAPIサーバーから取得）
- iOS風タブバーによるナビゲーション
- 自動消去機能付き通知システム
- エラーバウンダリによるアプリケーション耐障害性の向上

### 1.2 技術スタック
- **フロントエンド**: React.js 18.x
- **デプロイ**: Cloudflare Pages
- **認証**: Google OAuth 2.0 認可コードフロー (@react-oauth/google 0.11.0)
- **スタイリング**: Tailwind CSS 3.x
- **ステート管理**: React Context API
- **ルーティング**: React Router 6.x
- **データ可視化**: Recharts 2.x
- **API通信**: Axios 1.x, Fetch API
- **ユーティリティ**: Lodash 4.x, Day.js 1.x
- **データ処理**: PapaParse 5.x (CSV処理)
- **UI拡張**: @headlessui/react 1.x
- **データ永続化**: ローカルストレージ（URIエンコード+Base64暗号化）
- **クラウド連携**: AWS上のバックエンドAPIを介したGoogle Drive API連携
- **市場データ取得**: AWS上の市場データAPIサーバー（`REACT_APP_MARKET_DATA_API_URL`）
- **認証セキュリティ**: HTTP-Onlyクッキーによるセッション管理
- **環境管理**: 環境固有の設定ファイル（`.env.development`、`.env.production`）

## 2. インターフェース構造

### 2.1 ページ構成
- **ダッシュボード** (`/`): 資産概要、グラフ、銘柄詳細
- **設定** (`/settings`): 銘柄追加、保有資産設定、目標配分設定、AIプロンプト設定
- **シミュレーション** (`/simulation`): 追加予算と購入シミュレーション（複数通貨対応、購入株数表示）、AI分析プロンプト
- **データ連携** (`/data`): インポート/エクスポート、データ同期、Googleドライブ連携

### 2.2 ナビゲーション
- 画面下部固定のiOS風タブナビゲーション
- 4つのタブ（ホーム、設定、シミュレーション、データ）
- アイコンとテキストの組み合わせUI
- アクティブタブの視覚的強調（青色ハイライト）
- セーフエリア対応（iPhoneのホームバーなど）

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
|         セーフエリア（ホームバー用）       |
+----------------------------------------+
```

### 2.4 エラーバウンダリ
- アプリケーション全体をエラーバウンダリでラップ
- 予期しないエラー発生時にアプリケーションのクラッシュを防止
- ユーザーフレンドリーなエラー表示画面
- リロードボタンによる復旧機能

### 2.5 通知システム
- 画面右下に固定表示される通知パネル
- 通知のタイプに応じた色分け表示
  - 成功：緑色背景
  - 警告：黄色背景
  - エラー：赤色背景
  - 情報：青色背景
- 自動消去機能付き
  - 情報、成功、警告通知：5秒後に自動消去
  - エラー通知：ユーザーによる手動消去が必要
- 各通知には手動で閉じるボタン（×）を表示
- 同時に複数の通知を表示可能
- スタック表示で新しい通知が下に追加される

### 2.6 データソース表示
- 銘柄データのソースを明示的に表示
  - Market Data API：青色バッジ
  - Fallback：黄色バッジ
- 更新時にデータソースの利用状況を通知
  - 例：「市場データを更新しました: Market Data API: 8件、Fallback: 2件」
- フォールバック使用時は注意喚起表示
- 株価情報の信頼性をユーザーが判断できるようサポート

## 3. 状態管理

### 3.1 コンテキスト設計
- **AuthContext**: 認証状態、ユーザー情報、Googleドライブ連携、PortfolioContextへの参照
- **PortfolioContext**: ポートフォリオデータ、資産情報、配当情報、シミュレーション計算、手数料管理、ローカルストレージ操作、AIプロンプトテンプレート

### 3.2 コンテキスト間の連携
- **ContextConnector**: AuthContextとPortfolioContextの相互参照を管理するコンポーネント
- **setPortfolioContextRef**: AuthContextがPortfolioContextへの参照を保持するための関数
- **handleAuthStateChange**: 認証状態変更時にPortfolioContextに通知するための関数

### 3.3 主要な状態変数
- `baseCurrency`: 基準通貨 ('JPY' | 'USD')
- `exchangeRate`: 為替レート情報 ({ rate, source, lastUpdated })
- `currentAssets`: 保有資産の配列（配当情報を含む）
- `targetPortfolio`: 目標配分の配列
- `additionalBudget`: 追加投資予算情報（金額と通貨）
- `aiPromptTemplate`: AI分析プロンプトのテンプレート
- `isAuthenticated`: 認証状態
- `user`: ユーザー情報
- `notifications`: 通知メッセージの配列
- `dataSource`: データソース ('local' | 'cloud')
- `lastSyncTime`: 最終同期時間
- `initialized`: 初期化完了フラグ
- `hasError`: エラー状態（エラーバウンダリ用）
- `totalAssets`: 総資産額
- `annualFees`: 年間手数料合計
- `annualDividends`: 年間配当金合計

### 3.4 データ構造
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
  annualFee: number; // 年間手数料率（%）- 個別株は常に0%
  fundType: string; // ファンドの種類 (ETF_JP, INDEX_US, STOCK など)
  isStock: boolean; // 個別株かどうかのフラグ
  isMutualFund: boolean; // 投資信託かどうかのフラグ
  feeSource: string; // 手数料情報の出所 ('個別株', '投資信託', 'ティッカー固有の情報', 'ファンドタイプからの推定', 'ユーザー設定')
  feeIsEstimated: boolean; // 手数料情報が推定値かどうか
  region?: string; // 対象地域 ('日本', '米国', 'グローバル', '不明')
  lastUpdated?: string;
  source?: string; // データソース名 ('Market Data API', 'Fallback')
  dividendYield: number; // 配当利回り（%）
  hasDividend: boolean; // 配当があるかどうか
  dividendFrequency: string; // 配当頻度（'monthly', 'quarterly', 'semi-annual', 'annual'）
  dividendIsEstimated: boolean; // 配当情報が推定値かどうか
  priceLabel?: string; // 価格表示ラベル ('株価' | '基準価額')
}
```

#### 追加予算
```typescript
interface BudgetInfo {
  amount: number;      // 金額
  currency: string;    // 通貨 ('JPY' | 'USD')
}

additionalBudget: BudgetInfo;
```

#### シミュレーション結果
```typescript
interface SimulationResult {
  ticker: string;         // 銘柄シンボル
  name: string;           // 銘柄名
  currentAllocation: number; // 現在の配分率（%）
  targetAllocation: number;  // 目標配分率（%）
  diff: number;           // 差分（%）
  currentValue: number;   // 現在の保有価値
  purchaseAmount: number; // 推奨購入金額
  purchaseShares: number; // 購入可能株数
  price: number;          // 現在の株価/基準価額
  currency: string;       // 通貨 ('JPY' | 'USD')
  isMutualFund: boolean;  // 投資信託かどうか
  source: string;         // データソース
}
```

#### AI分析用のデータ構造
```typescript
// AIプロンプトで使用する配分情報
interface AllocationItem {
  ticker: string;        // 銘柄シンボル
  name: string;          // 銘柄名
  percentage: number;    // 配分率（%）
}

// 現在のポートフォリオ配分
currentAllocation: AllocationItem[];

// 目標ポートフォリオ配分
targetAllocation: AllocationItem[];
```

#### 通知メッセージ
```typescript
interface Notification {
  id: number; // タイムスタンプをIDとして使用
  message: string; // 表示メッセージ
  type: 'info' | 'success' | 'warning' | 'error'; // 通知タイプ
}
```

#### ローカルストレージデータ
```typescript
interface StorageData {
  baseCurrency: string;
  exchangeRate: object;
  lastUpdated: string;
  currentAssets: Asset[];
  targetPortfolio: TargetAllocation[];
  additionalBudget: BudgetInfo;
  aiPromptTemplate: string; // AIプロンプトテンプレート
  version: string; // データバージョン管理用
  timestamp: string; // 保存日時
}
```

## 4. コンポーネント仕様

### 4.1 ダッシュボード画面コンポーネント
- **PortfolioSummary**: 総資産、銘柄数、年間手数料、年間配当金の表示
  - 最高/最低手数料率の銘柄を表示
  - 最高配当利回りの銘柄を表示
  - ファンドタイプ別の手数料統計を表示
  - ファンドタイプ別の配当金統計を表示
  - 投資信託の信託報酬を適切に表示
  - 手数料と配当についての説明を表示
- **PortfolioCharts**: 理想配分と現在配分の円グラフ
- **DifferenceChart**: 理想と現状の差分バーチャート
- **AssetsTable**: 保有資産の詳細テーブル
  - データソースと銘柄タイプの表示
  - 年間手数料の表示（個別株は0%、投資信託は信託報酬として表示）
  - 配当情報の表示（利回り、頻度、年間配当金）
  - 配当情報源のバッジ表示（推定値/確定値）
  - データソースのバッジ表示
  - 投資信託専用の表示（基準価額ラベル）
- **DataStatusBar**: データ更新状態と最終更新時刻の表示

### 4.2 設定画面コンポーネント
- **TickerSearch**: 銘柄検索と追加機能
  - 投資信託コードの自動認識と入力補助
- **PopularTickers**: 人気銘柄のワンクリック追加
  - インデックスファンド・ETFカテゴリ
  - 個別株カテゴリ
  - 日本市場カテゴリ
  - 投資信託カテゴリ
- **HoldingsEditor**: 保有資産の編集
  - 保有数量編集（小数点4桁対応）
  - 年間手数料率表示（個別株は編集不可）
  - 投資信託は信託報酬として表示
  - 銘柄タイプの表示
  - 手数料情報源を表示（個別株、投資信託、推定値、固有情報、ユーザー設定）
  - 配当情報の表示（利回り、頻度）
  - 配当情報源のバッジ表示
  - データソースのバッジ表示
- **AllocationEditor**: 目標配分の編集
- **AiPromptSettings**: AIプロンプトテンプレートの設定
  - テンプレートの編集・カスタマイズ機能
  - デフォルトテンプレートへのリセット機能
  - プレースホルダー説明の表示
  - テンプレート保存機能
  - 使用方法の説明

### 4.3 シミュレーション画面コンポーネント
- **BudgetInput**: 追加予算の入力と予算プリセット
  - 直接入力と増減ボタン
  - 通貨選択機能（円/ドル）
  - 通貨ごとの予算プリセットボタン
    - 円: 10万、30万、50万、100万
    - ドル: 1000、3000、5000、10000
  - 通貨に応じた入力の検証（最小値、最大値）
  - 現在の基本通貨設定をデフォルト値として使用
  - アクセシビリティ対応済み（ラベルと入力フィールドの関連付け）
  
- **SimulationResult**: シミュレーション結果表示と購入機能
  - 各銘柄の現在配分と目標配分の表示
  - 推奨購入金額の表示
  - 購入可能株数の表示
  - 株価/基準価額の表示
  - 銘柄ごとの通貨表示
  - 自動的な通貨換算結果の表示
  - 為替レートの明示的な表示
  
- **AiAnalysisPrompt**: AI分析プロンプト生成
  - 現在のポートフォリオデータを元にしたプロンプト生成
  - クリップボードへのコピー機能
  - プロンプト全文/概要表示の切り替え機能
  - 使用方法の説明表示
  - 現在の通貨設定に応じたプロンプト生成（通貨に合わせた金額表示）
  - エラー処理（データ不足時の対応）

### 4.4 データ連携画面コンポーネント
- **ExportOptions**: データエクスポート機能
  - JSON/CSV形式選択
  - ファイルダウンロードとクリップボードコピー
  - アクセシビリティ対応済み（ラジオグループの適切な構造化）
- **ImportOptions**: データインポート機能
  - JSON/CSV形式選択
  - ファイル/クリップボード/テキスト入力による取り込み
  - アクセシビリティ対応済み
- **GoogleDriveIntegration**: Googleドライブ連携機能（AWS APIサービス連携版）
  - ログイン状態表示
  - クラウド保存/読み込みボタン
  - データ同期ステータス表示
  - 同期ボタン
  - ファイル一覧表示と選択機能
  - AWS上のバックエンドAPI経由でのファイル操作
  - 認証エラー処理
  - 環境に応じたAPIエンドポイント自動選択
  - リトライ機能付きの通信処理
- **DataErrorRecovery**: データ修復機能
  - ローカルストレージのクリア機能
  - データリセット機能
  - エラー報告表示

### 4.5 共通コンポーネント
- **Header**: アプリヘッダー（通貨切替、更新ボタン）
- **TabNavigation**: iOS風タブナビゲーション
- **LoginButton**: Googleログインボタン（認可コードフロー対応）
  - flow="auth-code" 設定
  - ローディング状態表示
  - エラーメッセージ表示
  - 環境に応じたリダイレクトURI設定
- **UserProfile**: ユーザープロフィール表示
  - プロフィール画像表示
  - ユーザー名表示
  - ログアウトボタン（バックエンドセッション終了処理）
- **ToastNotification**: 通知メッセージ表示
  - 自動消去タイマー機能（情報/成功/警告通知は5秒後に自動消去）
  - 手動消去ボタン
  - 通知タイプ別のスタイリング
- **DataSourceBadge**: データソース表示バッジ
  - 各データソースに応じた表示（Market Data API、Fallback）
  - ソースに応じた色分け
- **ErrorBoundary**: エラーバウンダリコンポーネント
  - エラー発生時の処理
  - リロード機能
  - エラー詳細表示

### 4.6 ユーティリティコンポーネント
- **FundTypeBadge**: ファンドタイプを表示するバッジ
- **FeeSourceBadge**: 手数料情報の出所を表示するバッジ
- **DividendBadge**: 配当情報を表示するバッジ
- **PriceDisplay**: 株価/基準価額を適切に表示するコンポーネント
- **ContextConnector**: コンテキスト間の連携を管理するコンポーネント

## 5. 市場データ取得システム仕様

### 5.1 市場データソース構成
- **市場データソース**: AWS上の市場データAPIサーバー（`REACT_APP_MARKET_DATA_API_URL`）
  - 米国株、日本株、投資信託、ETFのデータを一元的に提供
  - 株価/基準価額、銘柄情報、配当情報、手数料情報を取得
  - 環境変数による異なる環境（開発/本番）の切り替え

- **データ取得フロー**:
  1. 銘柄タイプを自動判別（個別株、ETF、投資信託など）
  2. タイプに応じたリクエストパラメータを構築
  3. AWS上の市場データAPIを呼び出し
  4. 失敗した場合はフォールバック値を使用

### 5.2 データ取得機能
- **株価/基準価額取得**: 各銘柄の最新価格データを取得
- **銘柄情報取得**: 銘柄名や市場情報などの基本データを取得
- **配当情報取得**: 配当利回りや配当頻度の情報を取得
- **手数料情報推定**: 銘柄タイプに基づいて年間手数料率を推定
- **データソース管理**: 各銘柄のデータソースを記録・表示

### 5.3 APIエンドポイント
- **基本URL**: `${REACT_APP_MARKET_DATA_API_URL}/${API_STAGE}/api/${path}`
- **主要エンドポイント**:
  - 市場データ: `/api/market-data`
  - 管理者ステータス: `/admin/status`
  - 使用量リセット: `/admin/reset`

### 5.4 エラーハンドリング
- **リトライメカニズム**: 設定回数のリトライと指数バックオフを実装
- **タイムアウト設定**: 銘柄タイプに応じたタイムアウト設定
  - 米国株: 10秒
  - 日本株: 20秒
  - 投資信託: 20秒
  - 為替レート: 5秒
- **フォールバック値**: API取得失敗時にデフォルト値を提供

## 6. 為替レート管理機能

### 6.1 為替レート取得
- **取得ソース**: AWS上の市場データAPI（`REACT_APP_MARKET_DATA_API_URL`）
- **最終バックアップ**: デフォルト固定値（150.0）
- **取得タイミング**:
  - アプリケーション起動時
  - 通貨切替時
  - データ更新ボタンクリック時
  - シミュレーション実行前（前回取得から15分以上経過している場合）
- **キャッシュ期間**: 最大15分間

### 6.2 通貨変換機能
- **変換処理**: 円⇔ドルの相互変換（為替レートを使用）
- **エラーハンドリング**: 変換エラー時にフォールバック値を使用
- **表示フォーマット**: 通貨に応じた適切な表示（円は整数、ドルは小数点2桁）
- **通貨記号表示**: 円は¥、ドルは$

### 6.3 通貨関連UI機能
- **基本通貨切替**: アプリ全体の表示通貨をJPY/USDで切り替え
- **予算通貨選択**: シミュレーション時の入力通貨を選択
- **為替レート表示**: 現在使用中の為替レート値とソースを表示
- **通貨換算表示**: 異なる通貨の資産を基本通貨に換算して表示

## 7. AI分析機能

### 7.1 機能概要
- **目的**: ユーザーのポートフォリオデータをAIアシスタントに分析させるためのプロンプトを生成
- **対応AIモデル**: Claude、ChatGPT、Geminiなど任意のAIアシスタント
- **分析内容**: 
  - 現在のポートフォリオ構成と理想構成の比較
  - 各銘柄の評価と見通し
  - ポートフォリオ全体のリスク分散、地域分散、セクター分散分析
  - 6ヶ月投資プランと継続投資戦略の提案

### 7.2 通貨対応
- **基本通貨連動**: アプリの表示通貨設定（円/ドル）に合わせてプロンプトを生成
  - アプリが円表示の場合: すべての金額を円ベースで計算・表示
  - アプリがドル表示の場合: すべての金額をドルベースで計算・表示
- **為替レート情報**: プロンプト内に現在の為替レート情報を含める
- **通貨変換**: 異なる通貨の資産を適切に変換して配分率を計算

### 7.3 プロンプト構成
- **初期情報**: 総資産額、毎月の投資予定額（対応する通貨表示）
- **現状配分**: 現在のポートフォリオ配分率（%）と銘柄名の一覧
- **目標配分**: 理想的なポートフォリオ配分率（%）と銘柄名の一覧
- **分析ガイドライン**: AIが実施すべき分析内容の詳細指示
- **出力フォーマット**: マークダウン形式での分析結果の構造指定
  - 個別銘柄分析表
  - ポートフォリオ全体評価
  - 具体的な投資プラン
  - 継続投資戦略

### 7.4 テンプレートカスタマイズ
- **カスタマイズ可能項目**: プロンプト全体の内容とフォーマット
- **プレースホルダー**: 実際のデータに置き換えられる変数
  - `{totalAssets}`: 総資産額
  - `{baseCurrency}`: 基本通貨
  - `{monthlyBudget}`: 毎月の投資予定額
  - `{budgetCurrency}`: 予算通貨
  - `{currentAllocation}`: 現在のポートフォリオ配分
  - `{targetAllocation}`: 目標ポートフォリオ配分
- **保存機能**: カスタマイズしたテンプレートをローカルストレージに保存
- **リセット機能**: デフォルトテンプレートに戻す機能

### 7.5 使用フロー
1. シミュレーションタブでAI分析プロンプトセクションを確認
2. 「プロンプトをコピー」ボタンをクリックしてクリップボードにコピー
3. 任意のAIアシスタント（Claude、ChatGPT、Geminiなど）を開く
4. クリップボードの内容を貼り付けて送信
5. AIが自動的にポートフォリオの分析と提案を実行

### 7.6 エラーハンドリング
- **データ不足時**: 適切なメッセージを表示（「保有資産がありません」など）
- **ゼロ配分時**: エラーメッセージではなく情報メッセージを表示
- **通貨変換エラー**: デフォルト値（150.0）を使用して計算を継続

## 8. データ永続化と同期

### 8.1 ローカルストレージ
- **データ暗号化**: URIエンコーディングを含むBase64エンコーディングによる安全な暗号化
- **保存タイミング**: 
  - 資産情報変更時
  - 目標配分変更時
  - 基本通貨変更時
  - AIプロンプトテンプレート変更時
- **バージョン管理**: データ構造のバージョンを記録し、互換性を確保
- **エラー復旧**: 破損データの検出と修復機能

### 8.2 Google Drive連携（AWS APIサービス連携版）
- **認証**: Google OAuth 2.0認可コードフローによるバックエンド連携認証
  - クライアントはコードを取得、AWS上のバックエンドでトークン交換
  - HTTP-Onlyクッキーによるセッション管理
  - XSS攻撃からの保護強化
  - 環境に応じたエンドポイント自動選択
- **ファイル操作**: 
  - AWS上のバックエンドAPIを経由したGoogleドライブ操作
  - 特定フォルダへのデータ保存
  - ファイルの自動命名（アプリ名+タイムスタンプ）
  - 最新データの取得と適用
  - リトライ機能付きの通信処理
- **同期フロー**: 
  1. ユーザーがGoogleアカウントでログイン
  2. AWS上のバックエンドがGoogle APIと連携してファイル一覧を取得
  3. 最新ファイルの内容を取得
  4. ローカルデータと同期・マージ
- **新機能**: useGoogleDriveフックによる操作のカプセル化
  - ファイル一覧取得、保存、読み込み機能の分離
  - エラーハンドリングの強化
  - ローディング状態管理

### 8.3 データインポート/エクスポート
- **エクスポート形式**: 
  - JSON: 完全なデータ構造を保持
  - CSV: 一部のデータのみ（互換性向上のため）
- **インポート方法**: 
  - ファイルアップロード
  - クリップボードからのペースト
  - テキスト入力
- **バリデーション**: インポートデータの構造と値の検証
- **エラー処理**: 不正なデータの検出と適切なエラーメッセージの表示

## 9. セキュリティ

### 9.1 データ保護
- **ローカルストレージ暗号化**: Base64+URIエンコーディングによる基本的な保護
- **認証情報管理**: HTTP-Onlyクッキーを使用した安全なセッション管理
- **HTTPS通信**: すべてのAPI通信でHTTPS使用
- **CSRF保護**: バックエンドでCSRF対策の実装

### 9.2 API連携
- **API Key管理**: 管理者APIキーの安全な管理（環境変数による設定）
- **レート制限対応**: API呼び出し頻度の制限と適切なエラーハンドリング
- **フォールバック機構**: API障害時の代替処理

### 9.3 エラー処理
- **エラーログ**: 詳細なエラー情報の記録（デバッグ用）
- **ユーザー通知**: ユーザーフレンドリーなエラーメッセージの表示
- **リカバリオプション**: データリセットやエラー復旧のための機能提供

## 10. アクセシビリティ

### 10.1 キーボードアクセス
- **タブ移動**: すべての操作要素にタブでアクセス可能
- **ショートカット**: 主要機能へのキーボードショートカット提供

### 10.2 スクリーンリーダー対応
- **ARIA属性**: 適切なARIA属性の使用
- **セマンティックHTML**: 意味のあるマークアップ構造
- **フォーム要素**: ラベルと入力フィールドの関連付け

### 10.3 表示の柔軟性
- **カラーコントラスト**: 十分なコントラスト比の確保
- **フォントサイズ**: ブラウザの拡大機能に対応したレイアウト
- **タッチ操作**: モバイルデバイスでの適切なタッチターゲットサイズ

## 11. 環境変数設定

### 11.1 環境変数一覧
- **`REACT_APP_MARKET_DATA_API_URL`**: AWS上の市場データAPIサーバーのベースURL
- **`REACT_APP_API_STAGE`**: APIのステージ環境（'dev'、'prod'など）
- **`REACT_APP_ADMIN_API_KEY`**: 管理者API用認証キー
- **`REACT_APP_GOOGLE_CLIENT_ID`**: Google OAuth認証用クライアントID
- **`REACT_APP_DEFAULT_EXCHANGE_RATE`**: フォールバック用デフォルト為替レート

### 11.2 環境固有の設定ファイル
AWS APIサービス連携のために、環境固有の設定ファイルを導入しました：

- **`.env.development`**: 開発環境用の環境変数設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://dev-api.example.com
  REACT_APP_API_STAGE=dev
  REACT_APP_ADMIN_API_KEY=dev_admin_api_key
  REACT_APP_GOOGLE_CLIENT_ID=your_dev_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

- **`.env.production`**: 本番環境用の環境変数設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://api.example.com
  REACT_APP_API_STAGE=prod
  REACT_APP_ADMIN_API_KEY=prod_admin_api_key
  REACT_APP_GOOGLE_CLIENT_ID=your_prod_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

### 11.3 環境ユーティリティの使用
環境判定と環境依存値の取得を抽象化するために`envUtils.js`を追加しました：

```javascript
// 環境変数からAPI基本URLを取得
const apiBaseUrl = getApiBaseUrl();
// 環境変数からAPIステージを取得
const apiStage = getApiStage();
// 環境に依存しないAPIエンドポイント生成
const apiEndpoint = buildApiEndpoint('api/market-data');
```

## 12. 確認が必要なソースコード

以下のソースコードの確認が推奨されます：

### 12.1 環境・API関連
- **`src/utils/envUtils.js`**: **新規追加** - 環境判定と環境依存値の処理
- **`src/utils/apiUtils.js`**: **新規追加** - API呼び出し共通処理
- **`src/services/marketDataService.js`**: 市場データ取得サービス（AWS APIサービス連携用）
- **`src/setupProxy.js`**: 開発環境用プロキシ設定（AWS APIサービス連携用）

### 12.2 認証・同期関連
- **`src/hooks/useGoogleDrive.js`**: **新規追加** - Google Drive連携フック
- **`src/context/AuthContext.js`**: 認証コンテキスト（AWS APIサービス連携用）
- **`src/components/auth/LoginButton.jsx`**: Googleログインボタン（認可コードフロー対応）
- **`src/components/data/GoogleDriveIntegration.jsx`**: Googleドライブ連携コンポーネント（AWS APIサービス連携用）

### 12.3 既存機能関連
- **`src/context/PortfolioContext.js`**: PortfolioContextに認証状態変更ハンドラと連携機能を追加
- **`src/services/api.js`**: API関連のエントリーポイント（環境ユーティリティ対応）
- **`src/services/adminService.js`**: 管理者向けAPIサービス（環境ユーティリティ対応）

## 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2025/03/06 | 初版作成 | |
| 2.0 | 2025/03/15 | ポートフォリオ管理機能、データ永続化機能の詳細追加 | |
| 3.0 | 2025/03/27 | 複数データソース対応とスクレイピング機能の詳細追加、コンポーネント仕様の詳細化 | |
| 4.0 | 2025/03/30 | マルチ通貨シミュレーション対応機能（円/ドル）と購入株数表示機能を追加 | |
| 5.0 | 2025/05/08 | AI分析機能（ポートフォリオデータをAIアシスタントに分析させるプロンプト生成機能）を追加 | Claude |
| 6.0 | 2025/05/12 | リファクタリング - スクレイピング機能を削除し、単一市場データAPIサーバーに集約。環境変数名を`REACT_APP_MARKET_DATA_API_URL`に変更 | Claude |
| 6.1 | 2025/05/20 | バックエンド機能のAWS移行対応 - Netlifyでホストされるフロントエンドからバックエンド機能の一部をAWSに移行。環境固有設定ファイルの導入、環境判定ユーティリティ、API通信の標準化、リトライ機能の強化、新規フックの追加 | Claude |
