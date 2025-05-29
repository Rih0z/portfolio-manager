# Cloudflare Pages セットアップ手順

## ステップ1: Webダッシュボードでプロジェクト作成

1. **Cloudflareダッシュボードにログイン**
   - https://dash.cloudflare.com/

2. **Pagesセクションへ移動**
   - 左側メニューから「Pages」をクリック

3. **プロジェクト作成**
   - 「Create a project」ボタンをクリック
   - 「Connect to Git」を選択

4. **GitHubと連携**
   - 「Connect GitHub account」をクリック
   - GitHubアカウントを認証
   - リポジトリ「portfolio-manager」を選択
   - 「Begin setup」をクリック

## ステップ2: ビルド設定

以下の設定を入力してください：

| 設定項目 | 値 |
|---------|-----|
| Project name | portfolio-manager |
| Production branch | main |
| Framework preset | Create React App |
| Build command | `cd frontend/webapp && npm install && NODE_OPTIONS="--openssl-legacy-provider" CI= npm run build` |
| Build output directory | `frontend/webapp/build` |

## ステップ3: 環境変数の設定

「Environment variables」セクションで「Add variable」をクリックして以下を追加：

| Variable name | Value |
|--------------|-------|
| REACT_APP_API_BASE_URL | `https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod` |
| REACT_APP_DEFAULT_EXCHANGE_RATE | `150.0` |
| NODE_OPTIONS | `--openssl-legacy-provider` |

## ステップ4: デプロイ

「Save and Deploy」をクリックして初回デプロイを実行

---

## 初回デプロイ後のCLI設定

### 1. APIトークンの作成

1. https://dash.cloudflare.com/profile/api-tokens にアクセス
2. 「Create Token」をクリック
3. 「Custom token」を選択
4. 以下の権限を設定：
   - Account: Cloudflare Pages:Edit
   - Zone: Page Rules:Edit (オプション)
5. 「Continue to summary」→「Create Token」
6. トークンをコピーして安全に保管

### 2. Wrangler CLIでログイン

```bash
# 環境変数でトークンを設定
export CLOUDFLARE_API_TOKEN="your-api-token-here"

# または、インタラクティブにログイン
wrangler login
```

### 3. CLIからデプロイ

```bash
cd frontend/webapp
wrangler pages deploy build --project-name portfolio-manager
```

---

## 自動デプロイの設定（GitHub Actions）

`.github/workflows/deploy.yml`を作成：

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
          
      - name: Install dependencies
        run: cd frontend/webapp && npm ci
        
      - name: Build
        run: cd frontend/webapp && NODE_OPTIONS="--openssl-legacy-provider" CI= npm run build
        env:
          REACT_APP_API_BASE_URL: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
          REACT_APP_DEFAULT_EXCHANGE_RATE: '150.0'
          
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy frontend/webapp/build --project-name=portfolio-manager
```

GitHubリポジトリのSecretsに以下を追加：
- `CLOUDFLARE_API_TOKEN`: 上記で作成したトークン
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflareダッシュボードで確認

---

## デプロイ完了後

1. **アクセスURL**
   - https://portfolio-manager.pages.dev
   - カスタムドメインも設定可能

2. **動作確認**
   - ホームページの表示
   - API接続の確認
   - Google認証のテスト

3. **モニタリング**
   - Cloudflare Analyticsで訪問者数を確認
   - Web Vitalsでパフォーマンスを監視