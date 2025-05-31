#!/bin/bash

# Google OAuth用のSecrets Managerシークレットを作成するスクリプト

# 色付きの出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Google OAuth Secrets Manager設定スクリプト${NC}"
echo "========================================"

# 環境変数の確認
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${RED}エラー: GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETが環境変数に設定されていません。${NC}"
    echo "先に .env ファイルを source してください:"
    echo "  export \$(cat .env | grep -v '^#' | xargs)"
    exit 1
fi

# リージョンの設定
REGION=${AWS_REGION:-us-west-2}
SECRET_NAME="pfwise-api/google-oauth"

echo -e "\n${YELLOW}設定内容:${NC}"
echo "リージョン: $REGION"
echo "シークレット名: $SECRET_NAME"
echo "Client ID: ${GOOGLE_CLIENT_ID:0:20}..."

# シークレットの JSON を作成
SECRET_JSON=$(cat <<EOF
{
  "clientId": "$GOOGLE_CLIENT_ID",
  "clientSecret": "$GOOGLE_CLIENT_SECRET"
}
EOF
)

# 既存のシークレットをチェック
echo -e "\n${YELLOW}既存のシークレットを確認中...${NC}"
if aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION 2>/dev/null; then
    echo -e "${YELLOW}既存のシークレットが見つかりました。更新します...${NC}"
    
    # シークレットを更新
    aws secretsmanager update-secret \
        --secret-id $SECRET_NAME \
        --secret-string "$SECRET_JSON" \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ シークレットが正常に更新されました！${NC}"
    else
        echo -e "${RED}✗ シークレット更新に失敗しました${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}新しいシークレットを作成します...${NC}"
    
    # 新しいシークレットを作成
    aws secretsmanager create-secret \
        --name $SECRET_NAME \
        --description "Google OAuth credentials for Portfolio Manager API" \
        --secret-string "$SECRET_JSON" \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ シークレットが正常に作成されました！${NC}"
    else
        echo -e "${RED}✗ シークレット作成に失敗しました${NC}"
        exit 1
    fi
fi

# 検証
echo -e "\n${YELLOW}シークレットの内容を検証中...${NC}"
RETRIEVED_SECRET=$(aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $REGION --query SecretString --output text)
RETRIEVED_CLIENT_ID=$(echo $RETRIEVED_SECRET | jq -r '.clientId')

if [ "${RETRIEVED_CLIENT_ID:0:20}" == "${GOOGLE_CLIENT_ID:0:20}" ]; then
    echo -e "${GREEN}✓ シークレットが正しく保存されていることを確認しました${NC}"
else
    echo -e "${RED}✗ シークレットの検証に失敗しました${NC}"
    exit 1
fi

echo -e "\n${GREEN}完了！${NC}"
echo -e "\n次のステップ:"
echo "1. serverless.yml から GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET の環境変数設定を削除"
echo "2. Lambda関数は自動的に Secrets Manager から認証情報を取得します"
echo "3. npm run deploy でデプロイ"