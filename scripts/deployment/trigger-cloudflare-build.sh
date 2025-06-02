#!/bin/bash

echo "🔄 Cloudflare Pages のビルドをトリガーします..."

# 現在のブランチを確認
current_branch=$(git branch --show-current)
echo "📍 現在のブランチ: $current_branch"

if [ "$current_branch" != "main" ]; then
    echo "⚠️  警告: main ブランチではありません"
    read -p "続行しますか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 空のコミットを作成
git commit --allow-empty -m "chore: trigger Cloudflare Pages build with ajv fix"

# プッシュ
git push origin $current_branch

echo "✅ プッシュ完了"
echo "📊 Cloudflare Dashboard でビルド状況を確認してください："
echo "   https://dash.cloudflare.com/pages/project/portfolio-manager"
echo ""
echo "⚠️  重要: Build command に ajv@8 のインストールが含まれていることを確認してください"