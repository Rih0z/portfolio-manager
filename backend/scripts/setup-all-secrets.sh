#!/bin/bash

# すべての機密情報をAWS Secrets Managerに移行するスクリプト

# 色付きの出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}AWS Secrets Manager 完全移行スクリプト${NC}"
echo "========================================="

# 環境変数の読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}エラー: .env ファイルが見つかりません${NC}"
    exit 1
fi

# リージョンの設定
REGION=${AWS_REGION:-us-west-2}

# 関数: シークレットの作成または更新
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3
    
    echo -e "\n${YELLOW}シークレット: $SECRET_NAME${NC}"
    
    if aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION 2>/dev/null; then
        echo "既存のシークレットを更新中..."
        aws secretsmanager update-secret \
            --secret-id $SECRET_NAME \
            --secret-string "$SECRET_VALUE" \
            --region $REGION >/dev/null
    else
        echo "新しいシークレットを作成中..."
        aws secretsmanager create-secret \
            --name $SECRET_NAME \
            --description "$DESCRIPTION" \
            --secret-string "$SECRET_VALUE" \
            --region $REGION >/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 完了${NC}"
    else
        echo -e "${RED}✗ 失敗${NC}"
        return 1
    fi
}

# 1. Google OAuth認証情報
echo -e "\n${BLUE}1. Google OAuth認証情報${NC}"
GOOGLE_OAUTH_JSON=$(cat <<EOF
{
  "clientId": "$GOOGLE_CLIENT_ID",
  "clientSecret": "$GOOGLE_CLIENT_SECRET",
  "redirectUri": "$GOOGLE_REDIRECT_URI"
}
EOF
)
create_or_update_secret "pfwise-api/google-oauth" "$GOOGLE_OAUTH_JSON" "Google OAuth credentials"

# 2. API認証キー
echo -e "\n${BLUE}2. API認証キー${NC}"
API_KEYS_JSON=$(cat <<EOF
{
  "ADMIN_API_KEY": "$ADMIN_API_KEY",
  "ADMIN_EMAIL": "$ADMIN_EMAIL",
  "CRON_SECRET": "$CRON_SECRET"
}
EOF
)
create_or_update_secret "pfwise-api/credentials" "$API_KEYS_JSON" "API authentication keys"

# 3. 外部APIキー
echo -e "\n${BLUE}3. 外部APIキー${NC}"
EXTERNAL_API_JSON=$(cat <<EOF
{
  "ALPHA_VANTAGE_API_KEY": "$ALPHA_VANTAGE_API_KEY",
  "ALPACA_API_KEY": "$ALPACA_API_KEY",
  "ALPACA_API_SECRET": "$ALPACA_API_SECRET",
  "OPEN_EXCHANGE_RATES_APP_ID": "$OPEN_EXCHANGE_RATES_APP_ID",
  "FIXER_API_KEY": "$FIXER_API_KEY"
}
EOF
)
create_or_update_secret "pfwise-api/external-apis" "$EXTERNAL_API_JSON" "External API credentials"

# 4. GitHub Token
echo -e "\n${BLUE}4. GitHub Token${NC}"
if [ ! -z "$GITHUB_TOKEN" ]; then
    GITHUB_TOKEN_JSON=$(cat <<EOF
{
  "token": "$GITHUB_TOKEN"
}
EOF
)
    create_or_update_secret "pfwise-api/github-token" "$GITHUB_TOKEN_JSON" "GitHub access token"
else
    echo -e "${YELLOW}スキップ: GITHUB_TOKENが設定されていません${NC}"
fi

# 5. 検証
echo -e "\n${BLUE}シークレットの検証${NC}"
echo "================================"

verify_secret() {
    local SECRET_NAME=$1
    local CHECK_KEY=$2
    
    echo -n "$SECRET_NAME: "
    if aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $REGION --query SecretString --output text 2>/dev/null | jq -r ".$CHECK_KEY" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
}

verify_secret "pfwise-api/google-oauth" "clientId"
verify_secret "pfwise-api/credentials" "ADMIN_API_KEY"
verify_secret "pfwise-api/external-apis" "ALPHA_VANTAGE_API_KEY"
[ ! -z "$GITHUB_TOKEN" ] && verify_secret "pfwise-api/github-token" "token"

# 6. 環境変数のバックアップと移行ガイド
echo -e "\n${BLUE}.env.example の作成${NC}"
cat > .env.example <<EOF
# Portfolio Manager API Configuration Example
# Copy this file to .env and fill in your values

# AWS Configuration (IAM Role推奨)
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=your-account-id

# API Limits (非機密)
DAILY_REQUEST_LIMIT=5000
MONTHLY_REQUEST_LIMIT=100000
DISABLE_ON_LIMIT=true

# Cache Times (非機密)
CACHE_TIME_US_STOCK=3600
CACHE_TIME_JP_STOCK=3600  
CACHE_TIME_MUTUAL_FUND=10800
CACHE_TIME_EXCHANGE_RATE=21600

# Scraping Configuration (非機密)
JP_STOCK_SCRAPING_TIMEOUT=30000
MUTUAL_FUND_SCRAPING_TIMEOUT=30000
DEFAULT_EXCHANGE_RATE=150

# CORS Configuration (非機密)
CORS_ALLOWED_ORIGINS=http://localhost:3001

# GitHub Repository (非機密)
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=your-repo-name

# Google OAuth (Secrets Managerで管理)
# GOOGLE_CLIENT_ID=managed-by-secrets-manager
# GOOGLE_CLIENT_SECRET=managed-by-secrets-manager

# API Keys (Secrets Managerで管理)
# すべての機密情報はAWS Secrets Managerで管理されます
EOF

echo -e "${GREEN}✓ .env.example を作成しました${NC}"

# 完了メッセージ
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Secrets Manager への移行が完了しました！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}次のステップ:${NC}"
echo "1. serverless.yml から機密情報の環境変数を削除"
echo "2. secretsManager.js が新しいシークレット名を使用するように更新"
echo "3. npm run deploy でデプロイ"
echo -e "\n${RED}重要: .env ファイルから機密情報を削除してください${NC}"