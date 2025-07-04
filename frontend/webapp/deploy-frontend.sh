#!/bin/bash
# Frontend deployment script to Cloudflare Pages
# CLAUDE.mdに記載された手順に従ってデプロイを実行

echo "🚀 フロントエンドをCloudflare Pagesにデプロイします..."

# 現在のディレクトリを保存
ORIGINAL_DIR=$(pwd)

# フロントエンドディレクトリに移動
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp

echo "📍 現在のディレクトリ: $(pwd)"

# ビルドディレクトリの存在確認
if [ ! -d "build" ]; then
    echo "❌ buildディレクトリが存在しません。ビルドを実行します..."
    
    # 環境変数を設定してビルド
    echo "🔨 本番環境用にビルドを実行中..."
    REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
    REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
    NODE_OPTIONS='--openssl-legacy-provider' \
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ ビルドに失敗しました"
        cd "$ORIGINAL_DIR"
        exit 1
    fi
    echo "✅ ビルドが完了しました"
else
    echo "✅ buildディレクトリが存在します"
fi

# Cloudflare Pagesにデプロイ
echo "☁️ Cloudflare Pagesにデプロイ中..."
wrangler pages deploy build --project-name=pfwise-portfolio-manager

if [ $? -eq 0 ]; then
    echo "✅ デプロイが成功しました！"
    echo "🌐 本番環境URL: https://portfolio-wise.com/"
    echo "📝 注意: Google認証は本番環境URL（https://portfolio-wise.com/）でのみ動作します"
else
    echo "❌ デプロイに失敗しました"
    cd "$ORIGINAL_DIR"
    exit 1
fi

# 元のディレクトリに戻る
cd "$ORIGINAL_DIR"

echo "🎉 デプロイプロセスが完了しました"