# デプロイメントチェックリスト

## 本番環境へのデプロイが正しく動作しない場合の確認事項

### 1. Cloudflare Dashboard での確認
- [ ] https://dash.cloudflare.com にログイン
- [ ] Pages → portfolio-manager プロジェクトを選択
- [ ] Settings → General で以下を確認：
  - Production branch: `main` に設定されているか
  - Build configuration が正しいか
  - Environment variables が設定されているか

### 2. GitHub Actions の確認
- [ ] GitHubリポジトリの Settings → Secrets and variables → Actions
- [ ] `CLOUDFLARE_API_TOKEN` が正しく設定されているか
- [ ] Actions タブで最近のワークフローの実行状況を確認
- [ ] 失敗している場合はエラーログを確認

### 3. ローカルでの確認
- [ ] `wrangler whoami` でCloudflareにログインしているか確認
- [ ] `wrangler pages project list` でプロジェクトが表示されるか確認

### 4. デプロイコマンドの確認
正しいデプロイコマンド：
```bash
npx wrangler pages deploy build --project-name=portfolio-manager --branch=main
```

重要なオプション：
- `--branch=main`: 本番環境に直接デプロイ
- `--project-name=portfolio-manager`: プロジェクト名の指定

### 5. よくある問題と解決策

#### 問題1: プレビューURLは更新されるが本番が更新されない
**原因**: `--branch=main` オプションが指定されていない
**解決**: デプロイコマンドに `--branch=main` を追加

#### 問題2: ビルドエラー
**原因**: ajv の依存関係の問題
**解決**: `npm install ajv@8 --legacy-peer-deps` を実行

#### 問題3: 認証エラー
**原因**: Cloudflare API トークンの問題
**解決**: 
1. `wrangler login` で再ログイン
2. GitHub Secrets の `CLOUDFLARE_API_TOKEN` を更新

### 6. 手動デプロイ手順
```bash
cd /Users/kokiriho/Documents/Projects/pfwise/portfolio-manager
./scripts/deploy-production.sh
```

または個別コマンド：
```bash
cd frontend/webapp
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
NODE_OPTIONS='--openssl-legacy-provider' npm run build
npx wrangler pages deploy build --project-name=portfolio-manager --branch=main
```