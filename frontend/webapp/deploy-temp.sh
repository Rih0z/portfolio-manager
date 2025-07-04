#!/bin/bash

# Deploy script for Cloudflare Pages
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp

echo "=== Starting deployment to Cloudflare Pages ==="
echo "Current directory: $(pwd)"

# Build with environment variables
echo "Building production bundle..."
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Deploying to Cloudflare Pages..."
    
    # Deploy to Cloudflare Pages
    wrangler pages deploy build --project-name=pfwise-portfolio-manager
    
    if [ $? -eq 0 ]; then
        echo "Deployment completed successfully!"
        echo "The app should be available at: https://portfolio-wise.com/"
    else
        echo "Deployment failed!"
        exit 1
    fi
else
    echo "Build failed!"
    exit 1
fi