#!/bin/bash

# デプロイ用環境変数をセット
export CLOUDFLARE_API_TOKEN='tOi0i4uzZyWAXlRLN9qtAuZ720G2gFeU5TXWRaiZ'

echo "🚀 Cloudflare Pagesへデプロイ開始..."
echo "プロジェクト: pfwise-portfolio-manager"
echo ""

# Wranglerのバージョン確認
wrangler --version

# デプロイ実行
echo "デプロイ実行中..."
wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-dirty=true \
  --compatibility-date=2025-01-01

echo ""
echo "デプロイコマンド送信完了"
echo "Cloudflare Dashboardで状態を確認してください:"
echo "https://dash.cloudflare.com/"