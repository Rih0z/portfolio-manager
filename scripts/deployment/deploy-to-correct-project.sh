#!/bin/bash

echo "🎯 正しいプロジェクトにデプロイします: pfwise-portfolio-manager"

cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager

# ビルドディレクトリを作成
echo "🔨 ビルドを開始..."
cd frontend/webapp
rm -rf build
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# 正しいプロジェクトにデプロイ
echo "☁️  pfwise-portfolio-manager プロジェクトにデプロイ..."
npx wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-dirty=true

echo "✅ デプロイ完了！"
echo "🌐 本番URL: https://portfolio-wise.com"
echo "📊 確認: https://dash.cloudflare.com/pages/project/pfwise-portfolio-manager"