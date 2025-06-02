#!/bin/bash

# Netlifyデプロイスクリプト

echo "Portfolio Manager - Netlify Deployment Script"
echo "============================================"

# ビルドディレクトリの確認
BUILD_DIR="$(pwd)/frontend/webapp/build"
if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build directory not found at $BUILD_DIR"
    echo "Please run 'npm run build:webapp' first"
    exit 1
fi

echo ""
echo "Build directory found at: $BUILD_DIR"
echo ""

# 手動デプロイ手順
echo "Manual deployment steps:"
echo ""
echo "1. Open Netlify Dashboard: https://app.netlify.com/"
echo ""
echo "2. Create a new site by drag & drop:"
echo "   - Drag the folder: $BUILD_DIR"
echo "   - Drop it on the Netlify dashboard"
echo ""
echo "3. Configure environment variables in Site Settings > Environment Variables:"
echo "   - REACT_APP_API_BASE_URL = https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod"
echo "   - REACT_APP_DEFAULT_EXCHANGE_RATE = 150.0"
echo ""
echo "4. Set custom domain (optional):"
echo "   - Go to Domain Settings"
echo "   - Add your custom domain"
echo ""
echo "5. Deploy settings (already configured in netlify.toml):"
echo "   - Build command: CI= npm run build"
echo "   - Publish directory: build"
echo "   - Base directory: frontend/webapp"
echo ""
echo "Alternative: Use Netlify Drop"
echo "=============================="
echo "1. Visit: https://app.netlify.com/drop"
echo "2. Drag the build folder: $BUILD_DIR"
echo "3. Your site will be instantly deployed!"
echo ""
echo "After deployment, you can claim the site and add environment variables."