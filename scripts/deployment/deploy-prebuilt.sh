#!/bin/bash

echo "🚀 ビルド済みファイルを本番環境にデプロイする方法"

cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager

# 1. ローカルでビルド
echo "🔨 ローカルでビルド中..."
cd frontend/webapp
rm -rf build
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
NODE_OPTIONS='--openssl-legacy-provider' npm run build

# 2. ビルドファイルを一時的にコミット
echo "📦 ビルドファイルを準備中..."
cd ../..

# .gitignore を一時的に編集
cp .gitignore .gitignore.backup
sed -i '' '/frontend\/webapp\/build/d' .gitignore

# ビルドファイルをコミット
git add frontend/webapp/build
git commit -m "chore: Add pre-built files for production deployment"

# 3. プッシュ
echo "📤 GitHubにプッシュ..."
git push origin main

# 4. Cloudflare の設定を変更する必要があります
echo "⚠️  重要: Cloudflare Dashboard で以下を設定してください:"
echo "1. Build command を空にする（削除）"
echo "2. Build output directory を 'frontend/webapp/build' のままにする"
echo "3. Save して Retry deployment"

# 5. .gitignore を元に戻す
echo "🔄 .gitignore を復元..."
mv .gitignore.backup .gitignore
git add .gitignore
git commit -m "chore: Restore .gitignore"
git push origin main