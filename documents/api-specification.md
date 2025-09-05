# PortfolioWise API Specification

## API Version: 1.0.0
Base URL: `https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod`

## Authentication
All endpoints use cookie-based session authentication with Google OAuth 2.0.

### Headers Required
- `Cookie`: Session cookie from authentication
- `Content-Type`: application/json (for POST requests)

---

## 🔐 Authentication Endpoints

### POST /auth/google/login
**Description**: Authenticate user with Google OAuth
**Request Body**:
```json
{
  "credential": "string (Google ID token)"
}
```
**Response**: 
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  },
  "sessionId": "uuid"
}
```

### GET /auth/session
**Description**: Get current user session
**Response**:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "User Name"
  },
  "sessionId": "uuid",
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

### POST /auth/csrf-token
**Description**: Generate CSRF token for form submissions
**Response**:
```json
{
  "token": "csrf-token-string"
}
```

### POST /auth/logout
**Description**: End user session
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📊 Market Data Endpoints

### GET /api/market-data
**Description**: Fetch market data for stocks, ETFs, mutual funds, and exchange rates

**Query Parameters**:
- `symbols` (required): Comma-separated list of symbols
- `types` (required): Comma-separated list of types (us-stock, jp-stock, mutual-fund, exchange-rate)
- `fallbackToCache` (optional): Use cached data if live data unavailable (default: true)

**Example Request**:
```
GET /api/market-data?symbols=AAPL,7203,USDJPY&types=us-stock,jp-stock,exchange-rate
```

**Response**:
```json
{
  "success": true,
  "data": {
    "AAPL": {
      "symbol": "AAPL",
      "type": "us-stock",
      "price": 189.50,
      "currency": "USD",
      "change": 2.30,
      "changePercent": 1.23,
      "previousClose": 187.20,
      "marketCap": 2950000000000,
      "volume": 45678900,
      "timestamp": "2025-01-01T15:30:00Z",
      "source": "yahoo-finance"
    },
    "7203": {
      "symbol": "7203",
      "type": "jp-stock",
      "price": 2850.0,
      "currency": "JPY",
      "change": 45.0,
      "changePercent": 1.60,
      "previousClose": 2805.0,
      "marketCap": 45000000000000,
      "volume": 12345678,
      "timestamp": "2025-01-01T06:00:00Z",
      "source": "jpx-csv"
    },
    "USDJPY": {
      "symbol": "USDJPY",
      "type": "exchange-rate",
      "rate": 150.25,
      "from": "USD",
      "to": "JPY",
      "timestamp": "2025-01-01T12:00:00Z",
      "source": "yahoo-finance"
    }
  },
  "errors": [],
  "metadata": {
    "requestId": "uuid",
    "timestamp": "2025-01-01T12:00:00Z",
    "sources": ["yahoo-finance", "jpx-csv"]
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retryAfter": 60
  }
}
```

---

## 💾 Google Drive Integration

### GET /auth/google/drive/initiate
**Description**: Initiate Google Drive OAuth flow
**Response**: Redirect to Google OAuth consent screen

### GET /auth/google/drive/callback
**Description**: Handle Google Drive OAuth callback
**Query Parameters**:
- `code`: Authorization code from Google
- `state`: State parameter for CSRF protection

### POST /drive/save
**Description**: Save portfolio data to Google Drive
**Request Body**:
```json
{
  "fileName": "portfolio-2025-01.json",
  "data": {
    "portfolio": "...portfolio data..."
  }
}
```
**Response**:
```json
{
  "success": true,
  "fileId": "google-drive-file-id",
  "fileName": "portfolio-2025-01.json"
}
```

### GET /drive/load
**Description**: Load portfolio data from Google Drive
**Query Parameters**:
- `fileId`: Google Drive file ID

**Response**:
```json
{
  "success": true,
  "data": {
    "portfolio": "...portfolio data..."
  },
  "fileName": "portfolio-2025-01.json",
  "modifiedTime": "2025-01-01T00:00:00Z"
}
```

### GET /drive/files
**Description**: List portfolio files in Google Drive
**Response**:
```json
{
  "success": true,
  "files": [
    {
      "id": "file-id-1",
      "name": "portfolio-2025-01.json",
      "modifiedTime": "2025-01-01T00:00:00Z",
      "size": 1024
    }
  ]
}
```

---

## ⚙️ Configuration

### GET /config/client
**Description**: Get client configuration (API keys, feature flags)
**Response**:
```json
{
  "googleClientId": "google-oauth-client-id",
  "features": {
    "driveIntegration": true,
    "aiAnalysis": true,
    "darkMode": true
  },
  "limits": {
    "maxPortfolioSize": 100,
    "maxApiCallsPerDay": 1000
  },
  "supportedMarkets": ["US", "JP"],
  "defaultCurrency": "JPY",
  "defaultExchangeRate": 150.0
}
```

---

## 🔒 Admin Endpoints (Protected)

### GET /admin/status
**Description**: Get system status and metrics
**Authentication**: Requires admin role + IP whitelist
**Response**:
```json
{
  "status": "healthy",
  "metrics": {
    "requestsToday": 1234,
    "requestsThisMonth": 45678,
    "cacheHitRate": 0.85,
    "errorRate": 0.02
  },
  "limits": {
    "daily": 5000,
    "monthly": 100000
  }
}
```

### POST /admin/reset
**Description**: Reset usage counters
**Authentication**: Requires admin role + IP whitelist

### GET /admin/getBudgetStatus
**Description**: Get AWS budget and cost status
**Authentication**: Requires admin role + IP whitelist

---

## Error Codes

| Code | Description | HTTP Status |
|------|------------|-------------|
| `AUTH_REQUIRED` | Authentication required | 401 |
| `INVALID_TOKEN` | Invalid or expired token | 401 |
| `FORBIDDEN` | Access forbidden | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INVALID_REQUEST` | Invalid request parameters | 400 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

---

## Rate Limits

- **Authenticated users**: 100 requests/minute
- **Unauthenticated users**: 10 requests/minute
- **Batch requests**: Max 20 symbols per request

---

## Data Sources Priority

1. **Yahoo Finance2** (npm) - Free, no API key
2. **JPX CSV** - Official Japan Exchange data (20min delay)
3. **Alpha Vantage** - When API key available
4. **Web Scraping** - Last resort fallback
5. **Cached/Fallback Data** - When all sources fail

---

## Response Times

- Cache hit: < 100ms
- Live data fetch: 500ms - 3s
- Batch request (20 symbols): 2s - 10s

---

## CORS Configuration

Allowed origins:
- `https://portfolio-wise.com`
- `http://localhost:3000`
- `http://localhost:3001`

---

## Webhooks & Events

Currently not supported. All communication is synchronous via REST API.

---

## SDK & Client Libraries

### JavaScript/TypeScript
```javascript
import { PortfolioWiseAPI } from '@portfoliowise/api-client';

const api = new PortfolioWiseAPI({
  baseURL: 'https://api.portfolio-wise.com',
  credentials: 'include'
});

// Fetch market data
const data = await api.marketData.fetch({
  symbols: ['AAPL', '7203'],
  types: ['us-stock', 'jp-stock']
});
```

---

## Changelog

### v1.0.0 (2025-01-01)
- Initial API release
- Market data endpoints
- Google OAuth authentication
- Google Drive integration
- Admin endpoints

---

## Support

- GitHub Issues: https://github.com/portfoliowise/api/issues
- Email: support@portfolio-wise.com