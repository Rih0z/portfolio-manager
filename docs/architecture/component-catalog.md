# Component Catalog

PortfolioWise フロントエンドのコンポーネントおよびページの一覧。
各ファイルのソースコードを実際に読み取り、説明を記載している。

---

## コンポーネント一覧

### ai/ — AI分析・プロンプト生成機能

外部AIサービス（Claude / Gemini / ChatGPT）との連携を支援するコンポーネント群。プロンプト生成、コピー、分析結果の取り込みを担う。

| Component | Description |
|-----------|-------------|
| AIDataImportModal.tsx | AI投資戦略から返却されたYAMLデータをインポートするモーダル。複数のパース戦略（標準YAML、説明文除去、JSON、カスタム形式）でフォールバック解析を行う |
| AnalysisPerspectiveTabs.tsx | リスク分析・コスト最適化・成長戦略の3観点をタブ切替で表示し、各観点ごとに最適化されたAI分析プロンプトを生成する |
| CopyToClipboard.tsx | テキストをクリップボードにコピーする再利用可能コンポーネント。ボタンモード/アイコンモードの切替に対応し、コピー成功時のフィードバックを表示する |
| ExternalAILinks.tsx | Claude・Gemini・ChatGPTへの「コピーして開く」リンクカード。クリップボードにプロンプトをコピーしてから外部AIサービスを新タブで開く |
| PromptOrchestrator.tsx | ユーザーの状況に応じてパーソナライズされたAIプロンプトを動的生成する。プロンプト履歴管理、AI選択、5段階フィードバック評価機能を含む |
| ScreenshotAnalyzer.tsx | 外部AIで分析された結果テキストを受け取り、構造化データに変換する。プライバシー保護のためスクリーンショットのアップロードは行わず、JSON/テキスト解析で対応 |
| StrengthsWeaknessCard.tsx | ポートフォリオスコアの最強/最弱指標をローカル計算で1行ずつ表示するカード。「AI分析を見る」リンクで /ai-advisor へナビゲートする |

### auth/ — 認証・ログイン機能

Google OAuth認証フロー（One Tap / Authorization Code）とユーザープロフィール表示を担う。

| Component | Description |
|-----------|-------------|
| LoginButton.tsx | Google One Tap認証を使用したログインボタン。GoogleOAuthProviderでラップし、ログイン後にGoogle Drive連携を自動開始する |
| OAuthLoginButton.tsx | Google OAuth2.0認可コードフローを使用した統合ログインボタン。Drive権限を必須スコープとして含み、compact/fullの2モードに対応。callbackパラメータの処理も内包 |
| UserProfile.tsx | ログインユーザーのプロフィール表示。アバター画像、ユーザー名、ログアウトボタンを表示する |

### common/ — 共通UIコンポーネント

アプリ全体で再利用される汎用コンポーネント群。

| Component | Description |
|-----------|-------------|
| DataSourceBadge.tsx | 各種データソース（Alpaca、Yahoo Finance、exchangerate.host、Cache等）に応じた色分けバッジとLucideアイコンを表示する |
| ErrorBoundary.tsx | Reactエラーバウンダリ。子コンポーネントの例外をキャッチしてフォールバックUIを表示し、Sentryへのエラー送信とリトライ機能を提供する |
| InitialSetupWizard.tsx | 初回利用時の設定ウィザード（1画面統合版）。通貨・予算・投資対象市場を1画面で設定可能。ブラウザロケールからの通貨自動検出とスキップ機能あり |
| LanguageSwitcher.tsx | 日本語/英語の言語切替ドロップダウン。i18nextのchangeLanguageを呼び出してアプリ全体の表示言語を切り替える |
| LoadingFallback.tsx | React.Suspenseのfallback用ローディングUI。スピナーアニメーションとメッセージを表示し、ルートベースのコード分割時に使用 |
| SettingsChecker.tsx | 設定の有無をチェックし、保有資産・目標配分・予算がすべて未設定かつ初期設定未完了の場合はAIアドバイザーページへリダイレクトする |
| ToastNotification.tsx | 成功/エラー/警告/情報の各種メッセージを画面上部または下部に一定時間表示するトースト通知。自動消去とユーザー操作による消去に対応 |
| UpgradePrompt.tsx | Freeプランの使用量上限到達時にStandardプランへのアップグレードを誘導するUI。inline（コンパクト）とbanner（フルサイズ）の2バリアントに対応 |

### dashboard/ — ダッシュボード表示

ポートフォリオの可視化・スコアリング・エンゲージメント機能を集約したダッシュボードコンポーネント群。

| Component | Description |
|-----------|-------------|
| AssetsTable.tsx | 保有資産の詳細テーブル。各銘柄の名前、価格、保有数、評価額、現在/目標割合、差分、年間手数料、配当情報を通貨換算済みで表示する |
| DifferenceChart.tsx | 現在配分と目標配分のパーセントポイント差を棒グラフで表示。rechartsのBarChartで各銘柄の過不足を視覚化する |
| DividendForecast.tsx | 年間配当予測カード。月別配当バーチャート、配当上位銘柄、月別詳細内訳、利回りランキングの3タブ構成。加重平均配当利回りを計算・表示 |
| PnLSummary.tsx | ポートフォリオ損益サマリーカード。総投資額、参考評価額、参考損益（金額+%）、前日比を表示。価格履歴APIから取得したデータに基づく |
| PnLTrendChart.tsx | ポートフォリオ全体の資産推移をエリアチャートで表示。1W/1M/3M/6M/1Y/YTDの期間切替に対応し、上昇/下降で色分けする |
| PortfolioCharts.tsx | 理想配分と現在配分を左右並びのドーナツチャート（PieChart）で表示し、資産配分の差異を視覚的に比較する |
| PortfolioScoreCard.tsx | 100点満点のポートフォリオスコアをCircularProgressで表示。各指標を横バーで可視化し、Free/Standardプランで表示指標数を切替。スコア変動をengagementStoreに記録 |
| PortfolioSummary.tsx | 総資産、設定銘柄数、年間手数料、年間配当金の主要指標カード。手数料/配当の最高/最低銘柄、ファンドタイプ別集計も表示する |
| ScoreChangeIndicator.tsx | スコア変動・ランクアップ・ストリーク達成時にトースト風のフロート通知を表示。5秒後に自動消去。ランクアップ時は特別なグラデーションスタイルで強調 |
| StreakBadge.tsx | 連続アクセス日数と最長記録を表示するバッジ。ダッシュボード訪問時にengagementStoreへ訪問を記録し、2日以上の連続時のみ表示 |
| WeeklyRebalanceCard.tsx | 目標配分との乖離が閾値（3%）を超えた銘柄を一覧表示し、シミュレーション画面でのリバランスアクションへ誘導する週次チェックカード |

### data/ — データ入出力・連携

ファイルインポート/エクスポート、Google Drive連携を提供する。

| Component | Description |
|-----------|-------------|
| ExportOptions.tsx | JSON/CSV形式でのポートフォリオデータのダウンロードとクリップボードコピー機能。Standardプラン専用のPDFエクスポート（jsPDF lazy import）も含む |
| GoogleDriveIntegration.tsx | Google Driveとの連携UI。ポートフォリオデータのクラウド保存、読み込み、保存済みファイル一覧表示、同期ステータス管理を提供 |
| ImportOptions.tsx | JSON / PfWise CSV / 証券会社CSV（SBI・楽天・マネックス・汎用）のインポート。ファイル・クリップボード・テキスト入力の3方法に対応。Shift-JIS自動検出・デコード付き |

### goals/ — 投資目標管理

投資目標の設定・進捗追跡・マイルストーン通知を担う。

| Component | Description |
|-----------|-------------|
| GoalCard.tsx | 投資目標の進捗カード。プログレスバー、達成率、残り金額、月々の必要投資額を表示。25%/50%/75%/100%のマイルストーン到達時にエンゲージメントイベントを発火 |
| GoalDialog.tsx | 投資目標の作成/編集ダイアログ。目標名・目標金額・目標期限のフォームバリデーション付き入力UIを提供する |
| GoalProgressSection.tsx | ダッシュボード用の投資目標進捗セクション。目標一覧の表示と、goalStoreを通じた追加/編集/削除のアクション管理を行う |

### layout/ — レイアウト・ナビゲーション

アプリケーション全体のページ構造とナビゲーションを定義する。

| Component | Description |
|-----------|-------------|
| AppLayout.tsx | 認証済みユーザー向けアプリレイアウト。Header + SettingsChecker + Suspense付きmain + Footer + TabNavigationで構成 |
| DataStatusBar.tsx | 最終更新日時、為替レート情報、データ更新必要性の警告を表示するステータスバー。更新ボタン付き |
| Footer.tsx | 法務リンク（利用規約、プライバシーポリシー、特定商取引法、免責事項、料金プラン）とコピーライトを表示するグローバルフッター |
| Header.tsx | アプリ名ロゴ、通貨切替、データ更新、テーマ切替、言語切替、通知ベル、認証状態表示を含むメインヘッダー。モバイル/デスクトップのレスポンシブ対応 |
| LandingHeader.tsx | ランディングページ専用ヘッダー。ロゴ + テーマ切替 + 言語切替 + 料金プランリンク + OAuthLoginButton。TabNavigationなし |
| PublicLayout.tsx | 公開ページ用レイアウト。LandingHeader + Suspense付きmain + Footerで構成。SettingsCheckerやTabNavigationを含まない |
| TabNavigation.tsx | 画面下部固定のモバイル対応タブナビゲーション。ホーム・AI分析・配分・設定の4タブをLucideアイコン+日本語ラベルで表示。アクティブ状態のインジケータ付き |

### notifications/ — 通知・アラート機能

価格アラート、リバランス提案、目標通知の管理と表示を行う。

| Component | Description |
|-----------|-------------|
| AlertRulesManager.tsx | 設定ページ用アラートルール一覧管理UI。ルールの有効/無効切替、削除、新規追加ダイアログの起動、プラン制限表示を行う |
| NotificationBell.tsx | ヘッダー用ベルアイコン。未読通知数のバッジ表示、クリックでNotificationDropdownを開閉。外部クリックで閉じる |
| NotificationDropdown.tsx | ベルアイコンクリック時に表示される通知一覧ドロップダウン。通知リスト、全既読ボタン、空状態メッセージ、設定リンクを含む |
| NotificationItem.tsx | 通知リスト内の1行を描画。通知タイプ別アイコン、タイトル・メッセージ・相対時刻（日本語）表示、既読/未読スタイリング、削除操作を提供 |
| NotificationPreferences.tsx | 通知プリファレンスUI。通知タイプ（価格アラート・目標・リバランス）ごとのオン/オフ切替、リバランス閾値の設定（Standard専用）を提供 |
| PriceAlertDialog.tsx | 価格アラート作成ダイアログ。アラートタイプ・ティッカー・目標値を入力し、notificationStoreのaddAlertRuleで保存する |
| index.ts | 通知コンポーネントのバレルエクスポート |

### pwa/ — PWA対応機能

Progressive Web App関連のインストール促進、オフライン対応、更新管理を行う。

| Component | Description |
|-----------|-------------|
| InstallPrompt.tsx | beforeinstallprompt対応ブラウザでアプリインストールを促すバナー。初回訪問から30秒後に表示し、7日間dismiss記憶 |
| OfflineIndicator.tsx | ネットワーク切断時にHeader直下に表示するオフラインモードバナー。aria-live="polite"でアクセシビリティ対応 |
| PWAUpdatePrompt.tsx | Service Workerの新バージョン検出時に画面下部に更新通知バナーを表示。「今すぐ更新」でSW更新、「あとで」でdismiss |

### referral/ — リファラルプログラム

ユーザー紹介プログラムのUI。紹介コード共有、統計表示、招待バナーを提供。

| Component | Description |
|-----------|-------------|
| ReferralBanner.tsx | ランディングページ用リファラルバナー。?ref=パラメータがURLに含まれている場合に招待特典情報を表示する |
| ReferralSection.tsx | ダッシュボード用リファラルカード。ユーザーのリファラルコード表示、コピー機能、紹介統計の簡易表示を提供 |
| ReferralStatsCard.tsx | リファラル詳細統計カード。紹介数、成約数、獲得した無料月数をプログレスバー付きで表示する |

### reports/ — レポート機能

定期レポートの表示コンポーネント。

| Component | Description |
|-----------|-------------|
| MonthlyReportCard.tsx | 月次投資レポートのサマリーカード。月間リターン、トップ銘柄、スコア変化を表示する |

### seo/ — SEO対応

検索エンジン最適化のためのメタタグ管理。

| Component | Description |
|-----------|-------------|
| SEOHead.tsx | react-helmet-asyncのHelmetラッパー。ルートに応じたtitle / description / OGP / canonicalを自動設定する |

### settings/ — 設定・ポートフォリオ編集

保有資産、目標配分、AI設定、市場選択などのユーザー設定を管理する。

| Component | Description |
|-----------|-------------|
| AiPromptSettings.tsx | AI分析プロンプトのテンプレート設定。シミュレーションタブで使用するプロンプトテンプレートの編集・保存・初期値リセット機能を提供 |
| AllocationEditor.tsx | 目標資産配分の編集。各銘柄の目標配分率を個別設定でき、自動調整機能で合計100%にバランス。現在の合計率を視覚フィードバック |
| HoldingCard.tsx | 個別保有資産のカード型UI。銘柄情報、保有数量の編集、取得単価の入力、評価額表示、削除操作を提供。日本の投資信託/株式名のローカライズ対応 |
| HoldingsEditor.tsx | 保有資産の数量編集コンポーネント。各銘柄の保有数量の増減・編集・削除機能と、評価額・年間手数料・配当金の計算表示。小数点以下4桁対応 |
| LocalStorageDiagnostics.tsx | ローカルストレージの診断ツール。ブラウザ保存されたポートフォリオデータの状態確認、クリア、再読み込み、初期化のデバッグ支援 |
| MarketSelectionWizard.tsx | 投資対象市場の選択ウィザード。米国、日本、全世界、REIT、仮想通貨、債券などをカード式UIで複数選択。人気の組み合わせプリセットも提供 |
| PopularTickers.tsx | 人気銘柄のワンタップ追加。インデックス/ETF、人気個別株、日本市場の3カテゴリの銘柄をボタン一つでポートフォリオに追加。追加済みマーク表示 |
| PortfolioYamlConverter.tsx | ポートフォリオデータのYAML形式入出力。AIとの連携で使用するYAMLプロンプトの生成と、返却されたYAMLデータの取り込みをサポート |
| ResetSettings.tsx | 設定の全リセット機能。保有資産と目標配分の両方をクリアし、初期設定ウィザードを再表示する。確認ダイアログ付き |
| TickerSearch.tsx | ティッカーシンボル検索フォーム。銘柄コードを入力して検証後ポートフォリオに追加する。米国株/日本株の入力例ガイド付き |

### simulation/ — 投資シミュレーション

追加投資の配分シミュレーションとAI分析プロンプト生成を行う。

| Component | Description |
|-----------|-------------|
| AiAnalysisPrompt.tsx | 現在のポートフォリオ構成、目標配分、予算情報を含むAI分析用プロンプトを自動生成し、クリップボードコピーで外部AI利用を支援する |
| BudgetInput.tsx | 追加投資予算の入力。金額と通貨（円/ドル）を設定でき、通貨に応じたプリセット金額ボタンも提供。ステップ値と表示形式を自動調整 |
| SimulationResult.tsx | 投資シミュレーション結果表示。目標配分に基づく各銘柄の推奨購入株数と金額を表示し、購入株数の手動編集と一括購入実行機能を提供 |

### social/ — ソーシャル・共有機能

ポートフォリオの共有、ピア比較、ランキングバッジの表示を行う。

| Component | Description |
|-----------|-------------|
| PeerComparisonPanel.tsx | 同年代の投資家と資産配分を比較するパネル。年代選択、平均アロケーション円グラフ、参加者数、ランキングバッジを表示 |
| PeerRankBadge.tsx | ポートフォリオスコアの同年代順位バッジ。Top 10%: ゴールド、Top 25%: シルバー、Top 50%: ブロンズのティア分け |
| ShareDialog.tsx | ポートフォリオ共有ダイアログ。表示名と年代を入力して共有リンクを生成し、ShareLinkDisplayでURLを表示する |
| ShareLinkDisplay.tsx | 共有URLをコピーボタン付きで表示するコンポーネント。共有リンクの削除操作も提供 |
| SharePortfolioButton.tsx | ダッシュボード用のポートフォリオ共有ボタン。認証済みユーザーがクリックでShareDialogを開き、既存共有がある場合はリンクを表示 |

### survey/ — アンケート・フィードバック

NPS調査やユーザー情報収集のためのアンケート機能。

| Component | Description |
|-----------|-------------|
| NPSSurvey.tsx | NPS（Net Promoter Score）調査のフローティングカード。0-10スケールの推奨度質問とオプションコメント収集。Promoter/Passive/Detractor分類 |
| SurveyYAMLManager.tsx | YAMLアンケート形式のデータ管理。ユーザー情報（投資経験、リスク許容度等）の収集とYAML形式での出力を行う |

### ui/ — shadcn/ui ベースコンポーネント

TailwindCSS + class-variance-authority でスタイリングされたデザインシステム基盤。

| Component | Description |
|-----------|-------------|
| badge.tsx | バッジコンポーネント。default/success/warning/danger/secondary/outline の6バリアント。cvaでスタイル管理 |
| button.tsx | ボタンコンポーネント。primary/secondary/danger/outline/ghost/success/link の7バリアント + sm/md/lg の3サイズ。loading/icon対応 |
| card.tsx | カードコンポーネント。hoverable、elevation（none/low/medium/high）、padding（none/small/medium/large）のバリアント。CardHeader/CardTitle/CardContent サブコンポーネント付き |
| confirm-dialog.tsx | window.confirm()置換用の確認ダイアログ。破壊的操作前の確認UIをin-appで提供。タイトル/メッセージ/確認ボタンラベルのカスタマイズ可能 |
| dialog.tsx | モーダルダイアログ。sm/md/lg/xl/fullscreenの5サイズ。オーバーレイクリック・Escapeキーでの閉じ、DialogHeader/DialogTitle/DialogBody/DialogFooterサブコンポーネント付き |
| input.tsx | 入力フィールド。label/helperText/errorMessage/invalid のバリデーション表示対応。Selectコンポーネントも同ファイルに含む |
| progress.tsx | プログレスバー（横バー）とCircularProgress（SVG円形）の2種類。default/success/warning/danger の色バリアント、sm/md/lgサイズ対応 |
| switch.tsx | トグルスイッチ。checked/unchecked状態のアニメーション付き。ラベル表示とdisabled状態に対応 |
| tabs.tsx | タブナビゲーション。pills/underline の2バリアント。アイコン付きタブ、disabled状態、キーボードナビゲーション対応。TabPanelサブコンポーネント付き |

---

## ページ一覧

| Page | Route | Description |
|------|-------|-------------|
| Landing.tsx | / | 未認証ユーザー向けマーケティングページ。Hero、Solution、Pain、Features、Trust、Pricing、FAQ、CTAの8セクション構成。認証済みユーザーは/dashboardへリダイレクト |
| Dashboard.tsx | /dashboard | ポートフォリオのメインダッシュボード。サマリー、スコアカード、PnL、資産推移チャート、配当予測、目標進捗、リバランスチェック、資産テーブルを表示 |
| AIAdvisor.tsx | /ai-advisor | AIアドバイザーページ。3ステップウィザードでユーザー情報を収集し、パーソナライズされたプロンプトを生成。クイック分析機能と分析観点タブを提供 |
| Simulation.tsx | /simulation | 追加投資シミュレーションページ。予算入力、最適な購入配分の計算結果表示、一括購入実行、AI分析プロンプト生成を提供 |
| Settings.tsx | /settings | ポートフォリオ設定ページ。銘柄検索・追加、保有資産編集、目標配分設定、通知設定、AI分析プロンプトテンプレート編集をタブ構成で提供 |
| Pricing.tsx | /pricing | 料金プランページ。Free/Standardプランの機能比較カードを表示し、Stripe Checkoutへのリダイレクトを提供 |
| DataImport.tsx | /data-import | データ取り込みページ。外部AIで分析されたデータの受け取りとJSON/CSVファイルでのデータ交換機能を提供 |
| DataIntegration.tsx | /data-integration | データインポート/エクスポート統合ページ。ローカルストレージおよびGoogle Driveとの連携機能を提供 |
| SharedPortfolio.tsx | /share/:shareId | 公開共有ポートフォリオページ。認証不要でアクセス可能。共有されたポートフォリオのアロケーション円グラフとスコアを表示 |
| legal/Terms.tsx | /legal/terms | 利用規約ページ |
| legal/Privacy.tsx | /legal/privacy | プライバシーポリシーページ（APPI準拠） |
| legal/KKKR.tsx | /legal/kkkr | 特定商取引法に基づく表記ページ |
| legal/Disclaimer.tsx | /legal/disclaimer | 免責事項ページ（投資助言非該当を明記） |
