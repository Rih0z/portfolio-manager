#!/bin/bash

echo "🚨 本番環境を強制的に更新します..."

cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp

# 1. 現在のビルドを確認
if [ ! -d "build" ]; then
    echo "❌ ビルドディレクトリがありません。先にビルドを実行してください。"
    exit 1
fi

# 2. Cloudflare Pages のプロジェクト情報を取得
echo -e "\n📊 プロジェクト情報を確認..."
npx wrangler pages project list | grep portfolio-manager

# 3. 現在のデプロイ状況を確認
echo -e "\n📋 最新のデプロイ履歴:"
npx wrangler pages deployment list --project-name=portfolio-manager | head -10

# 4. プロダクションエイリアスを直接更新
echo -e "\n🔄 本番環境のエイリアスを更新..."
# 最新のデプロイメントIDを取得して、それを本番に昇格させる
LATEST_DEPLOYMENT=$(npx wrangler pages deployment list --project-name=portfolio-manager | grep -v "Production" | head -1 | awk '{print $1}')

if [ ! -z "$LATEST_DEPLOYMENT" ]; then
    echo "📌 最新のデプロイメントID: $LATEST_DEPLOYMENT"
    echo "🚀 本番環境に昇格させています..."
    # ここでCloudflare APIを使用して昇格させる必要があります
fi

# 5. 別の方法: 新しいデプロイを強制
echo -e "\n☁️  新しいデプロイを実行..."
npx wrangler pages deploy build \
  --project-name=portfolio-manager \
  --branch=main \
  --commit-dirty=true \
  --compatibility-date=$(date +%Y-%m-%d)

echo -e "\n✅ デプロイコマンドを実行しました"
echo "📝 次のステップ:"
echo "1. Cloudflare Dashboard でデプロイを確認"
echo "2. 必要に応じて手動で 'Promote to Production' を実行"
echo "3. DNS/CDNキャッシュをパージ"