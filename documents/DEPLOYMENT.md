# PortfolioWise Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- AWS Account (for backend)
- Cloudflare Account (for frontend hosting)
- Google Cloud Console access (for OAuth setup)

## 🚀 Quick Deploy (Production)

### 1. Frontend Deployment to Cloudflare Pages

```bash
# Clone and setup
git clone https://github.com/portfoliowise/portfolio-manager.git
cd portfolio-manager/frontend/webapp

# Install dependencies
npm install

# Build with production environment
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# Deploy to Cloudflare Pages
npm install -g wrangler
wrangler pages deploy build --project-name=portfolio-manager
```

### 2. Backend Deployment to AWS Lambda

```bash
cd backend

# Install dependencies
npm install

# Install serverless framework
npm install -g serverless

# Configure AWS credentials
aws configure

# Deploy to production
npm run deploy:prod
```

## 📝 Detailed Setup

### Step 1: Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://portfolio-wise.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (for development)
6. Save Client ID and Client Secret

### Step 2: AWS Setup

#### Create AWS Resources:

1. **DynamoDB Tables** (auto-created by Serverless):
   - `pfwise-api-prod-cache`
   - `pfwise-api-prod-sessions`
   - `pfwise-api-prod-scraping-blacklist`
   - `pfwise-api-prod-rate-limits`

2. **Secrets Manager**:
```bash
# Create secret for API credentials
aws secretsmanager create-secret \
  --name pfwise-api/credentials \
  --secret-string '{
    "GOOGLE_CLIENT_ID": "your-client-id",
    "GOOGLE_CLIENT_SECRET": "your-secret",
    "ALPHA_VANTAGE_API_KEY": "optional-key",
    "RAPIDAPI_KEY": "optional-key"
  }'
```

3. **Environment Variables** (in serverless.yml):
```yaml
environment:
  ADMIN_EMAIL: admin@example.com
  DAILY_REQUEST_LIMIT: 5000
  MONTHLY_REQUEST_LIMIT: 100000
  CORS_ALLOWED_ORIGINS: https://portfolio-wise.com
```

### Step 3: Frontend Configuration

#### Environment Variables:
```bash
# .env.production
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

#### Cloudflare Pages Settings:
1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Settings → Environment variables
4. Add production variables

### Step 4: Custom Domain Setup

#### For portfolio-wise.com:
1. Add domain to Cloudflare
2. Update DNS records:
   ```
   Type: CNAME
   Name: @
   Content: portfolio-manager-7bx.pages.dev
   ```
3. Enable SSL/TLS → Full
4. Configure in Pages project settings

## 🔧 Development Setup

### Local Development

```bash
# Terminal 1: Backend
cd backend
npm run dynamodb:start  # Start local DynamoDB
npm run dev            # Start serverless offline

# Terminal 2: Frontend
cd frontend/webapp
npm start              # Starts on http://localhost:3000
```

### Testing

```bash
# Frontend tests
cd frontend/webapp
npm test               # Run all tests
npm run test:coverage  # With coverage report

# Backend tests
cd backend
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
```

## 📊 Monitoring & Maintenance

### CloudWatch Logs

```bash
# View Lambda logs
serverless logs -f marketData -t

# View all function logs
serverless logs -f all --stage prod
```

### Cost Optimization

Current setup optimized for AWS free tier:
- Lambda: 256MB memory, 30s timeout
- DynamoDB: On-demand billing
- CloudWatch: WARN log level in production
- API Gateway: Caching enabled

Monthly cost target: < $25

### Performance Metrics

Monitor these KPIs:
- API response time: < 500ms (cached), < 3s (live)
- Cache hit rate: > 80%
- Error rate: < 2%
- Availability: > 99.9%

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors
- Check `CORS_ALLOWED_ORIGINS` in serverless.yml
- Ensure `withCredentials: true` in frontend API calls

#### 2. Authentication Failed
- Verify Google OAuth credentials in Secrets Manager
- Check redirect URIs match exactly

#### 3. Rate Limiting
- Default: 100 requests/minute
- Adjust `MAX_REQUESTS_PER_MINUTE` if needed

#### 4. Build Failures
- Use `NODE_OPTIONS='--openssl-legacy-provider'` for older Node versions
- Clear cache: `rm -rf node_modules && npm install`

### Debug Mode

Enable debug logging:
```bash
# Backend
LOG_LEVEL=debug npm run dev

# Frontend
REACT_APP_DEBUG=true npm start
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd frontend/webapp
          npm ci
          npm run build
      - uses: cloudflare/wrangler-action@2.0.0
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy build --project-name=portfolio-manager

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd backend
          npm ci
          npx serverless deploy --stage prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 📚 Additional Resources

- [API Documentation](./api-specification.md)
- [Architecture Overview](./architecture-docs/README.md)
- [Security Guidelines](./architecture-docs/architecture/security-architecture.md)
- [Contributing Guide](../CONTRIBUTING.md)

## 🆘 Support

- GitHub Issues: https://github.com/portfoliowise/portfolio-manager/issues
- Email: support@portfolio-wise.com
- Documentation: https://docs.portfolio-wise.com