# PortfolioWise シーケンス図集

## 1. 認証フロー（Google OAuth 2.0）

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant Browser as ブラウザ
    participant React as React SPA
    participant APIGW as API Gateway
    participant AuthLambda as Auth Lambda
    participant Google as Google OAuth
    participant DynamoDB as DynamoDB
    participant SecretsMgr as Secrets Manager
    
    User->>Browser: ログインボタンクリック
    Browser->>React: onClick イベント
    React->>React: OAuth URL生成
    React->>Browser: Google認証画面へリダイレクト
    Browser->>Google: 認証リクエスト
    
    Note over Google: ユーザー認証
    Google-->>Browser: 認証コード返却
    Browser->>React: コールバック受信
    React->>APIGW: POST /auth/google/callback
    APIGW->>AuthLambda: 認証コード送信
    
    AuthLambda->>SecretsMgr: Client Secret取得
    SecretsMgr-->>AuthLambda: Secret返却
    AuthLambda->>Google: トークン交換リクエスト
    Google-->>AuthLambda: Access/Refresh Token
    
    AuthLambda->>DynamoDB: セッション作成
    Note over DynamoDB: TTL: 24時間
    DynamoDB-->>AuthLambda: セッションID
    
    AuthLambda-->>APIGW: JWT Token + User Info
    APIGW-->>React: 認証成功レスポンス
    React->>React: Context更新
    React->>Browser: ダッシュボード表示
    
    Note over React: 以降のAPIコールに<br/>JWTトークン付与
```

## 2. 市場データ取得フロー（マルチソース戦略）

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant APIGW as API Gateway
    participant Lambda as Market Data Lambda
    participant Cache as DynamoDB Cache
    participant Yahoo as Yahoo Finance2
    participant JPX as JPX CSV
    participant Alpha as Alpha Vantage
    participant Scraper as Web Scraper
    participant Fallback as GitHub Fallback
    
    User->>React: ポートフォリオ画面表示
    React->>APIGW: GET /market-data?symbols=AAPL,7203
    APIGW->>Lambda: リクエスト転送
    
    Lambda->>Cache: キャッシュ確認
    
    alt キャッシュヒット
        Cache-->>Lambda: キャッシュデータ
        Lambda-->>APIGW: キャッシュレスポンス
        Note over Lambda: X-Cache: HIT
    else キャッシュミス
        Lambda->>Lambda: データソース優先順位決定
        
        Lambda->>Yahoo: 1. Yahoo Finance2 API
        alt 成功
            Yahoo-->>Lambda: 市場データ
        else 失敗
            Lambda->>JPX: 2. JPX CSV取得
            alt 成功
                JPX-->>Lambda: 日本株データ
            else 失敗
                Lambda->>Alpha: 3. Alpha Vantage API
                alt 成功
                    Alpha-->>Lambda: 市場データ
                else 失敗
                    Lambda->>Scraper: 4. Web スクレイピング
                    alt 成功
                        Scraper-->>Lambda: スクレイプデータ
                    else 全失敗
                        Lambda->>Fallback: 5. GitHub フォールバック
                        Fallback-->>Lambda: 過去データ
                    end
                end
            end
        end
        
        Lambda->>Cache: キャッシュ更新（TTL: 1時間）
        Cache-->>Lambda: 更新完了
        Lambda-->>APIGW: データレスポンス
        Note over Lambda: X-Cache: MISS
    end
    
    APIGW-->>React: JSON レスポンス
    React->>React: UI更新
```

## 3. ポートフォリオ更新フロー

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant LocalStorage as Local Storage
    participant APIGW as API Gateway
    participant AuthLambda as Authorizer
    participant PortfolioLambda as Portfolio Lambda
    participant DynamoDB as DynamoDB
    participant GoogleDrive as Google Drive
    participant SNS as SNS
    
    User->>React: 銘柄追加フォーム入力
    React->>React: バリデーション実行
    
    React->>LocalStorage: 一時保存（楽観的更新）
    React->>React: UI即座更新
    
    React->>APIGW: PUT /portfolio/{id}/holdings
    APIGW->>AuthLambda: JWT検証
    AuthLambda-->>APIGW: 認証成功
    
    APIGW->>PortfolioLambda: 更新リクエスト
    
    PortfolioLambda->>PortfolioLambda: ビジネスルール検証
    Note over PortfolioLambda: 重複チェック<br/>上限チェック<br/>データ整合性
    
    PortfolioLambda->>DynamoDB: トランザクション開始
    
    par 並列処理
        PortfolioLambda->>DynamoDB: Holdings更新
        and
        PortfolioLambda->>DynamoDB: Portfolio合計更新
        and
        PortfolioLambda->>DynamoDB: 監査ログ記録
    end
    
    DynamoDB-->>PortfolioLambda: トランザクション完了
    
    PortfolioLambda->>GoogleDrive: バックアップ（非同期）
    Note over GoogleDrive: Fire and Forget
    
    PortfolioLambda-->>APIGW: 更新成功レスポンス
    APIGW-->>React: 200 OK + 更新データ
    
    React->>LocalStorage: 確定データで上書き
    React->>React: Context更新
    React->>User: 成功通知表示
    
    opt エラー時
        PortfolioLambda-->>APIGW: エラーレスポンス
        APIGW-->>React: 400/500 エラー
        React->>LocalStorage: ロールバック
        React->>React: UI復元
        React->>User: エラー表示
        PortfolioLambda->>SNS: エラー通知
    end
```

## 4. AI投資分析フロー

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant APIGW as API Gateway
    participant AILambda as AI Analysis Lambda
    participant MarketLambda as Market Data Lambda
    participant DynamoDB as DynamoDB
    participant OpenAI as OpenAI/Claude API
    
    User->>React: AI分析タブ選択
    React->>React: ユーザープロファイル収集
    Note over React: 投資経験<br/>リスク許容度<br/>投資目標
    
    User->>React: 分析開始ボタン
    React->>APIGW: POST /ai/analysis
    
    APIGW->>AILambda: 分析リクエスト
    
    par データ収集
        AILambda->>DynamoDB: ポートフォリオ取得
        and
        AILambda->>MarketLambda: 最新市場データ
        and
        AILambda->>DynamoDB: 過去パフォーマンス
    end
    
    DynamoDB-->>AILambda: ポートフォリオデータ
    MarketLambda-->>AILambda: 市場データ
    DynamoDB-->>AILambda: 履歴データ
    
    AILambda->>AILambda: プロンプト生成
    Note over AILambda: 40+分析関数実行<br/>コンテキスト構築
    
    AILambda->>OpenAI: 分析リクエスト
    Note over OpenAI: GPT-4/Claude処理
    OpenAI-->>AILambda: AI分析結果
    
    AILambda->>AILambda: 結果後処理
    Note over AILambda: 検証<br/>フォーマット<br/>リスク評価
    
    AILambda->>DynamoDB: 分析結果保存
    
    AILambda-->>APIGW: 分析レポート
    APIGW-->>React: JSON レスポンス
    
    React->>React: レポート表示
    Note over React: 推奨事項<br/>リバランス提案<br/>リスク警告
    
    User->>React: 推奨事項を適用
    React->>React: シミュレーション実行
```

## 5. データ同期・バックアップフロー

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant APIGW as API Gateway
    participant DriveLambda as Google Drive Lambda
    participant DynamoDB as DynamoDB
    participant GoogleDrive as Google Drive API
    participant S3 as S3 Backup
    participant Scheduler as EventBridge
    
    Note over Scheduler: 毎日 02:00 JST
    Scheduler->>DriveLambda: 定期バックアップトリガー
    
    par 手動バックアップ
        User->>React: バックアップボタン
        React->>APIGW: POST /backup
        APIGW->>DriveLambda: バックアップ開始
    end
    
    DriveLambda->>DynamoDB: 全ポートフォリオ取得
    DynamoDB-->>DriveLambda: データ一覧
    
    loop 各ユーザーごと
        DriveLambda->>DriveLambda: データ集約
        Note over DriveLambda: JSON/YAML形式<br/>暗号化
        
        DriveLambda->>GoogleDrive: ファイル作成/更新
        GoogleDrive-->>DriveLambda: 保存完了
        
        DriveLambda->>S3: セカンダリバックアップ
        S3-->>DriveLambda: アップロード完了
        
        DriveLambda->>DynamoDB: バックアップ履歴更新
    end
    
    DriveLambda-->>APIGW: バックアップ完了
    APIGW-->>React: 成功通知
    React->>User: 完了メッセージ
    
    Note over User: リストア処理
    User->>React: リストアボタン
    React->>APIGW: GET /backup/list
    APIGW->>DriveLambda: バックアップ一覧取得
    DriveLambda->>GoogleDrive: ファイル一覧
    GoogleDrive-->>DriveLambda: ファイルリスト
    DriveLambda-->>React: バックアップ一覧
    
    User->>React: バックアップ選択
    React->>APIGW: POST /restore
    APIGW->>DriveLambda: リストア実行
    DriveLambda->>GoogleDrive: ファイルダウンロード
    GoogleDrive-->>DriveLambda: データ取得
    
    DriveLambda->>DriveLambda: データ検証
    DriveLambda->>DynamoDB: データ復元
    DynamoDB-->>DriveLambda: 復元完了
    
    DriveLambda-->>React: リストア成功
    React->>React: アプリリロード
```

## 6. エラーハンドリング・リトライフロー

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant APIGW as API Gateway
    participant Lambda as Lambda Function
    participant CircuitBreaker as Circuit Breaker
    participant ExternalAPI as External API
    participant DynamoDB as DynamoDB
    participant CloudWatch as CloudWatch
    participant SNS as SNS
    
    User->>React: アクション実行
    React->>APIGW: API リクエスト
    APIGW->>Lambda: 処理開始
    
    Lambda->>CircuitBreaker: サービス状態確認
    
    alt Circuit Open
        CircuitBreaker-->>Lambda: サービス利用不可
        Lambda->>DynamoDB: フォールバックデータ取得
        DynamoDB-->>Lambda: キャッシュデータ
        Lambda-->>React: 503 + フォールバックデータ
        Note over React: 警告表示
    else Circuit Closed
        CircuitBreaker-->>Lambda: サービス利用可
        
        loop 最大3回リトライ
            Lambda->>ExternalAPI: API呼び出し
            
            alt 成功
                ExternalAPI-->>Lambda: 正常レスポンス
                Lambda->>CircuitBreaker: 成功記録
                break
            else タイムアウト
                Note over Lambda: 30秒待機
                Lambda->>Lambda: Exponential Backoff
                Note over Lambda: 待機時間: 1s, 2s, 4s
            else 4xx エラー
                ExternalAPI-->>Lambda: Client Error
                Lambda->>CloudWatch: エラーログ
                break リトライ不要
            else 5xx エラー
                ExternalAPI-->>Lambda: Server Error
                Lambda->>CloudWatch: エラーログ
                Lambda->>CircuitBreaker: 失敗カウント増加
            end
        end
        
        alt リトライ成功
            Lambda-->>APIGW: 成功レスポンス
            APIGW-->>React: 200 OK
            React->>User: 結果表示
        else 全リトライ失敗
            Lambda->>CircuitBreaker: Circuit Open設定
            Note over CircuitBreaker: 5分間Open
            
            Lambda->>CloudWatch: 重大エラー記録
            CloudWatch->>SNS: アラート送信
            SNS->>SNS: 管理者通知
            
            Lambda->>DynamoDB: インシデント記録
            Lambda-->>APIGW: 500 エラー
            APIGW-->>React: エラーレスポンス
            React->>React: エラー境界発動
            React->>User: エラーメッセージ
        end
    end
```

## 7. リアルタイムデータ更新フロー（WebSocket検討中）

```mermaid
sequenceDiagram
    autonumber
    
    participant User as ユーザー
    participant React as React SPA
    participant WebSocket as WebSocket Connection
    participant APIGW as API Gateway WS
    participant Lambda as Stream Lambda
    participant DynamoDB as DynamoDB Streams
    participant MarketData as Market Data Source
    
    User->>React: ダッシュボード表示
    React->>WebSocket: 接続確立
    WebSocket->>APIGW: WSS://接続
    APIGW->>Lambda: $connect
    Lambda->>DynamoDB: Connection ID保存
    Lambda-->>React: 接続確認
    
    React->>WebSocket: Subscribe: ["AAPL", "7203"]
    WebSocket->>APIGW: メッセージ送信
    APIGW->>Lambda: $default
    Lambda->>DynamoDB: サブスクリプション登録
    
    loop リアルタイム更新
        MarketData->>Lambda: 価格更新イベント
        Lambda->>DynamoDB: データ更新
        
        DynamoDB->>DynamoDB: Streams発火
        DynamoDB-->>Lambda: Change Event
        
        Lambda->>Lambda: 影響ユーザー特定
        
        loop 各接続クライアント
            Lambda->>APIGW: データプッシュ
            APIGW->>WebSocket: メッセージ送信
            WebSocket->>React: データ受信
            React->>React: UI更新
            Note over React: アニメーション付き更新
        end
    end
    
    User->>React: 画面離脱
    React->>WebSocket: 切断
    WebSocket->>APIGW: Disconnect
    APIGW->>Lambda: $disconnect
    Lambda->>DynamoDB: Connection ID削除
```

## 8. パフォーマンス最適化フロー

```mermaid
sequenceDiagram
    autonumber
    
    participant CDN as Cloudflare CDN
    participant Browser as Browser
    participant ServiceWorker as Service Worker
    participant React as React SPA
    participant APIGW as API Gateway
    participant Lambda as Lambda
    participant Cache as DynamoDB Cache
    
    Note over CDN: Edge Cache
    Browser->>CDN: 初回アクセス
    CDN->>CDN: キャッシュ確認
    
    alt CDN キャッシュヒット
        CDN-->>Browser: Cached HTML/JS/CSS
        Note over Browser: < 50ms
    else CDN キャッシュミス
        CDN->>CDN: Origin取得
        CDN-->>Browser: Fresh Content
        CDN->>CDN: キャッシュ保存
    end
    
    Browser->>ServiceWorker: SW登録
    ServiceWorker->>ServiceWorker: Assets キャッシュ
    
    Browser->>React: アプリ起動
    React->>React: Lazy Loading
    Note over React: Code Splitting<br/>動的インポート
    
    React->>ServiceWorker: API リクエスト
    ServiceWorker->>ServiceWorker: ローカルキャッシュ確認
    
    alt ローカルキャッシュあり
        ServiceWorker-->>React: Cached Data
        Note over React: Stale While Revalidate
        
        ServiceWorker->>APIGW: バックグラウンド更新
        APIGW->>Lambda: リクエスト
        Lambda->>Cache: DynamoDB確認
        Cache-->>Lambda: データ
        Lambda-->>ServiceWorker: Fresh Data
        ServiceWorker->>ServiceWorker: キャッシュ更新
    else ローカルキャッシュなし
        ServiceWorker->>APIGW: API リクエスト
        
        Note over APIGW: CloudFront キャッシュ
        
        APIGW->>Lambda: 処理
        Lambda->>Cache: Batch Get
        Note over Cache: 一括取得で<br/>レイテンシ削減
        
        Cache-->>Lambda: データ
        Lambda-->>APIGW: レスポンス
        APIGW-->>ServiceWorker: データ
        ServiceWorker->>ServiceWorker: キャッシュ保存
        ServiceWorker-->>React: データ返却
    end
    
    React->>React: Virtual DOM差分更新
    Note over React: 最小限のDOM操作
```

---

*作成日: 2025-09-05*  
*バージョン: 2.0.0*  
*責任者: アーキテクチャチーム*