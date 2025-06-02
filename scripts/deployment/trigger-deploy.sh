#!/bin/bash

echo "🔄 デプロイを再トリガーします..."

# 空のコミットを作成してプッシュ
git commit --allow-empty -m "chore: trigger deployment after build command fix"
git push origin main

echo "✅ プッシュ完了。GitHub Actions と Cloudflare Pages が自動的にビルド・デプロイを開始します。"
echo "📊 進捗確認："
echo "  - GitHub: https://github.com/Rih0z/portfolio-manager/actions"
echo "  - Cloudflare: https://dash.cloudflare.com/pages/project/portfolio-manager"