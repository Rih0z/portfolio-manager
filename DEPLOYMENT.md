# Production Deployment Guide / デプロイメントガイド

## Overview
This guide explains how to deploy the Portfolio Manager application to production environments.

## Prerequisites / 前提条件
- AWS CLI configured with appropriate credentials
- Node.js 18.x or higher
- npm 8.x or higher
- Netlify CLI (for frontend deployment)
- Serverless Framework v3.32.2

## Backend Deployment (AWS) / バックエンドデプロイ

### Development Environment / 開発環境
```bash
cd backend
npm install

# Deploy to development
npm run deploy
```
**API URL**: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev

### Production Environment / 本番環境
```bash
cd backend
npm install

# Deploy to production
npm run deploy:prod
```
**API URL**: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod

### AWS Secrets Manager Setup
```bash
# Set up all secrets (if not already done)
./scripts/setup-all-secrets.sh
```

## Frontend Deployment (Netlify) / フロントエンドデプロイ

### Current Configuration / 現在の設定
`netlify.toml` is properly configured:
```toml
[build]
  base = "frontend/webapp"
  command = "CI= npm run build"
  publish = "build"
```

### Environment Variables / 環境変数

#### Development (.env.development)
```
REACT_APP_API_BASE_URL=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

#### Production (.env.production)
```
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

### Deployment Steps / デプロイ手順
1. Create project in Netlify Dashboard
2. Connect GitHub repository
3. Set environment variables:
   - `REACT_APP_API_BASE_URL`: Production API Gateway URL
   - `REACT_APP_DEFAULT_EXCHANGE_RATE`: 150.0

## Important Security Notes / 重要なセキュリティ注意事項

### Debug Endpoints / デバッグエンドポイント
The debug endpoint at `/debug/google-config` must be commented out in `serverless.yml` before deploying to production. This endpoint is for development use only.

### Admin IP Whitelist / 管理者IPホワイトリスト
Set the `ADMIN_IP_WHITELIST` environment variable with comma-separated IP addresses that are allowed to access admin endpoints:
```bash
export ADMIN_IP_WHITELIST="1.2.3.4,5.6.7.8"
```

### Build and Deploy Locally
```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=build
```

### Notes / 注意事項
- The `netlify/functions/` folder contains legacy proxy functions (backend is now on AWS)

## Required AWS Services / 必要なAWSサービス
- API Gateway
- Lambda
- DynamoDB
- Secrets Manager
- CloudWatch Logs

## Security Checklist / セキュリティチェックリスト
- ✓ CSRF Protection enabled on all state-changing endpoints
- ✓ Rate limiting configured per API endpoint
- ✓ Environment variables for API URLs
- ✓ Sensitive data filtered from logs
- ✓ AWS Secrets Manager for authentication credentials
- ✓ Security headers configured in Netlify
- ☐ Disable debug endpoints in production
- ☐ Strict CORS configuration for production

## Monitoring and Rollback / 監視とロールバック

### Backend Monitoring (AWS CloudWatch)
- Lambda function logs
- API Gateway access logs
- Performance metrics and alarms

### Frontend Monitoring (Netlify Analytics)
- Page views and performance
- Error tracking
- User engagement metrics

### Rollback Procedures

#### Backend Rollback
```bash
# List previous deployments
cd backend
npx serverless@3.32.2 deploy list --stage prod

# Rollback to specific timestamp
npx serverless@3.32.2 rollback --timestamp <timestamp> --stage prod
```

#### Frontend Rollback
Use Netlify's deployment history to rollback to previous versions.

## Troubleshooting / トラブルシューティング

### Common Issues

1. **502 Bad Gateway errors**
   - Check Lambda function logs in CloudWatch
   - Verify environment variables in AWS Secrets Manager
   - Ensure Lambda has proper IAM permissions

2. **CORS errors**
   - Verify allowed origins in serverless.yml
   - Check OPTIONS endpoints are properly configured
   - Ensure credentials are included in requests

3. **Authentication failures**
   - Verify Google OAuth credentials in Secrets Manager
   - Check cookie settings for production domain
   - Ensure session secret is properly configured

4. **Market data API errors**
   - Check API key configuration in Secrets Manager
   - Verify rate limits haven't been exceeded
   - Check fallback providers are configured

## Production Readiness Checklist
- ✓ Backend deployed to both dev and prod environments
- ✓ Frontend environment variables configured
- ✓ Security measures implemented (CSRF, rate limiting, etc.)
- ✓ E2E tests created and passing with mock server
- ✓ Deployment documentation created
- ☐ Configure production domain in Netlify
- ☐ Set up monitoring alerts in AWS CloudWatch
- ☐ Configure backup and disaster recovery procedures
- ☐ Load testing and performance optimization

## Support
For issues or questions, please create an issue in the GitHub repository.