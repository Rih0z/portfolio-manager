# PortfolioWise Technical Specification

## Version: 2.0.0
Last Updated: 2025-09-05

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Performance Requirements](#performance-requirements)
5. [Security Specifications](#security-specifications)
6. [Data Architecture](#data-architecture)
7. [API Specifications](#api-specifications)
8. [Deployment Architecture](#deployment-architecture)

## System Overview

PortfolioWise is a cloud-native investment portfolio management system designed for individual investors managing assets across Japanese and US markets. The system provides real-time market data, AI-powered analysis, and comprehensive portfolio tracking capabilities.

### Key Characteristics
- **Architecture Pattern**: Serverless microservices
- **Deployment Model**: Multi-cloud (AWS + Cloudflare)
- **Data Strategy**: Multi-source with intelligent fallback
- **Security Model**: Zero Trust with OAuth 2.0
- **Scalability**: Auto-scaling serverless functions
- **Cost Target**: < $25/month operational cost

## Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  React SPA | Atlassian Design System | i18n | PWA      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┴────────────────────────────────┐
│                    CDN Layer                            │
│         Cloudflare Pages | Global Edge Network          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┴────────────────────────────────┐
│                    API Gateway                          │
│         AWS API Gateway | Rate Limiting | CORS          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                 Serverless Functions                    │
│     AWS Lambda | Node.js 18 | 256MB | 30s timeout      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   Data Layer                            │
│  DynamoDB | Secrets Manager | S3 | CloudWatch          │
└──────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Frontend Components
- **Framework**: React 18 with Hooks
- **State Management**: Context API (AuthContext, PortfolioContext)
- **UI Library**: Atlassian Design System (migrating from TailwindCSS)
- **Routing**: React Router v6
- **Data Visualization**: Recharts
- **Internationalization**: i18next (JP/EN)

#### Backend Services
- **Market Data Service**: Multi-source aggregation with fallback
- **Authentication Service**: Google OAuth 2.0 with session management
- **Portfolio Service**: CRUD operations with validation
- **Cache Service**: DynamoDB with TTL
- **Notification Service**: (Planned) SNS integration

## Technology Stack

### Frontend Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18.2.0 | UI framework |
| Build Tool | Create React App | 5.0.1 | Build system |
| Styling | Atlassian Design System | Latest | Component library |
| CSS Framework | TailwindCSS | 3.3.0 | Utility CSS (phasing out) |
| Charts | Recharts | 2.7.0 | Data visualization |
| HTTP Client | Axios | 1.4.0 | API communication |
| i18n | i18next | 23.2.0 | Internationalization |

### Backend Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 18.x | JavaScript runtime |
| Framework | Serverless | 3.34.0 | Infrastructure as Code |
| Database | DynamoDB | Managed | NoSQL database |
| Cache | DynamoDB TTL | Managed | Data caching |
| Secrets | Secrets Manager | Managed | Credential storage |
| Monitoring | CloudWatch | Managed | Logs and metrics |

### External Services
| Service | Provider | Purpose | Cost Model |
|---------|----------|---------|------------|
| Market Data | Yahoo Finance2 | Primary data source | Free |
| Exchange Data | JPX | Japanese market data | Free |
| Backup Data | Alpha Vantage | Fallback source | Freemium |
| Authentication | Google OAuth | User authentication | Free |
| Storage | Google Drive | User data backup | Free |
| CDN | Cloudflare | Content delivery | Free tier |

## Performance Requirements

### Response Time Targets
| Operation | Target | Maximum | Cache Strategy |
|-----------|--------|---------|----------------|
| Cached Data | < 100ms | 200ms | DynamoDB with TTL |
| Live Market Data | < 500ms | 3000ms | Multi-source fallback |
| Batch Request (20 symbols) | < 2000ms | 10000ms | Parallel fetching |
| Authentication | < 1000ms | 5000ms | Session caching |
| File Upload/Download | < 2000ms | 30000ms | Direct streaming |

### Scalability Metrics
- **Concurrent Users**: 1,000+
- **Requests/Minute**: 100 per user
- **Data Points**: 100,000+ per day
- **Storage**: 1GB per user
- **Availability**: 99.9% uptime

### Optimization Strategies
1. **Caching**: Aggressive caching with 1-hour TTL
2. **Batch Processing**: Group API calls to reduce overhead
3. **CDN**: Global edge caching for static assets
4. **Code Splitting**: Lazy loading for optimal bundle size
5. **Image Optimization**: WebP format with responsive sizing

## Security Specifications

### Authentication & Authorization
- **Method**: OAuth 2.0 with Google
- **Session Management**: Server-side with DynamoDB
- **Token Type**: Session cookies (httpOnly, secure, sameSite)
- **Session Duration**: 24 hours with refresh
- **MFA**: Via Google account settings

### Data Protection
- **Encryption at Rest**: AES-256 (DynamoDB, S3)
- **Encryption in Transit**: TLS 1.3
- **API Keys**: Stored in AWS Secrets Manager
- **PII Handling**: Minimal collection, encrypted storage
- **GDPR Compliance**: Data export/deletion capabilities

### Security Headers
```javascript
{
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self'"
}
```

### Rate Limiting
- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 10 requests/minute
- **Batch Operations**: 20 symbols maximum
- **DDoS Protection**: Cloudflare automatic

## Data Architecture

### DynamoDB Tables

#### 1. Cache Table
```yaml
TableName: pfwise-api-{stage}-cache
PartitionKey: key (String)
TTL: ttl (Number)
Purpose: Market data caching
Capacity: On-demand
```

#### 2. Sessions Table
```yaml
TableName: pfwise-api-{stage}-sessions
PartitionKey: sessionId (String)
TTL: ttl (Number)
Purpose: User session management
Capacity: On-demand
```

#### 3. Blacklist Table
```yaml
TableName: pfwise-api-{stage}-scraping-blacklist
PartitionKey: symbol (String)
TTL: ttl (Number)
Purpose: Failed symbol tracking
Capacity: On-demand
```

#### 4. Rate Limit Table
```yaml
TableName: pfwise-api-{stage}-rate-limits
PartitionKey: identifier (String)
SortKey: timestamp (Number)
Purpose: Rate limiting tracking
Capacity: On-demand
```

### Data Flow Patterns

#### Market Data Flow
```
1. Client Request → API Gateway
2. Lambda Function → Check Cache
3. If Cache Miss → Fetch from Sources
   a. Yahoo Finance2 (Primary)
   b. JPX CSV (Japanese stocks)
   c. Alpha Vantage (Fallback)
   d. Web Scraping (Last resort)
4. Update Cache → Return Response
```

#### Portfolio Data Flow
```
1. User Action → React Component
2. Context Update → API Call
3. Lambda Validation → DynamoDB Operation
4. Response → Context Update → UI Update
```

## API Specifications

### Endpoint Categories
1. **Authentication** (`/auth/*`)
   - Google OAuth login/logout
   - Session management
   - CSRF token generation

2. **Market Data** (`/api/market-data`)
   - Real-time quotes
   - Historical data
   - Exchange rates

3. **Portfolio** (`/api/portfolio/*`)
   - CRUD operations
   - Calculations
   - Analytics

4. **Google Drive** (`/drive/*`)
   - File save/load
   - Backup/restore

5. **Configuration** (`/config/*`)
   - Client settings
   - Feature flags

### API Standards
- **Protocol**: HTTPS only
- **Format**: JSON
- **Versioning**: Path-based (`/v1/`)
- **Pagination**: Cursor-based
- **Error Format**: RFC 7807

## Deployment Architecture

### Infrastructure as Code
```yaml
Provider: Serverless Framework
Language: YAML
Version Control: Git
CI/CD: GitHub Actions (planned)
```

### Environment Management
| Environment | Purpose | URL | Auto-Deploy |
|-------------|---------|-----|-------------|
| Development | Local testing | localhost:3000 | No |
| Staging | Pre-production | *.pages.dev | Yes |
| Production | Live system | portfolio-wise.com | Manual |

### Deployment Process
1. **Frontend Build**
   ```bash
   npm run build
   wrangler pages deploy build
   ```

2. **Backend Deploy**
   ```bash
   serverless deploy --stage prod
   ```

### Monitoring & Observability
- **Logs**: CloudWatch Logs (WARN level in production)
- **Metrics**: CloudWatch Metrics
- **Alarms**: Budget alerts, error rate monitoring
- **Tracing**: X-Ray (planned)
- **Dashboards**: CloudWatch Dashboard

### Cost Optimization
| Service | Strategy | Monthly Cost |
|---------|----------|--------------|
| Lambda | 256MB memory, 1 retry | < $5 |
| DynamoDB | On-demand, TTL cleanup | < $5 |
| API Gateway | Caching enabled | < $5 |
| CloudWatch | WARN log level | < $5 |
| Secrets Manager | 24-hour cache | < $5 |
| **Total** | Optimized for free tier | **< $25** |

## Quality Assurance

### Testing Strategy
- **Unit Tests**: 80% coverage target
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load testing
- **Security Tests**: OWASP Top 10

### Code Quality
- **Linting**: ESLint with Airbnb config
- **Formatting**: Prettier
- **Type Checking**: PropTypes (TypeScript planned)
- **Code Review**: PR required for main branch

### Documentation Standards
- **Code Comments**: JSDoc format
- **API Docs**: OpenAPI 3.0
- **User Docs**: Markdown in `/documents`
- **Architecture**: C4 model diagrams

## Future Enhancements

### Planned Features
1. **TypeScript Migration** (Q1 2026)
2. **Real-time WebSocket Updates** (Q2 2026)
3. **Mobile Native Apps** (Q3 2026)
4. **AI-Powered Insights** (Q4 2026)

### Technical Debt
1. Complete Atlassian Design System migration
2. Remove TailwindCSS dependencies
3. Implement comprehensive error boundaries
4. Add request retry mechanisms
5. Enhance offline capabilities

## Compliance & Standards

### Regulatory Compliance
- **Data Privacy**: GDPR, CCPA ready
- **Financial**: No direct trading capabilities
- **Accessibility**: WCAG 2.1 AA (via Atlassian DS)

### Industry Standards
- **API Design**: RESTful principles
- **Security**: OWASP guidelines
- **Code**: Clean Code principles
- **Documentation**: IEEE standards

---

## Appendices

### A. Environment Variables
See [Deployment Guide](./DEPLOYMENT.md)

### B. API Reference
See [API Specification](./api-specification.md)

### C. Architecture Diagrams
See [Architecture Documentation](./architecture-docs/)

### D. Security Policies
See [Security Documentation](../SECURITY.md)

---

*This document is maintained by the Development Team and updated with each major release.*