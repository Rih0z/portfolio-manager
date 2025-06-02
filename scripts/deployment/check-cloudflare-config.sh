#!/bin/bash

echo "🔍 Cloudflare Pages の設定を確認中..."

# プロジェクトディレクトリに移動
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager

# Wrangler のバージョン確認
echo "📦 Wrangler バージョン:"
npx wrangler --version

# プロジェクト一覧
echo -e "\n📋 Pages プロジェクト一覧:"
npx wrangler pages project list

# デプロイ履歴（最新5件）
echo -e "\n📜 最新のデプロイ履歴:"
npx wrangler pages deployment list --project-name=portfolio-manager | head -20

# 現在の本番URLの状態を確認
echo -e "\n🌐 本番URLの状態確認:"
curl -I https://portfolio-wise.com | head -10

echo -e "\n📝 Cloudflare Dashboard で以下を確認してください:"
echo "1. Settings → Builds & deployments → Production branch が 'main' に設定されているか"
echo "2. Custom domains に portfolio-wise.com が正しく設定されているか"
echo "3. 最新のデプロイが Production としてマークされているか"