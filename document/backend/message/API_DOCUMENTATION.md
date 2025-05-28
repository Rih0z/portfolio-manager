# API Documentation

## Overview

The pfwise-api provides RESTful endpoints for fetching market data, managing authentication, and integrating with Google Drive for portfolio storage.

## Base URL

- Development: `http://localhost:3000/dev`
- Production: `https://api.portfolio-wise.com`

## Authentication

### Public Endpoints
Most market data endpoints are publicly accessible without authentication.

### User Authentication
- Google OAuth 2.0 for user authentication
- Session-based authentication using cookies
- Session ID stored in `sessionId` cookie

### Admin Authentication
- API key required in `x-api-key` header
- IP whitelist restriction for additional security

## Endpoints

### Market Data

#### Get Market Data
```
GET /api/market-data
```

Fetches market data for stocks, mutual funds, or exchange rates.

**Query Parameters:**
- `type` (required): Data type - `us-stock`, `jp-stock`, `mutual-fund`, `exchange-rate`
- `symbols` (required for stocks/funds): Comma-separated list of symbols
  - Example: `symbols=AAPL,GOOGL,MSFT`
- `base` (required for exchange-rate): Base currency (e.g., `USD`)
- `target` (required for exchange-rate): Target currency (e.g., `JPY`)
- `refresh` (optional): Force cache refresh (`true`/`false`)

**Examples:**

```bash
# Single US stock
GET /api/market-data?type=us-stock&symbols=AAPL

# Multiple US stocks (batch request)
GET /api/market-data?type=us-stock&symbols=AAPL,GOOGL,MSFT

# Japanese stock
GET /api/market-data?type=jp-stock&symbols=7203.T

# Single exchange rate
GET /api/market-data?type=exchange-rate&base=USD&target=JPY

# Multiple exchange rates (batch request)
GET /api/market-data?type=exchange-rate&symbols=USD-JPY,EUR-JPY,GBP-JPY

# Force refresh
GET /api/market-data?type=us-stock&symbols=AAPL&refresh=true
```

**Response Format:**

For single item:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 175.43,
    "currency": "USD",
    "change": 2.15,
    "changePercent": 1.24,
    "timestamp": "2024-01-20T15:30:00Z"
  }
}
```

For multiple items:
```json
{
  "success": true,
  "data": {
    "AAPL": {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 175.43,
      "currency": "USD",
      "change": 2.15,
      "changePercent": 1.24,
      "timestamp": "2024-01-20T15:30:00Z"
    },
    "GOOGL": {
      "symbol": "GOOGL",
      "name": "Alphabet Inc.",
      "price": 142.78,
      "currency": "USD",
      "change": -0.92,
      "changePercent": -0.64,
      "timestamp": "2024-01-20T15:30:00Z"
    }
  }
}
```

### Authentication

#### Google Login
```
POST /auth/google/login
```

Initiates Google OAuth login flow.

**Request Body:**
```json
{
  "credential": "google-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "user@example.com",
      "name": "John Doe",
      "picture": "https://..."
    },
    "sessionId": "session-id"
  }
}
```

#### Get Session
```
GET /auth/session
```

Returns current user session information.

**Headers:**
- `Cookie`: Must include `sessionId`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "user@example.com",
      "name": "John Doe"
    },
    "isAuthenticated": true
  }
}
```

#### Logout
```
POST /auth/logout
```

Logs out the current user.

**Headers:**
- `Cookie`: Must include `sessionId`

### Google Drive Integration

#### Initiate Drive Auth
```
GET /auth/google/drive/initiate
```

Starts Google Drive OAuth flow for file access.

**Headers:**
- `Cookie`: Must include `sessionId`

#### Drive Auth Callback
```
GET /auth/google/drive/callback
```

Handles OAuth callback from Google.

**Query Parameters:**
- `code`: Authorization code from Google
- `state`: State parameter for security

#### List Drive Files
```
GET /drive/files
```

Lists portfolio files from Google Drive.

**Headers:**
- `Cookie`: Must include `sessionId`

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-id",
        "name": "portfolio.json",
        "modifiedTime": "2024-01-20T10:00:00Z"
      }
    ]
  }
}
```

#### Load File
```
GET /drive/load?fileId=<file-id>
```

Loads a portfolio file from Google Drive.

**Headers:**
- `Cookie`: Must include `sessionId`

#### Save File
```
POST /drive/save
```

Saves portfolio data to Google Drive.

**Headers:**
- `Cookie`: Must include `sessionId`

**Request Body:**
```json
{
  "fileName": "portfolio.json",
  "data": { ... }
}
```

### Admin Endpoints

#### Get Status
```
GET /admin/status
```

Returns API status and cache information.

**Headers:**
- `x-api-key`: Admin API key

#### Get Budget Status
```
GET /admin/getBudgetStatus
```

Returns AWS budget usage information.

**Headers:**
- `x-api-key`: Admin API key

#### Reset Usage
```
POST /admin/reset
```

Resets usage counters.

**Headers:**
- `x-api-key`: Admin API key

## Error Responses

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "symbols",
      "reason": "Required parameter missing"
    }
  }
}
```

### Common Error Types

- `VALIDATION_ERROR`: Invalid request parameters
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `AUTH_ERROR`: Authentication failed
- `PERMISSION_ERROR`: Insufficient permissions
- `EXTERNAL_API_ERROR`: External API failure
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

- Default: 100 requests per minute per IP
- Authenticated users: 200 requests per minute
- Admin endpoints: 50 requests per minute

## Caching

- All market data is cached for 1 hour
- Cache can be bypassed with `refresh=true` parameter
- Batch requests are cached as a group for efficiency

## CORS Configuration

Allowed origins:
- `http://localhost:3000`
- `http://localhost:3001`
- `https://portfolio-wise.com`
- `https://www.portfolio-wise.com`

## Best Practices

1. **Use Batch Requests**: When fetching multiple items, use comma-separated symbols for better performance
2. **Cache Awareness**: Respect cache times to reduce API load
3. **Error Handling**: Implement proper error handling for all error types
4. **Session Management**: Store session ID securely and include in all authenticated requests
5. **Rate Limit Handling**: Implement exponential backoff when rate limited