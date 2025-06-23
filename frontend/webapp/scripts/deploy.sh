#!/bin/bash

# Portfolio Manager デプロイスクリプト
# 使用方法: ./scripts/deploy.sh [オプション]

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# デフォルト設定
PROJECT_NAME="pfwise-portfolio-manager"
BUILD_DIR="build"
BRANCH=""

# 使用方法を表示
usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -p, --project <name>   プロジェクト名を指定 (デフォルト: $PROJECT_NAME)"
    echo "  -b, --branch <name>    ブランチ名を指定 (本番デプロイ用)"
    echo "  --skip-build           ビルドをスキップ"
    echo "  --preview              プレビューデプロイを実行"
    echo "  -h, --help             このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                     # 通常のデプロイ"
    echo "  $0 --preview           # プレビューデプロイ"
    echo "  $0 -b main             # 本番デプロイ"
    echo "  $0 --skip-build        # ビルド済みファイルをデプロイ"
}

# オプション解析
SKIP_BUILD=false
PREVIEW=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --preview)
            PREVIEW=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}エラー: 不明なオプション: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

echo -e "${GREEN}=== Portfolio Manager デプロイ ===${NC}"
echo ""

# ビルド実行
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}ビルドを実行中...${NC}"
    export REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'
    export REACT_APP_DEFAULT_EXCHANGE_RATE='150.0'
    export NODE_OPTIONS='--openssl-legacy-provider'
    
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ビルド完了${NC}"
    else
        echo -e "${RED}✗ ビルドに失敗しました${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}ビルドをスキップ${NC}"
fi

# ビルドディレクトリの確認
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}エラー: ビルドディレクトリが見つかりません: $BUILD_DIR${NC}"
    exit 1
fi

# デプロイ実行
echo ""
echo -e "${YELLOW}Cloudflare Pagesにデプロイ中...${NC}"

# デプロイコマンドを構築
DEPLOY_CMD="wrangler pages deploy $BUILD_DIR"

# プレビューモードでない場合はプロジェクト名を指定
if [ "$PREVIEW" = false ]; then
    DEPLOY_CMD="$DEPLOY_CMD --project-name=$PROJECT_NAME"
fi

# ブランチが指定されている場合
if [ -n "$BRANCH" ]; then
    DEPLOY_CMD="$DEPLOY_CMD --branch=$BRANCH"
fi

# 常に --commit-dirty=true を追加
DEPLOY_CMD="$DEPLOY_CMD --commit-dirty=true"

echo "実行コマンド: $DEPLOY_CMD"
echo ""

# デプロイ実行
$DEPLOY_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ デプロイが完了しました！${NC}"
    echo ""
    echo "アクセスURL:"
    echo "  本番環境: https://portfolio-wise.com/"
    echo "  プレビュー: デプロイ出力のURLを確認してください"
else
    echo -e "${RED}✗ デプロイに失敗しました${NC}"
    exit 1
fi