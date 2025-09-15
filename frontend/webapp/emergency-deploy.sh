#!/bin/bash

# emergency-deploy.sh
# 緊急デプロイスクリプト

echo "🚨 緊急デプロイスクリプト開始"
echo "================================"

# 1. 古いビルドをバックアップ
if [ -d "build" ]; then
    echo "📦 既存のビルドをバックアップ..."
    mv build build-backup-$(date +%Y%m%d-%H%M%S)
fi

# 2. emergency-deployディレクトリを作成
echo "📁 緊急デプロイディレクトリを作成..."
mkdir -p emergency-deploy
cd emergency-deploy

# 3. 必要なファイルをコピー
echo "📋 ファイルをコピー..."
cp -r ../src .
cp -r ../public .
cp ../package.json .
cp ../tailwind.config.js .
cp ../tsconfig.json . 2>/dev/null || true
cp ../jsconfig.json . 2>/dev/null || true

# 4. 依存関係をインストール
echo "📦 依存関係をインストール..."
npm install --legacy-peer-deps --no-audit --no-fund

# 5. ビルド実行
echo "🔨 ビルド実行..."
CI=false \
GENERATE_SOURCEMAP=false \
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# 6. ビルドを元のディレクトリにコピー
if [ -d "build" ]; then
    echo "✅ ビルド成功！"
    cp -r build ../
    cd ..
    echo "📦 ビルドディレクトリを更新しました"
    
    # 7. デプロイ
    echo "🚀 Cloudflare Pagesへデプロイ..."
    wrangler pages deploy build --project-name=pfwise-portfolio-manager --branch=main --commit-dirty=true
else
    echo "❌ ビルド失敗"
    cd ..
    exit 1
fi

echo "✅ 完了！"