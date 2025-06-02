#!/bin/bash

echo "🔧 本番環境のデプロイ問題を修正します..."

cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager

# 1. 最新のコードを確認
echo "📝 最新のコミットを確認:"
git log -1 --oneline

# 2. クリーンビルド
echo -e "\n🧹 クリーンビルドを開始..."
cd frontend/webapp
rm -rf build
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps

# 3. 本番用ビルド
echo -e "\n🔨 本番用ビルドを実行..."
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# 4. デプロイ（複数の方法を試す）
echo -e "\n☁️  本番環境にデプロイ (方法1: branch指定)..."
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=main \
  --commit-dirty=true

# 5秒待機
sleep 5

# 5. 別の方法でデプロイ
echo -e "\n☁️  本番環境にデプロイ (方法2: production指定)..."
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=production \
  --commit-dirty=true

echo -e "\n✅ デプロイを試行しました"
echo "📌 次のステップ:"
echo "1. https://dash.cloudflare.com でデプロイ状況を確認"
echo "2. 必要に応じて手動で 'Promote to Production' を実行"
echo "3. Settings → Builds & deployments で Production branch を確認"