#!/bin/bash
# deploy.sh - 完璧なデプロイスクリプト

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 開始メッセージ
echo -e "${GREEN}===== ポートフォリオマネージャー API デプロイ開始 =====${NC}"

# nvmが存在するか確認し、存在しない場合はインストール
if ! command -v nvm &> /dev/null; then
  echo -e "${YELLOW}nvmが見つかりません。nvmをインストールします...${NC}"
  
  # nvmのインストール
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  
  # 環境変数の設定
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
  
  # nvmが正しくインストールされたか確認
  if ! command -v nvm &> /dev/null; then
    echo -e "${RED}nvmのインストールに失敗しました。手動でインストールしてください。${NC}"
    echo -e "${YELLOW}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash${NC}"
    exit 1
  else
    echo -e "${GREEN}nvmのインストールが完了しました。${NC}"
  fi
fi

# Node.jsのバージョンを18に切り替え
echo -e "${YELLOW}Node.jsのバージョンを18に切り替えています...${NC}"
# Node.js v18がインストールされているか確認
if nvm ls 18 | grep -q "v18"; then
  echo "Node.js v18が見つかりました。切り替えます..."
else
  echo -e "${YELLOW}Node.js v18がインストールされていません。インストールします...${NC}"
  nvm install 18
  if [ $? -ne 0 ]; then
    echo -e "${RED}Node.js v18のインストールに失敗しました。${NC}"
    exit 1
  fi
  echo -e "${GREEN}Node.js v18のインストールが完了しました。${NC}"
fi

# Node.js v18に切り替え
nvm use 18
if [ $? -ne 0 ]; then
  echo -e "${RED}Node.js v18への切り替えに失敗しました。${NC}"
  exit 1
fi
echo -e "${GREEN}Node.js v18に切り替えました。${NC}"

echo "Node.js バージョン: $(node -v)"
echo "npm バージョン: $(npm -v)"

# ステップ1: クリーンアップ
echo -e "${YELLOW}ステップ1: 古いビルドファイルのクリーンアップ中...${NC}"
rm -rf .serverless node_modules package-lock.json
echo "クリーンアップ完了"

# ステップ2: package.jsonの確認
echo -e "${YELLOW}ステップ2: package.jsonの確認中...${NC}"
if ! grep -q '"@aws-sdk/client-sts"' package.json || ! grep -q '"dependencies"' package.json; then
  echo -e "${RED}package.jsonに必要な依存関係が含まれていません。修正してください。${NC}"
  exit 1
fi
echo "package.json確認完了"

# ステップ3: 本番用依存関係のインストール
echo -e "${YELLOW}ステップ3: 本番用依存関係をインストール中...${NC}"
npm install --omit=dev
if [ $? -ne 0 ]; then
  echo -e "${RED}依存関係のインストールに失敗しました。${NC}"
  exit 1
fi
echo "本番用依存関係のインストール完了"

# ステップ4: デプロイツールのインストール
echo -e "${YELLOW}ステップ4: デプロイツールをインストール中...${NC}"
npm install --no-save serverless serverless-dotenv-plugin serverless-offline
if [ $? -ne 0 ]; then
  echo -e "${RED}デプロイツールのインストールに失敗しました。${NC}"
  exit 1
fi
echo "デプロイツールのインストール完了"

# ステップ5: .serverlessignoreの確認
echo -e "${YELLOW}ステップ5: .serverlessignoreの確認中...${NC}"
if [ ! -f .serverlessignore ]; then
  echo -e "${RED}.serverlessignoreファイルが見つかりません。作成します...${NC}"
  cat > .serverlessignore << 'EOF'
# 開発関連ファイル
.git/**
.gitignore
.env*
.nvmrc
README.md
*.md

# テスト関連
__tests__/**
test/**
*.test.js
jest.config.js
coverage/**

# 開発用ツール
.vscode/**
*.log
.serverless/**

# 大きな開発用依存関係
node_modules/serverless/**
node_modules/jest/**
node_modules/@babel/**
node_modules/webpack/**

# OS関連
.DS_Store
Thumbs.db

# 一時ファイル
tmp/**
temp/**
EOF
  echo ".serverlessignoreファイルを作成しました"
else
  echo ".serverlessignoreファイル確認完了"
fi

# ステップ6: パッケージサイズの確認
echo -e "${YELLOW}ステップ6: node_modulesサイズを確認中...${NC}"
NODE_MODULES_SIZE=$(du -sh node_modules | cut -f1)
echo "node_modulesサイズ: ${NODE_MODULES_SIZE}"
if [[ $(du -sm node_modules | cut -f1) -gt 100 ]]; then
  echo -e "${YELLOW}警告: node_modulesが大きいです。Lambda関数のサイズ制限に注意してください。${NC}"
fi

# ステップ7: AWSの認証情報の確認
echo -e "${YELLOW}ステップ7: AWS認証情報を確認中...${NC}"
AWS_CREDS=$(aws sts get-caller-identity 2>&1)
if [[ $? -ne 0 ]]; then
  echo -e "${RED}AWS認証情報の確認に失敗しました。以下のエラーを確認してください:${NC}"
  echo "$AWS_CREDS"
  read -p "続行しますか？ (y/n) " -n 1 -r
  echo 
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "AWS認証情報の確認完了"
  echo "$AWS_CREDS"
fi

# ステップ8: デプロイ実行
echo -e "${YELLOW}ステップ8: サーバーレスデプロイを実行中...${NC}"
echo "デプロイログは deploy.log に記録されます"
npm run deploy 2>&1 | tee deploy.log
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}デプロイに失敗しました。deploy.logを確認してください。${NC}"
  exit 1
fi
echo -e "${GREEN}デプロイが完了しました！${NC}"

# ステップ9: デプロイ情報の表示
echo -e "${YELLOW}ステップ9: デプロイ情報を表示中...${NC}"
echo "サービス情報:"
serverless info --stage dev
echo -e "${GREEN}=== デプロイ完了 ===${NC}"

# ステップ10: ログチェックの案内
echo -e "${YELLOW}ヒント: 以下のコマンドでログを確認できます:${NC}"
echo "npm run logs"
echo ""
echo -e "${GREEN}デプロイが成功しました！${NC}"
