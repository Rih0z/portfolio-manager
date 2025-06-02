#!/bin/bash

echo "🚀 強制的に本番環境にデプロイします..."

# プロジェクトルートに移動
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp

# 既存のビルドがあれば使用、なければビルド
if [ ! -d "build" ]; then
    echo "❌ ビルドディレクトリが見つかりません。ビルドを実行してください。"
    exit 1
fi

# Cloudflare Pages に直接デプロイ
echo "☁️  Cloudflare Pages の本番環境に強制デプロイ中..."
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=main \
  --commit-dirty=true \
  --commit-hash=$(git rev-parse HEAD) \
  --commit-message="Force production deployment"

echo "✅ デプロイコマンドを実行しました"
echo "📝 Cloudflare Dashboard で確認してください："
echo "   https://dash.cloudflare.com/pages/project/portfolio-manager"