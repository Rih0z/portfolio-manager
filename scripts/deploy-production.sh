#!/bin/bash

# Deploy to Cloudflare Pages Production
# This script builds and deploys directly to production

set -e

echo "🚀 Starting production deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Clean up any previous build directory
echo "🧹 Cleaning up previous builds..."
rm -rf frontend/webapp-build

# Create isolated build directory
echo "📦 Creating isolated build environment..."
cp -r frontend/webapp frontend/webapp-build

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend/webapp-build
npm install --legacy-peer-deps --no-audit --no-fund

# Fix ajv dependency issue
echo "🔧 Fixing ajv dependency..."
npm install ajv@8 --legacy-peer-deps --no-audit --no-fund

# Build the application
echo "🔨 Building application..."
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# Deploy to Cloudflare Pages (production)
echo "☁️  Deploying to Cloudflare Pages..."
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=main \
  --commit-dirty=true

# Clean up
cd ../..
rm -rf frontend/webapp-build

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Production URL: https://portfolio-wise.com${NC}"