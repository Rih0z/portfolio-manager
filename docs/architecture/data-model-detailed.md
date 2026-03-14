# PortfolioWise データモデル詳細設計

## 1. 論理データモデル（ER図）

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ PORTFOLIO : owns
    USER ||--o{ AUDIT_LOG : generates
    USER ||--o{ USER_PREFERENCE : has
    USER ||--o{ NOTIFICATION : receives
    
    PORTFOLIO ||--o{ HOLDING : contains
    PORTFOLIO ||--o{ TARGET_ALLOCATION : defines
    PORTFOLIO ||--o{ PORTFOLIO_HISTORY : tracks
    PORTFOLIO ||--o{ TRANSACTION : records
    
    HOLDING }|--|| MARKET_DATA : references
    HOLDING ||--o{ HOLDING_HISTORY : tracks
    
    MARKET_DATA ||--o{ PRICE_HISTORY : has
    MARKET_DATA }o--|| EXCHANGE : belongs_to
    
    SESSION ||--|| GOOGLE_AUTH : uses
    
    AI_ANALYSIS }|--|| PORTFOLIO : analyzes
    AI_ANALYSIS ||--o{ AI_RECOMMENDATION : generates
    
    USER {
        string userId PK "UUID"
        string email UK "Unique Email"
        string googleId UK "Google OAuth ID"
        string name "Display Name"
        string profilePicture "URL"
        string preferredLanguage "ja/en"
        string timezone "Asia/Tokyo"
        datetime createdAt "ISO 8601"
        datetime lastLoginAt "ISO 8601"
        boolean isActive "Account Status"
        string role "user/premium/admin"
    }
    
    SESSION {
        string sessionId PK "UUID"
        string userId FK "User Reference"
        string accessToken "JWT"
        string refreshToken "Encrypted"
        string ipAddress "Client IP"
        string userAgent "Browser Info"
        string deviceFingerprint "Device ID"
        datetime createdAt "ISO 8601"
        datetime expiresAt "ISO 8601"
        number ttl "DynamoDB TTL"
    }
    
    PORTFOLIO {
        string portfolioId PK "UUID"
        string userId FK "Owner"
        string name "Portfolio Name"
        string description "Optional"
        string currency "JPY/USD"
        decimal totalValue "Calculated"
        decimal cashBalance "Available Cash"
        datetime createdAt "ISO 8601"
        datetime updatedAt "ISO 8601"
        boolean isDefault "Primary Portfolio"
        string visibility "private/shared"
    }
    
    HOLDING {
        string holdingId PK "UUID"
        string portfolioId FK "Portfolio"
        string symbol "Ticker Symbol"
        string market "JP/US"
        string name "Security Name"
        string type "stock/etf/fund"
        decimal quantity "Shares"
        decimal purchasePrice "Average Cost"
        decimal currentPrice "Latest Price"
        decimal marketValue "Calculated"
        decimal unrealizedPL "Profit/Loss"
        decimal realizedPL "Closed P/L"
        datetime purchaseDate "First Buy"
        datetime lastUpdated "Price Update"
    }
    
    TARGET_ALLOCATION {
        string allocationId PK "UUID"
        string portfolioId FK "Portfolio"
        string category "Asset Class"
        string subCategory "Sub Class"
        decimal targetPercentage "Target %"
        decimal currentPercentage "Actual %"
        decimal deviation "Difference"
        string rebalanceAction "buy/sell/hold"
        decimal rebalanceAmount "Suggested"
    }
    
    MARKET_DATA {
        string symbol PK "Ticker"
        string market "Exchange"
        string name "Full Name"
        string type "Security Type"
        decimal price "Current Price"
        decimal previousClose "Previous"
        decimal change "Absolute"
        decimal changePercent "Percentage"
        decimal volume "Trading Volume"
        decimal marketCap "Market Cap"
        decimal high52Week "52W High"
        decimal low52Week "52W Low"
        datetime timestamp "Last Update"
        number ttl "Cache TTL"
    }
    
    TRANSACTION {
        string transactionId PK "UUID"
        string portfolioId FK "Portfolio"
        string holdingId FK "Holding"
        string type "buy/sell/dividend"
        decimal quantity "Shares"
        decimal price "Execution Price"
        decimal amount "Total Amount"
        decimal fees "Commission"
        datetime executedAt "Trade Date"
        string status "pending/completed"
        string notes "Optional"
    }
    
    AI_ANALYSIS {
        string analysisId PK "UUID"
        string portfolioId FK "Portfolio"
        string userId FK "Requester"
        json analysisResult "JSON Data"
        json recommendations "Suggestions"
        decimal riskScore "1-10"
        decimal expectedReturn "Percentage"
        string analysisType "full/quick"
        datetime createdAt "ISO 8601"
        datetime expiresAt "Valid Until"
    }
```

## 2. DynamoDB物理データモデル

### 2.1 テーブル設計

```yaml
Tables:
  # 1. Cache Table (高頻度アクセス、TTL付き)
  MarketDataCache:
    PartitionKey: pk (String) # "MARKET#symbol"
    SortKey: sk (String) # "DATA#timestamp"
    Attributes:
      - price: Number
      - change: Number
      - changePercent: Number
      - volume: Number
      - timestamp: String
      - ttl: Number # Unix timestamp for auto-deletion
    GlobalSecondaryIndexes:
      - GSI1:
          PartitionKey: gsi1pk # "MARKET#market"
          SortKey: gsi1sk # "PRICE#symbol"
      - GSI2:
          PartitionKey: gsi2pk # "UPDATE#date"
          SortKey: gsi2sk # "TIME#timestamp"
    
  # 2. Session Table (認証管理)
  SessionTable:
    PartitionKey: pk (String) # "SESSION#sessionId"
    SortKey: sk (String) # "USER#userId"
    Attributes:
      - accessToken: String (encrypted)
      - refreshToken: String (encrypted)
      - ipAddress: String
      - userAgent: String
      - deviceFingerprint: String
      - createdAt: String
      - expiresAt: String
      - ttl: Number
    GlobalSecondaryIndexes:
      - UserIndex:
          PartitionKey: userId
          SortKey: createdAt
    
  # 3. Main Application Table (Single Table Design)
  PortfolioTable:
    PartitionKey: pk (String)
    SortKey: sk (String)
    Attributes: (varies by entity type)
    GlobalSecondaryIndexes:
      - GSI1:
          PartitionKey: gsi1pk
          SortKey: gsi1sk
      - GSI2:
          PartitionKey: gsi2pk
          SortKey: gsi2sk
      - GSI3:
          PartitionKey: gsi3pk
          SortKey: gsi3sk
```

### 2.2 Single Table Design パターン

```mermaid
graph TB
    subgraph "Single Table Design - PortfolioTable"
        subgraph "User Entity"
            U1[PK: USER#userId<br/>SK: PROFILE]
            U2[PK: USER#userId<br/>SK: SETTINGS]
            U3[PK: USER#userId<br/>SK: PREFERENCES]
        end
        
        subgraph "Portfolio Entity"
            P1[PK: USER#userId<br/>SK: PORTFOLIO#portfolioId]
            P2[PK: PORTFOLIO#portfolioId<br/>SK: METADATA]
            P3[PK: PORTFOLIO#portfolioId<br/>SK: STATS]
        end
        
        subgraph "Holding Entity"
            H1[PK: PORTFOLIO#portfolioId<br/>SK: HOLDING#symbol]
            H2[PK: HOLDING#holdingId<br/>SK: DETAILS]
            H3[PK: HOLDING#holdingId<br/>SK: HISTORY#timestamp]
        end
        
        subgraph "Transaction Entity"
            T1[PK: PORTFOLIO#portfolioId<br/>SK: TXN#timestamp#txnId]
            T2[PK: DATE#yyyy-mm-dd<br/>SK: TXN#portfolioId#txnId]
        end
        
        subgraph "AI Analysis Entity"
            A1[PK: PORTFOLIO#portfolioId<br/>SK: ANALYSIS#timestamp]
            A2[PK: USER#userId<br/>SK: ANALYSIS#analysisId]
        end
    end
```

### 2.3 アクセスパターン

```yaml
Access Patterns:
  # ユーザー関連
  1. Get User by ID:
     Query: pk = "USER#userId" AND sk = "PROFILE"
  
  2. Get User's Portfolios:
     Query: pk = "USER#userId" AND sk begins_with "PORTFOLIO#"
  
  3. Get User's Settings:
     Query: pk = "USER#userId" AND sk = "SETTINGS"
  
  # ポートフォリオ関連
  4. Get Portfolio Details:
     Query: pk = "PORTFOLIO#portfolioId" AND sk = "METADATA"
  
  5. Get Portfolio Holdings:
     Query: pk = "PORTFOLIO#portfolioId" AND sk begins_with "HOLDING#"
  
  6. Get Portfolio Transactions:
     Query: pk = "PORTFOLIO#portfolioId" AND sk begins_with "TXN#"
  
  # ホールディング関連
  7. Get Holding Details:
     Query: pk = "HOLDING#holdingId" AND sk = "DETAILS"
  
  8. Get Holding History:
     Query: pk = "HOLDING#holdingId" AND sk begins_with "HISTORY#"
  
  # トランザクション関連
  9. Get Transactions by Date:
     Query: GSI1: gsi1pk = "DATE#yyyy-mm-dd"
  
  10. Get User's All Transactions:
      Query: GSI2: gsi2pk = "USER#userId" AND gsi2sk begins_with "TXN#"
  
  # AI分析関連
  11. Get Latest Analysis:
      Query: pk = "PORTFOLIO#portfolioId" AND sk begins_with "ANALYSIS#" LIMIT 1 DESC
  
  12. Get User's Analysis History:
      Query: GSI3: gsi3pk = "USER#userId" AND gsi3sk begins_with "ANALYSIS#"
```

## 3. データフロー設計

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as API Layer
    participant Cache as Cache Layer
    participant Primary as Primary DB
    participant Backup as Backup Storage
    participant External as External APIs
    
    Note over Client,External: Read Flow (Market Data)
    Client->>API: Request Market Data
    API->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>API: Return Cached Data
        API-->>Client: Response (X-Cache: HIT)
    else Cache Miss
        API->>External: Fetch Latest Data
        External-->>API: Market Data
        API->>Cache: Update Cache (TTL: 1hr)
        API->>Primary: Store Historical
        API-->>Client: Response (X-Cache: MISS)
    end
    
    Note over Client,Backup: Write Flow (Portfolio Update)
    Client->>API: Update Portfolio
    API->>API: Validate Request
    API->>Primary: Begin Transaction
    
    par Parallel Writes
        API->>Primary: Update Holdings
        and
        API->>Primary: Update Portfolio Stats
        and
        API->>Primary: Log Transaction
    end
    
    Primary-->>API: Commit Success
    
    API->>Cache: Invalidate Related Cache
    API->>Backup: Async Backup
    API-->>Client: Success Response
    
    Note over Primary,Backup: Backup Flow
    loop Every 24 hours
        Primary->>Backup: Export Data
        Backup->>Backup: Create Snapshot
        Backup->>Backup: Compress & Encrypt
    end
```

## 4. データ整合性とトランザクション

```mermaid
graph TB
    subgraph "Transaction Patterns"
        subgraph "Optimistic Locking"
            OL1[Read Version]
            OL2[Modify Data]
            OL3[Write with Condition]
            OL4{Version Match?}
            OL5[Success]
            OL6[Retry]
            
            OL1 --> OL2
            OL2 --> OL3
            OL3 --> OL4
            OL4 -->|Yes| OL5
            OL4 -->|No| OL6
            OL6 --> OL1
        end
        
        subgraph "DynamoDB Transactions"
            TX1[TransactWrite]
            TX2[Multiple Items]
            TX3[All or Nothing]
            TX4[Automatic Rollback]
            
            TX1 --> TX2
            TX2 --> TX3
            TX3 -->|Failed| TX4
        end
        
        subgraph "Event Sourcing"
            ES1[Capture Events]
            ES2[Append Only]
            ES3[Event Stream]
            ES4[Rebuild State]
            
            ES1 --> ES2
            ES2 --> ES3
            ES3 --> ES4
        end
    end
    
    subgraph "Consistency Guarantees"
        Eventually[Eventually Consistent<br/>- Read after Write<br/>- Default Mode]
        Strong[Strongly Consistent<br/>- Critical Reads<br/>- Higher Cost]
        Global[Global Consistency<br/>- Cross-region<br/>- Async Replication]
    end
```

## 5. データライフサイクル管理

```mermaid
graph LR
    subgraph "Data Lifecycle"
        subgraph "Creation"
            Create[Data Created]
            Validate[Validation]
            Encrypt[Encryption]
            Store[Storage]
        end
        
        subgraph "Active Use"
            Read[Read Access]
            Update[Updates]
            Cache[Caching]
            Replicate[Replication]
        end
        
        subgraph "Archive"
            Archive[Move to Archive]
            Compress[Compression]
            ColdStorage[S3 Glacier]
        end
        
        subgraph "Retention & Deletion"
            Retention[Retention Policy<br/>- User Data: 7 years<br/>- Logs: 90 days<br/>- Cache: 1 hour]
            Deletion[Secure Deletion<br/>- Overwrite<br/>- Audit Log<br/>- Confirmation]
        end
    end
    
    Create --> Validate
    Validate --> Encrypt
    Encrypt --> Store
    
    Store --> Read
    Read --> Update
    Update --> Cache
    Cache --> Replicate
    
    Replicate --> Archive
    Archive --> Compress
    Compress --> ColdStorage
    
    ColdStorage --> Retention
    Retention --> Deletion
```

## 6. パフォーマンス最適化戦略

```yaml
Optimization Strategies:
  1. Caching Strategy:
     - L1 Cache: Browser LocalStorage (5 min)
     - L2 Cache: CloudFront (15 min)
     - L3 Cache: DynamoDB Cache Table (1 hour)
     - L4 Cache: Lambda Memory (5 min)
  
  2. Query Optimization:
     - Use GSI for alternate access patterns
     - Batch operations for multiple items
     - Projection to reduce data transfer
     - Parallel queries when possible
  
  3. Write Optimization:
     - Batch writes (up to 25 items)
     - Async processing for non-critical
     - Write sharding for hot partitions
     - Conditional writes to prevent overwrites
  
  4. Data Compression:
     - GZIP for API responses
     - Binary format for large datasets
     - Image optimization (WebP)
     - Log compression before storage
  
  5. Partition Key Design:
     - Avoid hot partitions
     - Use composite keys
     - Time-based sharding
     - Random suffix for high-cardinality
```

## 7. データ移行とバージョニング

```mermaid
graph TB
    subgraph "Schema Evolution"
        V1[Version 1<br/>Initial Schema]
        V2[Version 2<br/>Add Fields]
        V3[Version 3<br/>Restructure]
        
        V1 -->|Migration Script| V2
        V2 -->|Migration Script| V3
    end
    
    subgraph "Migration Strategy"
        Dual[Dual Write<br/>- Write to both<br/>- Gradual migration]
        Lazy[Lazy Migration<br/>- Migrate on read<br/>- Background job]
        BigBang[Big Bang<br/>- Scheduled downtime<br/>- Full migration]
    end
    
    subgraph "Versioning"
        SchemaVer[Schema Version<br/>- Store in metadata<br/>- Check on read]
        APIVer[API Versioning<br/>- /v1/, /v2/<br/>- Backward compatible]
        DataVer[Data Version<br/>- version field<br/>- Transformation layer]
    end
```

## 8. データ品質管理

```yaml
Data Quality Metrics:
  Accuracy:
    - Validation rules at input
    - Cross-reference checks
    - External data verification
  
  Completeness:
    - Required field enforcement
    - Default value policies
    - Missing data reports
  
  Consistency:
    - Foreign key constraints (logical)
    - Business rule validation
    - Cross-table consistency checks
  
  Timeliness:
    - Data freshness monitoring
    - Update frequency tracking
    - Stale data detection
  
  Uniqueness:
    - Duplicate detection
    - Merge strategies
    - De-duplication jobs
  
  Validity:
    - Format validation
    - Range checks
    - Business logic validation
```

---

*作成日: 2025-09-05*  
*バージョン: 2.0.0*  
*データアーキテクチャチーム*  
*次回レビュー: 2025-10-01*