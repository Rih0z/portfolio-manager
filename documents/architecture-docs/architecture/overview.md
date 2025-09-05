# PortfolioWise アーキテクチャ設計書

## 1. システムコンテキスト図

```mermaid
C4Context
    title System Context Diagram - PortfolioWise

    Person(user, "投資家", "個人投資家・ポートフォリオ管理者")
    System_Boundary(portfoliowise, "PortfolioWise") {
        System(webapp, "Webアプリケーション", "React SPA")
        System(api, "API Backend", "AWS Lambda")
    }
    
    System_Ext(google, "Google Services", "OAuth, Drive API")
    System_Ext(market, "Market Data Providers", "Yahoo Finance, JPX, Alpha Vantage")
    System_Ext(github, "GitHub", "Fallback Data Storage")
    
    Rel(user, webapp, "使用", "HTTPS")
    Rel(webapp, api, "API呼び出し", "REST/HTTPS")
    Rel(api, google, "認証・ストレージ", "OAuth/API")
    Rel(api, market, "市場データ取得", "API/Scraping")
    Rel(api, github, "フォールバックデータ", "API")
```

## 2. コンテナ図

```mermaid
C4Container
    title Container Diagram - PortfolioWise Architecture

    Person(user, "投資家")
    
    Container_Boundary(frontend, "Frontend") {
        Container(spa, "React SPA", "React 18, TypeScript", "シングルページアプリケーション")
        Container(cdn, "Cloudflare CDN", "Edge Network", "静的資産配信")
    }
    
    Container_Boundary(backend, "Backend Services") {
        Container(apigw, "API Gateway", "AWS", "REST API エンドポイント")
        Container(lambda, "Lambda Functions", "Node.js 18", "ビジネスロジック実行")
        Container(dynamodb, "DynamoDB", "NoSQL", "データ永続化・キャッシュ")
        Container(secrets, "Secrets Manager", "AWS", "APIキー管理")
    }
    
    System_Ext(google, "Google Services")
    System_Ext(market, "Market Data APIs")
    
    Rel(user, cdn, "アクセス", "HTTPS")
    Rel(cdn, spa, "配信")
    Rel(spa, apigw, "API呼び出し", "REST/HTTPS")
    Rel(apigw, lambda, "ルーティング")
    Rel(lambda, dynamodb, "読み書き")
    Rel(lambda, secrets, "シークレット取得")
    Rel(lambda, google, "OAuth/Drive")
    Rel(lambda, market, "データ取得")
```

## 3. コンポーネント図（フロントエンド）

```mermaid
graph TB
    subgraph "React Application"
        App[App.jsx<br/>ルートコンポーネント]
        
        subgraph "Context Layer"
            Auth[AuthContext<br/>認証管理]
            Portfolio[PortfolioContext<br/>ポートフォリオ管理]
        end
        
        subgraph "Pages"
            Dashboard[Dashboard<br/>ダッシュボード]
            AIAdvisor[AIAdvisor<br/>AI投資アドバイス]
            Settings[Settings<br/>設定管理]
            Simulation[Simulation<br/>投資シミュレーション]
        end
        
        subgraph "Services"
            API[api.js<br/>API Client]
            MarketData[marketDataService.js<br/>市場データ]
            Admin[adminService.js<br/>管理機能]
        end
        
        subgraph "Components"
            Atlassian[Atlassian Design<br/>UIコンポーネント]
            Charts[Recharts<br/>データ可視化]
            Forms[Form Components<br/>入力フォーム]
        end
        
        App --> Auth
        App --> Portfolio
        Auth --> Dashboard
        Portfolio --> Dashboard
        Dashboard --> MarketData
        AIAdvisor --> API
        Settings --> Admin
        Dashboard --> Charts
        AIAdvisor --> Atlassian
        Settings --> Forms
    end
```

## 4. コンポーネント図（バックエンド）

```mermaid
graph TB
    subgraph "AWS Lambda Functions"
        MarketDataFn[marketData.js<br/>市場データ取得]
        GoogleAuthFn[googleAuth.js<br/>認証処理]
        GoogleDriveFn[googleDriveAuth.js<br/>Drive統合]
        UpdateDataFn[updateFallbackData.js<br/>データ更新]
        PreWarmFn[preWarmCache.js<br/>キャッシュ準備]
    end
    
    subgraph "Service Layer"
        CacheService[cache.js<br/>キャッシング]
        SourcesService[sources/*<br/>データソース]
        AuthService[googleAuthService.js<br/>認証サービス]
        FallbackStore[fallbackDataStore.js<br/>フォールバック]
    end
    
    subgraph "Data Sources"
        Yahoo[Yahoo Finance2<br/>無料API]
        JPX[JPX CSV<br/>公式データ]
        AlphaVantage[Alpha Vantage<br/>有料API]
        Scraper[Web Scraping<br/>最終手段]
    end
    
    subgraph "Storage"
        DynamoCache[Cache Table<br/>TTL付きキャッシュ]
        DynamoSession[Session Table<br/>セッション管理]
        DynamoBlacklist[Blacklist Table<br/>失敗追跡]
        GitHub[GitHub Repository<br/>フォールバックデータ]
    end
    
    MarketDataFn --> CacheService
    MarketDataFn --> SourcesService
    SourcesService --> Yahoo
    SourcesService --> JPX
    SourcesService --> AlphaVantage
    SourcesService --> Scraper
    
    CacheService --> DynamoCache
    GoogleAuthFn --> AuthService
    AuthService --> DynamoSession
    
    SourcesService --> DynamoBlacklist
    UpdateDataFn --> FallbackStore
    FallbackStore --> GitHub
    PreWarmFn --> CacheService
```

## 5. データフロー図

```mermaid
sequenceDiagram
    participant User
    participant React
    participant CloudflareCDN
    participant APIGateway
    participant Lambda
    participant DynamoDB
    participant MarketAPI
    
    User->>CloudflareCDN: アクセス
    CloudflareCDN->>React: SPA配信
    React->>User: UI表示
    
    User->>React: ポートフォリオ更新
    React->>APIGateway: POST /api/portfolio
    APIGateway->>Lambda: 認証・処理
    Lambda->>DynamoDB: データ保存
    DynamoDB-->>Lambda: 保存完了
    
    React->>APIGateway: GET /api/market-data
    APIGateway->>Lambda: データ要求
    Lambda->>DynamoDB: キャッシュ確認
    
    alt キャッシュヒット
        DynamoDB-->>Lambda: キャッシュデータ
    else キャッシュミス
        Lambda->>MarketAPI: 最新データ取得
        MarketAPI-->>Lambda: 市場データ
        Lambda->>DynamoDB: キャッシュ更新
    end
    
    Lambda-->>APIGateway: レスポンス
    APIGateway-->>React: JSONデータ
    React-->>User: 表示更新
```

## 6. デプロイメント図

```mermaid
graph TB
    subgraph "Client Browser"
        Browser[Web Browser<br/>Chrome/Safari/Edge]
    end
    
    subgraph "Cloudflare Edge Network"
        CF_DNS[DNS<br/>portfolio-wise.com]
        CF_CDN[CDN<br/>Global Edge Locations]
        CF_Pages[Cloudflare Pages<br/>Static Hosting]
    end
    
    subgraph "AWS us-west-2"
        subgraph "API Layer"
            APIGW[API Gateway<br/>REST API]
            Lambda1[Lambda<br/>marketData]
            Lambda2[Lambda<br/>googleAuth]
            Lambda3[Lambda<br/>googleDrive]
        end
        
        subgraph "Storage Layer"
            DDB1[DynamoDB<br/>Cache Table]
            DDB2[DynamoDB<br/>Session Table]
            SM[Secrets Manager<br/>API Keys]
        end
        
        subgraph "Monitoring"
            CW[CloudWatch<br/>Logs & Metrics]
        end
    end
    
    subgraph "External Services"
        Google[Google APIs<br/>OAuth/Drive]
        Yahoo[Yahoo Finance<br/>Market Data]
        JPX[JPX<br/>Tokyo Exchange]
    end
    
    Browser --> CF_DNS
    CF_DNS --> CF_CDN
    CF_CDN --> CF_Pages
    Browser --> APIGW
    APIGW --> Lambda1
    APIGW --> Lambda2
    APIGW --> Lambda3
    Lambda1 --> DDB1
    Lambda2 --> DDB2
    Lambda1 --> SM
    Lambda1 --> Yahoo
    Lambda1 --> JPX
    Lambda2 --> Google
    Lambda1 --> CW
    Lambda2 --> CW
```

## 7. セキュリティアーキテクチャ

```mermaid
graph TB
    subgraph "Trust Boundaries"
        subgraph "Public Zone"
            User[User Browser]
            CDN[Cloudflare CDN]
        end
        
        subgraph "DMZ"
            APIGW[API Gateway<br/>Rate Limiting<br/>CORS]
        end
        
        subgraph "Private Zone"
            Lambda[Lambda Functions<br/>Business Logic]
            DynamoDB[DynamoDB<br/>Encrypted Storage]
            Secrets[Secrets Manager<br/>Key Rotation]
        end
        
        subgraph "External Zone"
            Google[Google OAuth<br/>Identity Provider]
            Market[Market APIs<br/>Data Providers]
        end
    end
    
    User -->|HTTPS| CDN
    CDN -->|Cached Assets| User
    User -->|API Calls| APIGW
    APIGW -->|Authorized| Lambda
    Lambda -->|Encrypted| DynamoDB
    Lambda -->|Secure| Secrets
    Lambda -->|OAuth 2.0| Google
    Lambda -->|API Keys| Market
    
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style APIGW fill:#ff9,stroke:#333,stroke-width:4px
    style Lambda fill:#9f9,stroke:#333,stroke-width:2px
    style Secrets fill:#9ff,stroke:#333,stroke-width:2px
```

## 8. データモデル

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Portfolio : owns
    Portfolio ||--o{ Holding : contains
    Portfolio ||--o{ TargetAllocation : defines
    Session ||--|| GoogleAuth : uses
    Holding }|--|| MarketData : references
    
    User {
        string userId PK
        string email
        string name
        string googleId
        datetime createdAt
        datetime lastLogin
    }
    
    Session {
        string sessionId PK
        string userId FK
        string accessToken
        string refreshToken
        datetime expiresAt
        datetime createdAt
    }
    
    Portfolio {
        string portfolioId PK
        string userId FK
        string name
        string currency
        decimal totalValue
        datetime updatedAt
    }
    
    Holding {
        string holdingId PK
        string portfolioId FK
        string symbol
        string name
        decimal quantity
        decimal purchasePrice
        decimal currentPrice
        datetime purchaseDate
    }
    
    TargetAllocation {
        string allocationId PK
        string portfolioId FK
        string category
        decimal targetPercentage
        decimal currentPercentage
    }
    
    MarketData {
        string symbol PK
        string market
        decimal price
        decimal change
        decimal changePercent
        datetime timestamp
        integer ttl
    }
```

## 9. 状態遷移図

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticating : ログインクリック
    Authenticating --> Authenticated : OAuth成功
    Authenticating --> Unauthenticated : OAuth失敗
    
    Authenticated --> PortfolioEmpty : 初回ログイン
    Authenticated --> PortfolioLoaded : 既存データあり
    
    PortfolioEmpty --> SettingsWizard : 設定開始
    SettingsWizard --> PortfolioConfigured : 設定完了
    
    PortfolioLoaded --> DataRefreshing : 更新要求
    DataRefreshing --> PortfolioLoaded : 更新完了
    
    PortfolioConfigured --> PortfolioLoaded : データ取得
    
    PortfolioLoaded --> AIAnalyzing : AI分析開始
    AIAnalyzing --> AIResultsReady : 分析完了
    AIResultsReady --> PortfolioLoaded : 結果確認
    
    PortfolioLoaded --> Simulating : シミュレーション開始
    Simulating --> SimulationResults : 計算完了
    SimulationResults --> PortfolioLoaded : 結果適用
    
    Authenticated --> Unauthenticated : ログアウト
    
    [*] --> Unauthenticated
```

## 10. API エンドポイント構成

```yaml
API Endpoints:
  Authentication:
    - POST /api/auth/google/login
    - POST /api/auth/google/callback
    - POST /api/auth/logout
    - GET  /api/auth/session
    
  Portfolio Management:
    - GET  /api/portfolio
    - POST /api/portfolio
    - PUT  /api/portfolio/{id}
    - DELETE /api/portfolio/{id}
    
  Market Data:
    - GET  /api/market-data?symbols={symbols}&type={type}
    - POST /api/market-data/batch
    - GET  /api/exchange-rate/{from}/{to}
    
  Google Drive:
    - POST /api/drive/save
    - GET  /api/drive/load
    - GET  /api/drive/list
    
  Admin:
    - GET  /api/admin/metrics
    - POST /api/admin/cache/clear
    - GET  /api/admin/health
```

## 更新履歴

| 日付 | バージョン | 更新内容 |
|------|------------|----------|
| 2025-09-04 | 1.0.0 | 初版作成・全体アーキテクチャ図作成 |

---
*本ドキュメントは自動生成されました。最新情報はソースコードを参照してください。*