#!/bin/bash

# Clean production deployment script
# This ensures all dependencies are properly included by using a separate package.json

set -e

echo "🚀 Starting clean production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running from backend directory
if [ ! -f "serverless.yml" ]; then
    echo -e "${RED}Error: Must run from backend directory${NC}"
    exit 1
fi

# Clean any existing node_modules in backend
echo "🧹 Cleaning existing node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Use production package.json
echo "📦 Setting up production dependencies..."
cp package.production.json package.json

# Install dependencies fresh
echo "📥 Installing production dependencies (this may take a few minutes)..."
npm install --production --no-audit --no-fund

# Verify axios installation
echo "🔍 Verifying axios installation..."
if [ -d "node_modules/axios" ]; then
    echo -e "${GREEN}✓ axios is installed${NC}"
    ls -la node_modules/axios/package.json
else
    echo -e "${RED}✗ axios is NOT installed${NC}"
    echo "Attempting manual installation..."
    npm install axios@^1.6.2 --production --no-save
fi

# List all installed packages
echo "📋 Installed packages:"
npm ls --depth=0 --production || true

# Deploy to production
echo "🚀 Deploying to AWS Lambda (production)..."
npx serverless@3.32.2 deploy --stage prod --verbose

# Verify deployment
if [ -f ".serverless/pfwise-api.zip" ]; then
    echo ""
    echo "📦 Deployment package details:"
    ls -lh .serverless/pfwise-api.zip
    
    echo ""
    echo "🔍 Checking package contents for critical dependencies..."
    unzip -l .serverless/pfwise-api.zip | grep -E "(axios|jsonwebtoken|joi|lodash)" | head -20
fi

# Restore original package.json
echo "🔄 Restoring original package.json..."
git checkout package.json

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Post-deployment checklist:"
echo "1. Test the production API endpoints"
echo "2. Check CloudWatch logs for any errors"
echo "3. Verify market data fetching is working"
echo "4. Test authentication endpoints"