#!/bin/bash

echo "🚀 本番環境のデプロイを作成します..."

cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp

# ビルドディレクトリの確認
if [ ! -d "build" ]; then
    echo "🔨 ビルドを実行中..."
    npm install --legacy-peer-deps
    npm install ajv@8 --legacy-peer-deps
    NODE_OPTIONS='--openssl-legacy-provider' npm run build
fi

# Productionデプロイを明示的に作成
echo "☁️  Production環境にデプロイ..."
npx wrangler pages deploy build \
    --project-name=portfolio-manager \
    --branch=main \
    --commit-dirty=true \
    --env=production

echo "✅ デプロイコマンドを実行しました"
echo ""
echo "📝 次のステップ："
echo "1. Cloudflare Dashboard を開く"
echo "2. Deployments タブで新しいデプロイを確認"
echo "3. 'Promote to Production' ボタンをクリック"
echo "4. Custom domains で portfolio-wise.com が設定されているか確認"