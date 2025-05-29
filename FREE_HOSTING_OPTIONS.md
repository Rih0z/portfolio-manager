# 無料ホスティングオプション

## 1. Vercel（推奨）
- **無料枠**: 100GB帯域幅/月、無制限のサイト数
- **特徴**: Next.js開発元、高速、自動HTTPS
- **制限**: 商用利用OK、チームは1人まで

### デプロイ方法:
```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
cd frontend/webapp
vercel --prod
```

## 2. GitHub Pages
- **無料枠**: 完全無料（GitHubアカウントがあれば）
- **特徴**: GitHubと完全統合、カスタムドメイン対応
- **制限**: 静的サイトのみ、1GB容量制限

### デプロイ方法:
```bash
# gh-pagesパッケージをインストール
npm install --save-dev gh-pages

# package.jsonに追加
"homepage": "https://[username].github.io/[repo-name]",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}

# デプロイ
npm run deploy
```

## 3. Cloudflare Pages
- **無料枠**: 無制限の帯域幅、500ビルド/月
- **特徴**: 高速CDN、自動HTTPS、Web Analytics
- **制限**: 20,000ファイル、25MBまでのファイル

### デプロイ方法:
```bash
# Wrangler CLIをインストール
npm install -g wrangler

# デプロイ
wrangler pages deploy build --project-name portfolio-manager
```

## 4. Surge.sh
- **無料枠**: 無制限のプロジェクト、カスタムドメイン
- **特徴**: 超シンプル、CLIのみで完結
- **制限**: HTTPSはカスタムドメインで有料

### デプロイ方法:
```bash
# Surgeをインストール
npm install -g surge

# デプロイ
cd build
surge
```

## 5. Render
- **無料枠**: 静的サイトは完全無料
- **特徴**: 自動デプロイ、HTTPS、カスタムドメイン
- **制限**: ビルド時間400分/月

### デプロイ方法:
1. render.comでアカウント作成
2. New → Static Site
3. GitHubリポジトリを接続
4. Build Command: `cd frontend/webapp && npm install && npm run build`
5. Publish Directory: `frontend/webapp/build`

## 6. Firebase Hosting
- **無料枠**: 10GB容量、360MB/日の転送量
- **特徴**: Google製、高速、他のFirebaseサービスと統合
- **制限**: 転送量制限あり

### デプロイ方法:
```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# 初期化
firebase init hosting

# デプロイ
firebase deploy
```

## 環境変数の設定

各サービスで環境変数を設定:
```
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

## 推奨順位

1. **Vercel** - 最も簡単で高機能
2. **Cloudflare Pages** - 無制限の帯域幅
3. **GitHub Pages** - 完全無料
4. **Render** - 自動デプロイが便利
5. **Surge.sh** - 最速でデプロイ可能
6. **Firebase Hosting** - Googleサービスとの統合が必要な場合