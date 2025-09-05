# 🚀 PfWise Portfolio Manager - デプロイメント完全ガイド

## 📋 目次
1. [概要](#概要)
2. [フロントエンドデプロイ](#フロントエンドデプロイ)
3. [バックエンドデプロイ](#バックエンドデプロイ)
4. [緊急デプロイ方法](#緊急デプロイ方法)
5. [トラブルシューティング](#トラブルシューティング)
6. [本番環境確認](#本番環境確認)

---

## 概要

PfWise Portfolio Managerは独立したマイクロサービス構造で構築されており、フロントエンドとバックエンドを個別にデプロイします。

### アーキテクチャ概要
- **フロントエンド**: React + Cloudflare Pages
- **バックエンド**: AWS Lambda + API Gateway + Serverless Framework
- **本番URL**: https://portfolio-wise.com/
- **API URL**: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod

---

## フロントエンドデプロイ

### 🔧 方法1: Wrangler CLI（推奨）

#### 前提条件
```bash
# Wranglerのインストールと認証
npm install -g wrangler
wrangler login
```

#### 標準デプロイ手順
```bash
cd frontend/webapp

# ビルド実行
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# 本番環境デプロイ
wrangler pages deploy build --project-name=pfwise-portfolio-manager --branch=main --commit-dirty=true
```

#### Package.jsonスクリプト利用
```bash
cd frontend/webapp

# 全自動デプロイ
npm run deploy:prod

# ビルドスキップデプロイ
npm run deploy:direct
```

### 🔧 方法2: GitHub Integration（自動デプロイ）

#### セットアップ
1. CloudflareダッシュボードでGitHub連携を設定
2. リポジトリ: `Rih0z/portfolio-manager`を接続
3. ブランチ: `main`を本番ブランチに設定

#### デプロイ実行
```bash
# コード変更をプッシュするだけで自動デプロイ
git add .
git commit -m "デプロイ: 機能追加"
git push origin main
```

### 🚨 方法3: 緊急ダッシュボードデプロイ

CLOUDFLARE_API_TOKENが利用できない場合：

1. **https://dash.cloudflare.com/** にアクセス
2. **Workers & Pages** → **pfwise-portfolio-manager** を選択
3. **「Create deployment」** → **Direct Upload** を選択  
4. **buildディレクトリまたは緊急用ファイル**をドラッグ&ドロップ
5. **「Deploy site」**をクリック

---

## バックエンドデプロイ

### 🔧 AWS Lambda + Serverless Framework

#### 前提条件
```bash
# AWS CLI設定
aws configure

# Serverless Framework
npm install -g serverless
```

#### デプロイ手順
```bash
cd backend

# 依存関係インストール
npm install

# 本番環境デプロイ
npm run deploy:prod

# または直接実行
serverless deploy --stage prod
```

#### デプロイ結果確認
```bash
# デプロイ成功例
✔ Service deployed to stack pfwise-api-prod (74s)

endpoints:
  GET - https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/config
  POST - https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/market-data
```

---

## 緊急デプロイ方法

### 🚨 i18n修正など重要な修正の即座適用

#### 緊急修正ファイル準備
```bash
# emergency-deployディレクトリ使用
cd emergency-deploy/

# ファイル構成確認
ls -la
# index.html    # i18n修正済み完全版
# _redirects    # SPAルーティング設定
```

#### 緊急デプロイ実行方法

**方法A: Cloudflareダッシュボード**
1. https://dash.cloudflare.com/ にアクセス
2. Workers & Pages → pfwise-portfolio-manager
3. Create deployment → Direct Upload
4. emergency-deploy/内のファイルをアップロード
5. Deploy site をクリック

**方法B: Wrangler CLI**
```bash
cd emergency-deploy/
wrangler pages deploy . --project-name=pfwise-portfolio-manager --branch=main --commit-dirty=true
```

### 🔄 ロールバック方法

```bash
# 前のデプロイメントに戻す
wrangler pages deployment list
wrangler pages deployment promote <DEPLOYMENT_ID>
```

---

## トラブルシューティング

### ❌ よくある問題と解決策

#### 1. CLOUDFLARE_API_TOKEN エラー
```
ERROR: In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN
```

**解決策:**
- 環境変数を設定: `export CLOUDFLARE_API_TOKEN=your_token`
- または緊急ダッシュボードデプロイを使用

#### 2. ビルドタイムアウト
```
Command timed out after 2m 0.0s
```

**解決策:**
```bash
# 段階的ビルド
CI=true GENERATE_SOURCEMAP=false npm run build

# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 3. i18n翻訳キー表示問題
```
アプリで "app.name" "common.update" などが生で表示される
```

**解決策:**
- emergency-deployディレクトリの修正版を使用
- 根本原因: NO_I18NEXT_INSTANCEエラー
- 修正内容: react.useSuspense: false + initImmediate: false

#### 4. Git競合・ロックファイル
```
fatal: Unable to create '.git/index.lock': File exists
```

**解決策:**
```bash
rm -f .git/index.lock .git/refs/heads/main.lock
pkill -f git
```

#### 5. Node.js v22互換性問題
```
Error: error:0308010C:digital envelope routines::unsupported
```

**解決策:**
```bash
export NODE_OPTIONS='--openssl-legacy-provider'
npm run build
```

### 📊 デプロイ状況診断

#### 現在の問題確認
```bash
# PlaywrightMCPで本番環境テスト
# ブラウザコンソールエラー確認
# 翻訳キー表示状況確認
```

#### デプロイ履歴確認
```bash
wrangler pages deployment list --project-name=pfwise-portfolio-manager
```

---

## 本番環境確認

### ✅ デプロイ成功の確認項目

#### フロントエンド確認
- [ ] https://portfolio-wise.com/ にアクセス可能
- [ ] 「ポートフォリオワイズ」が正しく表示（app.name翻訳）
- [ ] 「投資を始めましょう」が表示（dashboard.noPortfolio翻訳）
- [ ] 言語切り替えが正常動作（🇯🇵/🇺🇸）
- [ ] ナビゲーション項目が翻訳表示
- [ ] コンソールエラーなし

#### バックエンド確認  
- [ ] API疎通確認: `curl https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/config`
- [ ] レスポンス時間 < 3秒
- [ ] CORS設定正常
- [ ] 認証フロー動作

#### 統合テスト
```bash
# E2Eテスト実行
cd e2e/
npx playwright test production-test.spec.js --headed
```

### 📈 パフォーマンス監視

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

#### リソース最適化
- バンドルサイズ: < 1MB (gzip)
- 画像最適化: WebP形式
- CDNキャッシュ: 24時間

---

## 🔐 セキュリティ考慮事項

### デプロイ時チェックリスト
- [ ] API_KEYなどの秘密情報が含まれていない
- [ ] .envファイルがコミットされていない
- [ ] console.logでセンシティブな情報を出力していない
- [ ] HTTPSが強制されている
- [ ] CSRFトークンが実装されている

### アクセス制限
- 本番環境: https://portfolio-wise.com/ のみGoogle認証対応
- プレビューURL: 認証機能無効（テスト用のみ）

---

## 📚 関連ドキュメント

- [CLAUDE.md - AIコーディング原則](../CLAUDE.md)
- [README.md - プロジェクト概要](../README.md)
- [トラブルシューティング詳細ガイド](./troubleshooting-guide.md)
- [i18n修正詳細ガイド](./i18n-troubleshooting-guide.md)

---

**最終更新**: 2025年7月30日  
**担当**: Claude AI (AIコーディング原則第1条〜第8条準拠)