#!/bin/bash
set -e

echo "🚀 緊急デプロイスクリプト開始..."

# ディレクトリ移動
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager

# 前回のビルドをクリーンアップ
echo "🧹 クリーンアップ中..."
rm -rf frontend/webapp-build

# ビルドディレクトリ作成
echo "📦 ビルドディレクトリ作成中..."
cp -r frontend/webapp frontend/webapp-build

# 依存関係インストール
echo "📦 依存関係インストール中..."
cd frontend/webapp-build
npm install --legacy-peer-deps --no-audit --no-fund
npm install ajv@8 --legacy-peer-deps --no-audit --no-fund

# ビルド実行
echo "🔨 ビルド中..."
export REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'
export REACT_APP_DEFAULT_EXCHANGE_RATE='150.0'
export NODE_OPTIONS='--openssl-legacy-provider'
npm run build

# Cloudflare Pagesにデプロイ
echo "☁️  本番環境にデプロイ中..."
npx wrangler pages deploy build --project-name=portfolio-manager --branch=main --commit-dirty=true

# クリーンアップ
cd ../..
rm -rf frontend/webapp-build

echo "✅ デプロイ完了！"
echo "🌐 URL: https://portfolio-wise.com"