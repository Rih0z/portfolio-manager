# PortfolioWise Migration Guide

## Current Version: 2.0.0

This guide provides step-by-step instructions for migrating between major versions of PortfolioWise.

## Table of Contents
1. [Version 2.0.0 - Atlassian Design System](#version-200---atlassian-design-system)
2. [Version 1.5.0 - Cloudflare Migration](#version-150---cloudflare-migration)
3. [Version 1.0.0 - Initial Release](#version-100---initial-release)

---

## Version 2.0.0 - Atlassian Design System
*Released: 2025-08-22*

### Overview
Major UI overhaul replacing custom components with Atlassian Design System.

### Breaking Changes
- Custom Button components removed
- Theme token system changed
- CSS class names updated
- Component prop interfaces modified

### Migration Steps

#### 1. Update Dependencies
```bash
npm install @atlaskit/tokens@latest
npm install @atlaskit/button@latest
npm install @atlaskit/modal-dialog@latest
npm install @atlaskit/form@latest
npm install @atlaskit/textfield@latest
```

#### 2. Update Component Imports
```javascript
// Before
import { CustomButton } from './components/common/Button';

// After
import Button from '@atlaskit/button';
```

#### 3. Update Theme Tokens
```javascript
// Before
const primaryColor = '#007bff';

// After
import { token } from '@atlaskit/tokens';
const primaryColor = token('color.background.brand.bold');
```

#### 4. Update CSS Classes
```css
/* Before */
.custom-button { ... }

/* After - use Atlassian components directly */
/* No custom CSS needed */
```

#### 5. Test UI Components
```bash
npm run test:unit
npm run test:e2e
```

### Rollback Instructions
```bash
git checkout v1.5.0
npm install
npm run build
```

---

## Version 1.5.0 - Cloudflare Migration
*Released: 2025-05-29*

### Overview
Infrastructure migration from Netlify to Cloudflare Pages.

### Breaking Changes
- Deployment process changed
- Environment variable configuration
- Build commands updated
- Preview URL structure changed

### Migration Steps

#### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

#### 2. Update Environment Variables
Create `.env.production`:
```env
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

#### 3. Update Build Script
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--openssl-legacy-provider' react-scripts build"
  }
}
```

#### 4. Deploy to Cloudflare
```bash
npm run build
wrangler pages deploy build --project-name=portfolio-manager
```

#### 5. Configure Custom Domain
1. Go to Cloudflare Dashboard
2. Select Pages project
3. Custom domains → Add domain
4. Enter: portfolio-wise.com

#### 6. Update CORS Settings
In `backend/serverless.yml`:
```yaml
cors:
  origins:
    - https://portfolio-wise.com
    - https://*.portfolio-manager-7bx.pages.dev
```

### Data Migration
No data migration required - all data remains in AWS.

### Rollback Instructions
Not applicable - Netlify infrastructure no longer available.

---

## Version 1.0.0 - Initial Release
*Released: 2025-05-27*

### Overview
Initial public release of PortfolioWise.

### Setup Instructions

#### 1. Frontend Setup
```bash
git clone https://github.com/portfoliowise/portfolio-manager.git
cd portfolio-manager/frontend/webapp
npm install
npm start
```

#### 2. Backend Setup
```bash
cd backend
npm install
npm run deploy:dev
```

#### 3. Google OAuth Configuration
1. Create project in Google Cloud Console
2. Enable Google+ API and Drive API
3. Create OAuth 2.0 credentials
4. Add redirect URIs

#### 4. AWS Configuration
```bash
aws configure
# Enter your AWS credentials
```

#### 5. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## General Migration Best Practices

### Before Migration
1. **Backup Data**
   ```bash
   # Export portfolio data
   npm run export:portfolio
   
   # Backup database
   aws dynamodb create-backup --table-name pfwise-api-prod-cache
   ```

2. **Test in Staging**
   ```bash
   npm run deploy:staging
   npm run test:staging
   ```

3. **Review Dependencies**
   ```bash
   npm audit
   npm outdated
   ```

### During Migration
1. **Monitor Logs**
   ```bash
   serverless logs -f marketData -t
   ```

2. **Check Health Endpoints**
   ```bash
   curl https://api.portfolio-wise.com/health
   ```

3. **Verify Authentication**
   - Test Google OAuth flow
   - Verify session persistence

### After Migration
1. **Verify Functionality**
   - [ ] Authentication works
   - [ ] Market data loads
   - [ ] Portfolio calculations correct
   - [ ] Google Drive sync works
   - [ ] UI renders correctly

2. **Performance Check**
   ```bash
   npm run lighthouse
   ```

3. **Security Audit**
   ```bash
   npm audit fix
   ```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
**Problem**: Users can't log in after migration
**Solution**:
```bash
# Check Google OAuth configuration
aws secretsmanager get-secret-value --secret-id pfwise-api/google-oauth

# Verify redirect URIs in Google Console
```

#### 2. Missing Market Data
**Problem**: Market data not loading
**Solution**:
```bash
# Clear cache
aws dynamodb delete-item --table-name pfwise-api-prod-cache --key '{"key":{"S":"CACHE_KEY"}}'

# Check API keys
aws secretsmanager get-secret-value --secret-id pfwise-api/credentials
```

#### 3. UI Components Broken
**Problem**: Components not rendering after Atlassian migration
**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf build
npm run build
```

#### 4. Deployment Failures
**Problem**: Cloudflare deployment fails
**Solution**:
```bash
# Check Wrangler version
wrangler --version

# Update Wrangler
npm install -g wrangler@latest

# Retry deployment
wrangler pages deploy build --project-name=portfolio-manager
```

---

## Version Compatibility Matrix

| Component | v1.0.0 | v1.5.0 | v2.0.0 |
|-----------|--------|--------|--------|
| Node.js | 16.x | 18.x | 18.x |
| React | 18.2.0 | 18.2.0 | 18.2.0 |
| AWS SDK | v2 | v3 | v3 |
| DynamoDB | Compatible | Compatible | Compatible |
| Google OAuth | 2.0 | 2.0 | 2.0 |

---

## Support

### Getting Help
- GitHub Issues: https://github.com/portfoliowise/portfolio-manager/issues
- Documentation: https://docs.portfolio-wise.com
- Email: support@portfolio-wise.com

### Reporting Issues
When reporting migration issues, please include:
1. Current version
2. Target version
3. Error messages
4. Browser/OS information
5. Steps to reproduce

---

*This document is updated with each major release. For minor updates, see [CHANGELOG.md](./CHANGELOG.md).*