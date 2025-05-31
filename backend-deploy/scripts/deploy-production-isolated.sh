#!/bin/bash

# Deploy production Lambda with isolated dependencies
# This script creates a temporary isolated environment to ensure all dependencies are included

set -e

echo "🚀 Starting isolated production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from backend directory
if [ ! -f "serverless.yml" ]; then
    echo -e "${RED}Error: Must run from backend directory${NC}"
    exit 1
fi

# Create temporary deployment directory
TEMP_DIR="/tmp/pfwise-backend-deploy-$(date +%s)"
echo "📁 Creating temporary deployment directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy backend files to temp directory
echo "📋 Copying backend files..."
cp -r src/ "$TEMP_DIR/"
cp -r config/ "$TEMP_DIR/" 2>/dev/null || true
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true
cp serverless.yml "$TEMP_DIR/"
cp -r scripts/ "$TEMP_DIR/" 2>/dev/null || true

# Copy .env files if they exist
if [ -f ".env" ]; then
    cp .env "$TEMP_DIR/"
fi
if [ -f ".env.production" ]; then
    cp .env.production "$TEMP_DIR/"
fi

# Change to temp directory
cd "$TEMP_DIR"

# Clean install dependencies (production only)
echo "📦 Installing production dependencies..."
npm ci --production --no-audit --no-fund

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."
CRITICAL_DEPS=("axios" "aws-sdk" "@aws-sdk/client-dynamodb" "jsonwebtoken" "joi")
MISSING_DEPS=()

for dep in "${CRITICAL_DEPS[@]}"; do
    if [ ! -d "node_modules/$dep" ]; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Warning: Some dependencies might be missing: ${MISSING_DEPS[*]}${NC}"
    echo "Attempting to install missing dependencies..."
    npm install --production --no-save ${MISSING_DEPS[*]}
fi

# Check axios specifically
if [ ! -d "node_modules/axios" ]; then
    echo -e "${RED}Error: axios is still missing after installation${NC}"
    echo "Installing axios explicitly..."
    npm install --production --no-save axios@^1.6.2
fi

# Display package size
echo "📊 Package information:"
du -sh node_modules/ || echo "Could not calculate node_modules size"
find . -name "*.js" -not -path "./node_modules/*" -not -path "./__tests__/*" | wc -l | xargs echo "JavaScript files:"

# Deploy to production
echo "🚀 Deploying to AWS Lambda (production)..."
npx serverless@3.32.2 deploy --stage prod --verbose

# Check deployment package
if [ -d ".serverless" ]; then
    echo "📦 Checking deployment package contents..."
    if [ -f ".serverless/pfwise-api.zip" ]; then
        echo "Deployment package size:"
        ls -lh .serverless/pfwise-api.zip
        
        # Check if axios is in the package
        echo "Checking for axios in deployment package..."
        unzip -l .serverless/pfwise-api.zip | grep -c "axios" || echo "Warning: axios might not be in the package"
    fi
fi

# Get deployment info
echo "📋 Deployment summary:"
npx serverless@3.32.2 info --stage prod

# Cleanup
echo "🧹 Cleaning up temporary directory..."
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the production endpoints"
echo "2. Monitor CloudWatch logs for any errors"
echo "3. Verify all functions are working correctly"