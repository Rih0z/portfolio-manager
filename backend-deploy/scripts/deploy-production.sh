#!/bin/bash
# 本番環境デプロイスクリプト

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== 本番環境デプロイ開始 =====${NC}"

# 本番環境の確認
echo -e "${YELLOW}警告: 本番環境にデプロイしようとしています！${NC}"
read -p "本番環境にデプロイしてもよろしいですか？ (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo -e "${RED}デプロイをキャンセルしました。${NC}"
  exit 1
fi

# セキュリティチェック
echo -e "${YELLOW}セキュリティチェックを実行中...${NC}"

# 1. 環境変数の確認
if [ -z "$ADMIN_IP_WHITELIST" ]; then
  echo -e "${RED}エラー: ADMIN_IP_WHITELIST が設定されていません${NC}"
  echo "本番環境では管理者IPホワイトリストの設定が必須です"
  exit 1
fi

# 2. AWS Secrets Manager の確認
echo "AWS Secrets Manager の設定を確認中..."
aws secretsmanager describe-secret --secret-id pfwise-api/credentials > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}エラー: AWS Secrets Manager にアクセスできません${NC}"
  exit 1
fi

# 3. ドメイン設定の確認
if [ -z "$DOMAIN_NAME" ]; then
  export DOMAIN_NAME="portfolio-wise.com"
  echo -e "${YELLOW}DOMAIN_NAME が未設定のため、デフォルト値を使用: $DOMAIN_NAME${NC}"
fi

# Node.js バージョンの確認
echo -e "${YELLOW}Node.js バージョンを確認中...${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
  echo -e "${RED}エラー: Node.js v18以上が必要です${NC}"
  exit 1
fi

# テストの実行
echo -e "${YELLOW}テストを実行中...${NC}"
npm test
if [ $? -ne 0 ]; then
  echo -e "${RED}エラー: テストが失敗しました${NC}"
  exit 1
fi

# セキュリティ監査
echo -e "${YELLOW}セキュリティ監査を実行中...${NC}"
npm audit
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}警告: セキュリティ脆弱性が検出されました${NC}"
  read -p "続行しますか？ (yes/no): " continue_deploy
  if [ "$continue_deploy" != "yes" ]; then
    exit 1
  fi
fi

# 本番環境用の環境変数を設定
export NODE_ENV=production
export LOG_LEVEL=warn
export ENABLE_AUDIT_LOGGING=true
export ENABLE_RATE_LIMITING=true

# デプロイ実行
echo -e "${GREEN}本番環境へのデプロイを開始します...${NC}"
npx serverless@3.32.2 deploy --stage prod --verbose

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ 本番環境へのデプロイが完了しました！${NC}"
  
  # デプロイ情報の表示
  echo -e "${YELLOW}デプロイ情報:${NC}"
  npx serverless@3.32.2 info --stage prod
  
  # ヘルスチェック
  echo -e "${YELLOW}ヘルスチェックを実行中...${NC}"
  API_URL=$(npx serverless@3.32.2 info --stage prod | grep "GET -" | head -1 | awk '{print $3}' | sed 's|/api/.*|/config/client|')
  if [ ! -z "$API_URL" ]; then
    curl -s "$API_URL" > /dev/null
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ APIが正常に動作しています${NC}"
    else
      echo -e "${RED}⚠️  APIのヘルスチェックに失敗しました${NC}"
    fi
  fi
else
  echo -e "${RED}❌ デプロイに失敗しました${NC}"
  exit 1
fi

echo -e "${GREEN}===== デプロイ完了 =====${NC}"
echo -e "${YELLOW}重要: 本番環境の監視を開始してください${NC}"