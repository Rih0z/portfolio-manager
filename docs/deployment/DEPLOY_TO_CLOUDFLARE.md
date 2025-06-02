# Cloudflare Pages デプロイ手順

## 概要
Cloudflare Pagesは無料で無制限の帯域幅を提供し、高速なCDNを備えています。

## デプロイ手順

### 1. Cloudflareアカウントの作成
1. https://dash.cloudflare.com/sign-up にアクセス
2. 無料アカウントを作成

### 2. Cloudflare Pagesでプロジェクト作成

1. Cloudflareダッシュボードにログイン
2. 左側メニューから「Pages」を選択
3. 「Create a project」をクリック
4. 「Connect to Git」を選択

### 3. GitHubリポジトリの接続

1. GitHubアカウントを認証
2. リポジトリ「pfwise/portfolio-manager」を選択
3. 「Begin setup」をクリック

### 4. ビルド設定

以下の設定を入力：

- **Project name**: portfolio-manager
- **Production branch**: main
- **Framework preset**: Create React App
- **Build command**: `cd frontend/webapp && CI= npm install && CI= npm run build`
- **Build output directory**: `frontend/webapp/build`
- **Root directory (advanced)**: `/` (デフォルトのまま)

### 5. 環境変数の設定

「Environment variables」セクションで以下を追加：

| Variable name | Value |
|--------------|-------|
| REACT_APP_API_BASE_URL | https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod |
| REACT_APP_DEFAULT_EXCHANGE_RATE | 150.0 |
| NODE_OPTIONS | --openssl-legacy-provider |

### 6. デプロイ

「Save and Deploy」をクリック

## デプロイ後の設定

### カスタムドメイン（オプション）
1. プロジェクトページから「Custom domains」タブ
2. 「Add custom domain」をクリック
3. ドメインを入力して設定

### 自動デプロイ
- GitHubのmainブランチへのプッシュで自動的にデプロイされます
- プレビューデプロイ：PRを作成すると自動的にプレビュー環境が作成されます

## アクセスURL

デプロイ完了後、以下のようなURLでアクセス可能：
- https://portfolio-manager.pages.dev
- カスタムドメインを設定した場合はそのドメイン

## トラブルシューティング

### ビルドエラーの場合
1. ビルドログを確認
2. 環境変数が正しく設定されているか確認
3. NODE_OPTIONSが設定されているか確認

### 404エラーの場合
SPAのルーティング対応のため、`_redirects`ファイルを追加：
```
/* /index.html 200
```

## 利点
- 無制限の帯域幅
- 高速なグローバルCDN
- 自動HTTPS
- DDoS保護
- Web Analytics（無料）
- 自動デプロイ