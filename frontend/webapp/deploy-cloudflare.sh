#!/bin/bash

# Cloudflare Pages Deployment Script
cd "$(dirname "$0")"

echo "=== Cloudflare Pages Deployment ==="
echo "Current directory: $(pwd)"

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "Error: build directory not found!"
    echo "Please run 'npm run build' first."
    exit 1
fi

# Export environment variable if it exists in parent .env
if [ -f "../../.env" ]; then
    export $(grep -v '^#' ../../.env | xargs)
fi

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
wrangler pages deploy build --project-name=pfwise-portfolio-manager --commit-dirty=true

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Deployment Successful! ==="
    echo "Production URL: https://portfolio-wise.com/"
    echo ""
else
    echo "Deployment failed!"
    exit 1
fi