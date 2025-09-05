# PortfolioWise セキュリティアーキテクチャ

## 1. セキュリティ境界とトラストゾーン

```mermaid
graph TB
    subgraph "Untrusted Zone (Internet)"
        Attacker[fa:fa-user-secret Attackers<br/>Malicious Users]
        PublicUser[fa:fa-user Public Users<br/>Unauthenticated]
        Bots[fa:fa-robot Bots/Crawlers<br/>Automated Threats]
    end
    
    subgraph "Perimeter Security"
        CloudflareWAF[fa:fa-shield-alt Cloudflare WAF<br/>- DDoS Protection<br/>- Rate Limiting<br/>- IP Blocking<br/>- OWASP Rules]
        AWSWAF[fa:fa-shield-alt AWS WAF<br/>- SQL Injection<br/>- XSS Protection<br/>- Geo Blocking<br/>- Custom Rules]
        CloudflareDNS[fa:fa-lock DNSSEC<br/>DNS Security]
    end
    
    subgraph "Semi-Trusted Zone (CDN)"
        CloudflareCDN[fa:fa-server CDN Edge<br/>- Static Content<br/>- Cache Headers<br/>- CSP Headers]
        CloudflareWorkers[fa:fa-code Workers<br/>- Edge Functions<br/>- Auth Pre-check]
    end
    
    subgraph "DMZ (API Gateway)"
        APIGW[fa:fa-gateway API Gateway<br/>- Rate Limiting<br/>- API Keys<br/>- Request Validation]
        Authorizer[fa:fa-key Lambda Authorizer<br/>- JWT Validation<br/>- Permission Check]
        Shield[fa:fa-shield AWS Shield<br/>DDoS Protection]
    end
    
    subgraph "Trusted Zone (Application)"
        subgraph "Authentication Layer"
            GoogleOAuth[fa:fa-google Google OAuth<br/>- Identity Provider<br/>- MFA Support]
            SessionMgmt[fa:fa-id-card Session Management<br/>- JWT Tokens<br/>- Refresh Tokens]
        end
        
        subgraph "Application Layer"
            Lambda[fa:fa-function Lambda Functions<br/>- Business Logic<br/>- Input Validation]
            SecretsManager[fa:fa-key Secrets Manager<br/>- API Keys<br/>- Rotation]
            KMS[fa:fa-lock KMS<br/>- Encryption Keys<br/>- Key Rotation]
        end
        
        subgraph "Data Layer"
            DynamoDB[fa:fa-database DynamoDB<br/>- Encryption at Rest<br/>- VPC Endpoints]
            S3[fa:fa-archive S3 Buckets<br/>- Server-Side Encryption<br/>- Bucket Policies]
        end
    end
    
    subgraph "Audit & Compliance"
        CloudTrail[fa:fa-history CloudTrail<br/>API Audit Logs]
        GuardDuty[fa:fa-eye GuardDuty<br/>Threat Detection]
        SecurityHub[fa:fa-dashboard Security Hub<br/>Compliance Monitoring]
    end
    
    Attacker -->|Blocked| CloudflareWAF
    PublicUser --> CloudflareWAF
    Bots -->|Rate Limited| CloudflareWAF
    
    CloudflareWAF --> CloudflareCDN
    CloudflareCDN --> APIGW
    
    APIGW --> Authorizer
    Authorizer -->|Authorized| Lambda
    
    Lambda --> SecretsManager
    Lambda --> KMS
    Lambda --> DynamoDB
    Lambda --> S3
    
    All components --> CloudTrail
    CloudTrail --> GuardDuty
    GuardDuty --> SecurityHub
    
    style Attacker fill:#f99,stroke:#333,stroke-width:2px
    style CloudflareWAF fill:#9f9,stroke:#333,stroke-width:4px
    style Authorizer fill:#ff9,stroke:#333,stroke-width:2px
    style KMS fill:#9ff,stroke:#333,stroke-width:2px
```

## 2. 認証・認可アーキテクチャ

```mermaid
graph TB
    subgraph "Identity & Access Management"
        subgraph "Authentication Methods"
            GoogleSSO[Google SSO<br/>OAuth 2.0]
            MFA[MFA Options<br/>- Google Authenticator<br/>- SMS (optional)]
            Biometric[Biometric<br/>- FaceID/TouchID<br/>- WebAuthn]
        end
        
        subgraph "Authorization Levels"
            RBAC[Role-Based Access<br/>- User<br/>- Premium User<br/>- Admin]
            ABAC[Attribute-Based<br/>- Resource Owner<br/>- Time-based<br/>- Location-based]
            Policies[IAM Policies<br/>- Least Privilege<br/>- Deny by Default]
        end
        
        subgraph "Token Management"
            JWT[JWT Tokens<br/>- Access Token (15min)<br/>- Refresh Token (7days)<br/>- ID Token]
            TokenStorage[Token Storage<br/>- httpOnly Cookies<br/>- Secure Flag<br/>- SameSite=Strict]
            TokenRotation[Token Rotation<br/>- Automatic Refresh<br/>- Revocation List]
        end
        
        subgraph "Session Management"
            SessionStore[Session Store<br/>- DynamoDB<br/>- TTL: 24 hours<br/>- Encrypted]
            SessionValidation[Session Validation<br/>- IP Check<br/>- User Agent<br/>- Device Fingerprint]
            SessionRevocation[Session Revocation<br/>- Manual Logout<br/>- Timeout<br/>- Security Event]
        end
    end
    
    GoogleSSO --> JWT
    MFA --> GoogleSSO
    Biometric --> GoogleSSO
    
    JWT --> TokenStorage
    TokenStorage --> SessionStore
    
    RBAC --> Policies
    ABAC --> Policies
    
    SessionStore --> SessionValidation
    SessionValidation --> SessionRevocation
```

## 3. データ保護アーキテクチャ

```mermaid
graph LR
    subgraph "Data Classification"
        Public[Public Data<br/>- Market Prices<br/>- Exchange Rates]
        Internal[Internal Data<br/>- User Preferences<br/>- App Settings]
        Confidential[Confidential<br/>- Portfolio Data<br/>- Personal Info]
        Secret[Secret<br/>- API Keys<br/>- Tokens]
    end
    
    subgraph "Encryption at Rest"
        DDB_Encryption[DynamoDB<br/>- AWS KMS<br/>- AES-256]
        S3_Encryption[S3<br/>- SSE-S3<br/>- SSE-KMS]
        Secrets_Encryption[Secrets Manager<br/>- Automatic Rotation<br/>- KMS Encrypted]
    end
    
    subgraph "Encryption in Transit"
        TLS[TLS 1.3<br/>- All API Calls<br/>- Certificate Pinning]
        VPN[VPC Peering<br/>- Private Network<br/>- No Internet]
        HTTPS[HTTPS Only<br/>- HSTS Header<br/>- No Downgrade]
    end
    
    subgraph "Data Masking"
        PII_Masking[PII Masking<br/>- Email: ***@domain<br/>- Phone: ***-***-1234]
        Financial_Masking[Financial Masking<br/>- Account: ****1234<br/>- Amount: Hidden]
        Logging_Masking[Log Masking<br/>- Remove Sensitive<br/>- Hash User IDs]
    end
    
    subgraph "Access Controls"
        IAM_Roles[IAM Roles<br/>- Service-specific<br/>- Time-limited]
        MFA_Required[MFA Required<br/>- Admin Actions<br/>- Data Export]
        Audit_Trail[Audit Trail<br/>- All Access<br/>- Immutable Logs]
    end
    
    Public --> TLS
    Internal --> DDB_Encryption
    Confidential --> S3_Encryption
    Secret --> Secrets_Encryption
    
    DDB_Encryption --> VPN
    S3_Encryption --> HTTPS
    Secrets_Encryption --> TLS
    
    Confidential --> PII_Masking
    Financial_Masking --> Logging_Masking
    
    IAM_Roles --> All Encryption
    MFA_Required --> Secret
    Audit_Trail --> All Access
```

## 4. 脅威モデル（STRIDE分析）

```mermaid
graph TB
    subgraph "Threats (STRIDE)"
        Spoofing[Spoofing<br/>なりすまし]
        Tampering[Tampering<br/>データ改ざん]
        Repudiation[Repudiation<br/>否認]
        InfoDisclosure[Info Disclosure<br/>情報漏洩]
        DoS[Denial of Service<br/>サービス妨害]
        Elevation[Elevation<br/>権限昇格]
    end
    
    subgraph "Mitigations"
        M_Spoofing[対策: Spoofing<br/>- OAuth 2.0<br/>- MFA<br/>- Device Fingerprint]
        M_Tampering[対策: Tampering<br/>- Input Validation<br/>- HMAC Signatures<br/>- Immutable Logs]
        M_Repudiation[対策: Repudiation<br/>- Audit Logs<br/>- CloudTrail<br/>- Legal Hold]
        M_InfoDisclosure[対策: Info Disclosure<br/>- Encryption<br/>- Access Control<br/>- Data Masking]
        M_DoS[対策: DoS<br/>- Rate Limiting<br/>- Auto Scaling<br/>- CloudFlare DDoS]
        M_Elevation[対策: Elevation<br/>- Least Privilege<br/>- Role Separation<br/>- MFA for Admin]
    end
    
    subgraph "Attack Vectors"
        AV1[Phishing<br/>- Email<br/>- SMS<br/>- Social]
        AV2[Injection<br/>- SQL<br/>- NoSQL<br/>- Command]
        AV3[XSS<br/>- Stored<br/>- Reflected<br/>- DOM-based]
        AV4[CSRF<br/>- State Change<br/>- Data Theft]
        AV5[API Abuse<br/>- Rate Limit<br/>- Data Scraping]
        AV6[Supply Chain<br/>- npm packages<br/>- Dependencies]
    end
    
    Spoofing --> M_Spoofing
    Tampering --> M_Tampering
    Repudiation --> M_Repudiation
    InfoDisclosure --> M_InfoDisclosure
    DoS --> M_DoS
    Elevation --> M_Elevation
    
    AV1 --> Spoofing
    AV2 --> Tampering
    AV3 --> InfoDisclosure
    AV4 --> Tampering
    AV5 --> DoS
    AV6 --> Elevation
```

## 5. セキュリティ監視とインシデント対応

```mermaid
sequenceDiagram
    autonumber
    
    participant System as System Events
    participant CW as CloudWatch
    participant GD as GuardDuty
    participant SH as Security Hub
    participant SNS as SNS Alert
    participant SOC as SOC Team
    participant IR as Incident Response
    
    System->>CW: ログ送信
    Note over CW: - Failed Logins<br/>- API Errors<br/>- Permission Denied
    
    CW->>CW: メトリクス分析
    
    alt 異常検知
        CW->>SNS: アラート発火
        SNS->>SOC: 通知 (Email/Slack)
    end
    
    System->>GD: VPC Flow Logs
    GD->>GD: 脅威分析
    Note over GD: - Port Scanning<br/>- Crypto Mining<br/>- C2 Communication
    
    alt 脅威検出
        GD->>SH: Finding送信
        SH->>SH: 重要度評価
        
        alt Critical/High
            SH->>SNS: 即時アラート
            SNS->>SOC: PagerDuty起動
            SOC->>IR: インシデント作成
            
            IR->>IR: 初期対応
            Note over IR: 1. 影響範囲特定<br/>2. 証拠保全<br/>3. 一次対応
            
            IR->>System: 対応実施
            Note over System: - IP Block<br/>- User Suspend<br/>- Service Isolation
            
            IR->>IR: 根本原因分析
            IR->>System: 恒久対策
            Note over System: - Patch適用<br/>- Rule更新<br/>- Config変更
        else Medium/Low
            SH->>SOC: チケット作成
            SOC->>SOC: 調査・対応
        end
    end
    
    SOC->>IR: レポート作成
    IR->>IR: 改善提案
```

## 6. コンプライアンスとガバナンス

```mermaid
graph TB
    subgraph "Compliance Requirements"
        GDPR[GDPR<br/>- Data Privacy<br/>- Right to Delete<br/>- Data Portability]
        PCI[PCI DSS<br/>- Card Data<br/>- Secure Processing<br/>- Regular Audits]
        SOC2[SOC 2<br/>- Security<br/>- Availability<br/>- Confidentiality]
        ISO27001[ISO 27001<br/>- ISMS<br/>- Risk Management<br/>- Continuous Improvement]
    end
    
    subgraph "Security Controls"
        Technical[Technical Controls<br/>- Encryption<br/>- Access Control<br/>- Monitoring]
        Administrative[Administrative<br/>- Policies<br/>- Training<br/>- Audits]
        Physical[Physical<br/>- Data Center<br/>- AWS Responsibility]
    end
    
    subgraph "Governance"
        Policies[Security Policies<br/>- Password Policy<br/>- Access Policy<br/>- Data Retention]
        Procedures[Procedures<br/>- Incident Response<br/>- Change Management<br/>- Backup/Recovery]
        Documentation[Documentation<br/>- Architecture<br/>- Runbooks<br/>- Compliance Reports]
    end
    
    subgraph "Audit & Assessment"
        Internal[Internal Audits<br/>- Quarterly<br/>- Automated Scans<br/>- Manual Review]
        External[External Audits<br/>- Annual<br/>- Penetration Testing<br/>- Compliance Cert]
        Continuous[Continuous<br/>- AWS Config<br/>- Security Hub<br/>- Automated Checks]
    end
    
    GDPR --> Technical
    PCI --> Technical
    SOC2 --> Administrative
    ISO27001 --> Physical
    
    Technical --> Policies
    Administrative --> Procedures
    Physical --> Documentation
    
    Policies --> Internal
    Procedures --> External
    Documentation --> Continuous
```

## 7. セキュリティ実装チェックリスト

```mermaid
graph LR
    subgraph "Application Security"
        AS1[✓ Input Validation]
        AS2[✓ Output Encoding]
        AS3[✓ Authentication]
        AS4[✓ Session Management]
        AS5[✓ Access Control]
        AS6[✓ Cryptography]
        AS7[✓ Error Handling]
        AS8[✓ Logging]
        AS9[✓ Data Protection]
        AS10[⚠ File Upload]
    end
    
    subgraph "Infrastructure Security"
        IS1[✓ Network Segmentation]
        IS2[✓ Firewall Rules]
        IS3[✓ VPC Configuration]
        IS4[✓ Security Groups]
        IS5[✓ NACLs]
        IS6[✓ VPC Endpoints]
        IS7[✓ Private Subnets]
        IS8[✓ NAT Gateway]
        IS9[✓ Bastion Host]
        IS10[✓ VPN/Direct Connect]
    end
    
    subgraph "Cloud Security"
        CS1[✓ IAM Policies]
        CS2[✓ KMS Keys]
        CS3[✓ Secrets Manager]
        CS4[✓ CloudTrail]
        CS5[✓ GuardDuty]
        CS6[✓ Security Hub]
        CS7[✓ AWS Config]
        CS8[✓ Shield/WAF]
        CS9[⚠ Macie]
        CS10[⚠ Inspector]
    end
    
    subgraph "DevSecOps"
        DS1[✓ SAST]
        DS2[✓ DAST]
        DS3[✓ Dependency Scan]
        DS4[✓ Container Scan]
        DS5[✓ IaC Scan]
        DS6[✓ Secret Scan]
        DS7[⚠ RASP]
        DS8[⚠ IAST]
        DS9[✓ Security Gates]
        DS10[✓ Compliance Checks]
    end
    
    style AS10 fill:#ff9,stroke:#333,stroke-width:2px
    style CS9 fill:#ff9,stroke:#333,stroke-width:2px
    style CS10 fill:#ff9,stroke:#333,stroke-width:2px
    style DS7 fill:#ff9,stroke:#333,stroke-width:2px
    style DS8 fill:#ff9,stroke:#333,stroke-width:2px
```

## 8. ゼロトラストアーキテクチャ実装

```mermaid
graph TB
    subgraph "Zero Trust Principles"
        NeverTrust[Never Trust<br/>Always Verify]
        LeastPrivilege[Least Privilege<br/>Access]
        AssumeBreath[Assume Breach<br/>Mentality]
    end
    
    subgraph "Identity-Centric Security"
        UserIdentity[User Identity<br/>- Google OAuth<br/>- MFA<br/>- Risk Score]
        DeviceIdentity[Device Identity<br/>- Fingerprint<br/>- Compliance Check<br/>- Trust Level]
        AppIdentity[App Identity<br/>- Service Account<br/>- API Keys<br/>- Certificates]
    end
    
    subgraph "Micro-Segmentation"
        NetworkSeg[Network Segmentation<br/>- VPC per Service<br/>- Security Groups<br/>- NACLs]
        AppSeg[App Segmentation<br/>- Lambda per Function<br/>- Isolated Runtime<br/>- Separate Roles]
        DataSeg[Data Segmentation<br/>- Table per Purpose<br/>- Encryption Keys<br/>- Access Policies]
    end
    
    subgraph "Continuous Verification"
        RealTime[Real-time Verification<br/>- Every Request<br/>- Context Analysis<br/>- Behavior Check]
        RiskAssessment[Risk Assessment<br/>- User Behavior<br/>- Anomaly Detection<br/>- Threat Intel]
        AdaptiveAuth[Adaptive Auth<br/>- Step-up Auth<br/>- Context-based<br/>- Risk-based]
    end
    
    NeverTrust --> UserIdentity
    NeverTrust --> DeviceIdentity
    NeverTrust --> AppIdentity
    
    LeastPrivilege --> NetworkSeg
    LeastPrivilege --> AppSeg
    LeastPrivilege --> DataSeg
    
    AssumeBreath --> RealTime
    AssumeBreath --> RiskAssessment
    AssumeBreath --> AdaptiveAuth
```

---

*作成日: 2025-09-05*  
*バージョン: 2.0.0*  
*セキュリティチーム責任*  
*次回セキュリティレビュー: 2025-10-01*