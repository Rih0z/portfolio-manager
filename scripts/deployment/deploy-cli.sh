#!/bin/bash

echo "Portfolio Manager - CLI Deployment Script"
echo "========================================"
echo ""
echo "Choose deployment platform:"
echo "1) Vercel (Recommended for CLI, but commercial use requires Pro plan)"
echo "2) Cloudflare Pages (Free commercial use, requires initial web setup)"
echo "3) Surge.sh (Simple CLI, but HTTPS costs extra)"
echo ""
read -p "Enter your choice (1-3): " choice

cd frontend/webapp

case $choice in
  1)
    echo "Deploying to Vercel..."
    echo ""
    echo "Note: First time deployment requires login:"
    echo "Run: vercel login"
    echo ""
    echo "Then deploy with:"
    echo "vercel --prod"
    echo ""
    echo "Environment variables are already set in vercel.json"
    ;;
    
  2)
    echo "Deploying to Cloudflare Pages..."
    echo ""
    echo "First time setup:"
    echo "1. Create project at https://dash.cloudflare.com/pages"
    echo "2. Get API token from https://dash.cloudflare.com/profile/api-tokens"
    echo "3. Run: wrangler login"
    echo ""
    echo "Then deploy with:"
    echo "wrangler pages deploy build --project-name portfolio-manager"
    echo ""
    echo "Set environment variables in Cloudflare dashboard after first deploy"
    ;;
    
  3)
    echo "Deploying to Surge.sh..."
    echo ""
    echo "Deploy command:"
    echo "cd build && surge"
    echo ""
    echo "Note: HTTPS only available with custom domain (paid)"
    echo "Environment variables need to be set during build"
    ;;
    
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "For automated CI/CD deployment, add the chosen command to your pipeline."