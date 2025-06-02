#!/bin/bash

echo "🔍 本番環境の問題を診断します..."

# 1. 現在のコミットハッシュを確認
echo -e "\n📌 現在のGitコミット:"
git log -1 --oneline

# 2. ローカルでビルドしてデプロイ
echo -e "\n🔨 ローカルビルドを開始..."
cd frontend/webapp

# クリーンビルド
rm -rf build
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
NODE_OPTIONS='--openssl-legacy-provider' npm run build

# 3. ビルドが成功したか確認
if [ -d "build" ]; then
    echo "✅ ビルド成功"
    echo "📁 ビルドファイル数: $(find build -type f | wc -l)"
else
    echo "❌ ビルド失敗"
    exit 1
fi

# 4. 本番環境に直接デプロイ（複数の方法を試す）
echo -e "\n☁️  本番環境へのデプロイを試みます..."

# 方法1: mainブランチ指定
echo "📍 方法1: --branch=main"
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=main \
  --commit-dirty=true

sleep 3

# 方法2: productionブランチ指定
echo -e "\n📍 方法2: --branch=production"
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=production \
  --commit-dirty=true

echo -e "\n📊 デプロイ結果を確認してください："
echo "1. https://dash.cloudflare.com/pages/project/portfolio-manager/deployments"
echo "2. 最新のデプロイが 'Production' としてマークされているか確認"
echo "3. Custom domains で portfolio-wise.com が正しく設定されているか確認"