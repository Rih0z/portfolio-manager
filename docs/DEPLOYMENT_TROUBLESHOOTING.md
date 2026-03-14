# デプロイメント トラブルシューティングガイド

最終更新: 2026-03-05

## 📋 目次
1. [よくあるデプロイエラーと解決方法](#よくあるデプロイエラーと解決方法)
2. [Wrangler タイムアウト問題](#wrangler-タイムアウト問題)
3. [commit-dirty UTF-8エラー](#commit-dirty-utf-8エラー)
4. [正しいデプロイ手順](#正しいデプロイ手順)
5. [緊急時の対処法](#緊急時の対処法)

---

## よくあるデプロイエラーと解決方法

### 🔴 エラー1: Wrangler デプロイタイムアウト

#### 症状
```bash
Command timed out after 3m 0.0s
⛅️ wrangler 4.19.1 (update available 4.35.0)
─────────────────────────────────────────────
```

#### 原因
- 大量のバックアップディレクトリ（`node_modules_backup_*`）
- システムリソース枯渇（複数のNode.jsプロセス）
- ネットワーク接続の問題

#### 解決方法
```bash
# 1. 不要なバックアップを削除
rm -rf node_modules_backup_*
rm -rf node_modules_old

# 2. Node.jsプロセスをクリーンアップ
pkill -f node
pkill -f npm

# 3. キャッシュをクリア
rm -rf node_modules/.cache
rm -rf .wrangler/
```

---

### 🔴 エラー2: commit-dirty UTF-8エラー

#### 症状
```
ERROR: Invalid commit message, it must be a valid UTF-8 string. [code: 8000111]
```

#### 原因
`--commit-dirty=true`フラグが自動的に不正なUTF-8文字列を生成

#### 解決方法
```bash
# ❌ 間違った方法
wrangler pages deploy build --project-name=pfwise-portfolio-manager --commit-dirty=true

# ✅ 正しい方法
wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-hash=$(git rev-parse HEAD) \
  --commit-message="Deploy updates"
```

---

### 🔴 エラー3: ビルドハング

#### 症状
```
Creating an optimized production build...
(タイムアウト)
```

#### 原因
- メモリ不足
- 大量のソースマップ生成

#### 解決方法
```bash
# 環境変数を設定してビルド (Vite)
GENERATE_SOURCEMAP=false \
NODE_OPTIONS="--max-old-space-size=2048" \
npm run build
```

---

## Wrangler タイムアウト問題

### 診断手順

1. **プロセス確認**
```bash
# Node.jsプロセス数を確認
ps aux | grep -E "(node|npm)" | grep -v grep | wc -l

# メモリ使用量を確認
ps aux | grep node | awk '{sum+=$6} END {print "Memory(MB): " sum/1024}'
```

2. **ネットワーク確認**
```bash
# Wranglerの認証状態
wrangler whoami

# APIトークンの検証
curl -X GET "https://api.cloudflare.com/client/v4/user" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json"
```

### システムリソースの解放

```bash
#!/bin/bash
# cleanup-system.sh

echo "🧹 システムクリーンアップ開始..."

# 全Node.jsプロセスを終了
pkill -f node
pkill -f npm
pkill -f wrangler

# ポート解放
for port in 3000 3001 3002 3003; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

# キャッシュクリア
rm -rf node_modules/.cache
rm -rf .wrangler/
rm -rf ~/.npm/_cacache

echo "✅ クリーンアップ完了"
```

---

## commit-dirty UTF-8エラー

### 完全な解決方法

#### 方法1: 明示的なコミット情報を指定
```bash
export CLOUDFLARE_API_TOKEN='your-token-here'

wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-hash=$(git rev-parse HEAD) \
  --commit-message="Deploy fixes and features"
```

#### 方法2: クリーンな状態でデプロイ
```bash
# 変更をすべてコミット
git add -A
git commit -m "Deploy preparation"

# デプロイ（commit-dirtyフラグ不要）
wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main
```

#### 方法3: .envファイルを使用
```bash
# .envファイルから環境変数を読み込み
source .env

# デプロイ実行
wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-message="Production deployment"
```

---

## 正しいデプロイ手順

### 📝 推奨デプロイフロー

```bash
#!/bin/bash
# deploy-production.sh

# 1. 環境準備
echo "📦 環境準備..."
source .env

# 2. システムクリーンアップ
echo "🧹 クリーンアップ..."
rm -rf node_modules_backup_*
rm -rf node_modules/.cache

# 3. ビルド
echo "🔨 ビルド開始..."
GENERATE_SOURCEMAP=false \
NODE_OPTIONS="--max-old-space-size=2048" \
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
npm run build

# 4. デプロイ
echo "🚀 デプロイ開始..."
wrangler pages deploy build \
  --project-name=pfwise-portfolio-manager \
  --branch=main \
  --commit-hash=$(git rev-parse HEAD) \
  --commit-message="Production deployment $(date +%Y%m%d)"

echo "✅ デプロイ完了"
echo "URL: https://portfolio-wise.com/"
```

### ✅ チェックリスト

デプロイ前に確認:
- [ ] 不要なバックアップディレクトリを削除
- [ ] Node.jsプロセスが過剰に実行されていない
- [ ] .envファイルにCLOUDFLARE_API_TOKENが設定されている
- [ ] Gitの変更がコミットされている（またはcommit-messageを明示的に指定）
- [ ] ビルドディレクトリが1.5MB以下

---

## 緊急時の対処法

### 🚨 Wranglerが全く動作しない場合

#### オプション1: Cloudflare Dashboard経由
1. https://dash.cloudflare.com/ にログイン
2. Pages → プロジェクトを選択
3. "Upload assets" をクリック
4. buildフォルダをドラッグ&ドロップ

#### オプション2: GitHub Actions
`.github/workflows/deploy-cloudflare.yml`を有効化:
```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and Build
        run: |
          cd frontend/webapp
          npm install --legacy-peer-deps
          npm run build
        env:
          REACT_APP_API_BASE_URL: ${{ secrets.REACT_APP_API_BASE_URL }}
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy frontend/webapp/build --project-name=pfwise-portfolio-manager
```

#### オプション3: 別環境からデプロイ
```bash
# CloudShellやGitHub Codespacesから
git clone https://github.com/your-repo/portfolio-manager.git
cd portfolio-manager/frontend/webapp
npm install --legacy-peer-deps
npm run build
wrangler pages deploy build --project-name=pfwise-portfolio-manager
```

---

## 環境変数設定

### 必須環境変数 (.env)
```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=your-api-token-here

# Build設定 (Vite — openssl-legacy-provider 不要)
GENERATE_SOURCEMAP=false

# API設定
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

### トークン取得方法
1. https://dash.cloudflare.com/profile/api-tokens
2. "Create Token" をクリック
3. "Custom token" を選択
4. 権限設定:
   - Account: Cloudflare Pages:Edit
   - Zone: Page Rules:Edit
5. トークンを.envファイルに保存

---

## デバッグ情報収集

問題が解決しない場合、以下の情報を収集:

```bash
# デバッグ情報収集スクリプト
echo "=== System Info ===" > debug-info.txt
uname -a >> debug-info.txt
echo "\n=== Node/NPM Version ===" >> debug-info.txt
node -v >> debug-info.txt
npm -v >> debug-info.txt
echo "\n=== Wrangler Version ===" >> debug-info.txt
wrangler --version >> debug-info.txt
echo "\n=== Process Count ===" >> debug-info.txt
ps aux | grep -E "(node|npm)" | wc -l >> debug-info.txt
echo "\n=== Build Size ===" >> debug-info.txt
du -sh build/ >> debug-info.txt
echo "\n=== Git Status ===" >> debug-info.txt
git status --short >> debug-info.txt
echo "\n=== Wrangler Logs ===" >> debug-info.txt
tail -50 ~/.wrangler/logs/wrangler-*.log >> debug-info.txt
```

---

## サポート

### 📞 お問い合わせ先
- **Cloudflare Support**: https://support.cloudflare.com/
- **Wrangler Issues**: https://github.com/cloudflare/workers-sdk/issues
- **プロジェクトIssues**: https://github.com/your-repo/portfolio-manager/issues

### 🔗 関連ドキュメント
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler Commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [プロジェクトREADME](../README.md)
- [CLAUDE.md](../CLAUDE.md)

---

最終更新: 2026-03-05  
作成者: Claude Code  
バージョン: 1.0.0