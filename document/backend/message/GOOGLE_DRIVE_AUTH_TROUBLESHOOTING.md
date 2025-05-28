# Google Drive Authentication Troubleshooting Guide

## Issue Summary

The Google Drive authentication endpoint (`/auth/google/drive/initiate`) was experiencing CORS errors and authentication failures. The AWS CloudWatch logs showed:

1. OPTIONS requests being received but not properly handled
2. No Cookie or Authorization headers present in requests
3. Session not found errors (NO_AUTH)
4. Client-side CORS errors preventing the request

## Root Causes Identified

### 1. Missing OPTIONS Request Handler
The handler function was not explicitly checking for OPTIONS requests at the beginning, causing it to process OPTIONS requests as regular GET requests.

### 2. CORS Header Configuration
The CORS headers were being set statically without considering the actual request origin, which could cause issues with credentials.

### 3. Cookie/Session Handling
The session lookup was failing because:
- Cookies weren't being sent due to CORS configuration issues
- The client might not be including `withCredentials: true` in requests

## Solutions Implemented

### 1. Added Explicit OPTIONS Handling
```javascript
// OPTIONSリクエストの処理
if (event.httpMethod === 'OPTIONS') {
  console.log('Handling OPTIONS request for Drive Auth');
  return {
    statusCode: 200,
    headers: getCorsHeaders({}, event),
    body: ''
  };
}
```

### 2. Enhanced CORS Helper
Updated `corsHelper.js` to dynamically set the Access-Control-Allow-Origin based on the request origin:
- Checks if the request origin is in the allowed list
- Returns the specific origin instead of a wildcard when credentials are used
- Supports wildcard patterns for domain matching

### 3. Improved Session Retrieval
The `sessionHelper.js` now:
- Checks both Cookie and cookie headers (case-insensitive)
- Checks both Authorization and authorization headers
- Provides detailed debugging information
- Supports Bearer token authentication as a fallback

## Client-Side Requirements

For the authentication to work properly, the client must:

### 1. Include Credentials in Requests
```javascript
fetch('/auth/google/drive/initiate', {
  method: 'GET',
  credentials: 'include', // This is crucial!
  headers: {
    'Content-Type': 'application/json'
  }
})
```

Or with axios:
```javascript
axios.get('/auth/google/drive/initiate', {
  withCredentials: true // This is crucial!
})
```

### 2. Handle CORS Preflight
The browser will automatically send OPTIONS requests for CORS preflight. The client doesn't need to handle this explicitly.

### 3. Ensure Session Cookie is Set
The user must be logged in first via `/auth/google/login` which sets a session cookie. This cookie must be included in subsequent requests.

## Testing the Fix

1. **Deploy the changes**:
   ```bash
   npm run deploy
   ```

2. **Test with the provided script**:
   ```bash
   # First, get a session by logging in
   # Then use the session cookie for testing
   SESSION_COOKIE="your-session-id" node scripts/test-drive-auth.js
   ```

3. **Check CloudWatch logs** for detailed debugging information

## Debugging Checklist

If issues persist, check:

1. **Client-side**:
   - Is `withCredentials: true` or `credentials: 'include'` set?
   - Is the request origin in the allowed list?
   - Are cookies enabled in the browser?
   - Is the session cookie present?

2. **Server-side**:
   - Check CloudWatch logs for the actual headers received
   - Verify CORS_ALLOWED_ORIGINS environment variable
   - Ensure the session exists in DynamoDB
   - Check if the session has expired

3. **Network**:
   - Use browser DevTools Network tab to inspect:
     - OPTIONS request and response
     - Actual GET request headers
     - Response headers
   - Check if cookies are being sent

## Environment Variables

Ensure these are properly configured:

```yaml
CORS_ALLOWED_ORIGINS: 'http://localhost:3001,https://portfolio-wise.com'
GOOGLE_CLIENT_ID: 'your-client-id'
GOOGLE_CLIENT_SECRET: 'your-client-secret'
GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/drive/callback'
```

## Common Error Messages and Solutions

### "NO_AUTH: 認証情報が見つかりません"
**Cause**: No session cookie or authorization header
**Solution**: Ensure the user is logged in and cookies are being sent

### "INVALID_SESSION: セッションが無効です"
**Cause**: Session expired or doesn't exist
**Solution**: User needs to log in again

### "AUTH_URL_ERROR: Drive認証URLの生成に失敗しました"
**Cause**: Google OAuth client configuration issue
**Solution**: Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables