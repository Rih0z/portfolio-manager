#!/bin/bash

echo "📝 Cloudflare Pages を直接デプロイモードに設定"

echo "
Cloudflare Dashboard での設定手順：

1. https://dash.cloudflare.com → Pages → portfolio-manager
2. Settings → Builds & deployments
3. 以下のように設定：
   - Build command: （空にする/削除する）
   - Build output directory: frontend/webapp/build
   - Root directory: （空にする）
4. Save

これにより、Cloudflare はビルドを行わず、
GitHubリポジトリの frontend/webapp/build ディレクトリを
そのままデプロイするようになります。

その後、GitHub Actions を設定して
ビルド済みファイルをコミットするようにします。
"