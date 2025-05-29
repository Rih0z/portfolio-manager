#!/bin/bash

# E2Eテスト実行スクリプト

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== E2E Test Runner ===${NC}"

# 引数処理
MODE=${1:-"all"}
HEADED=${2:-""}

# 環境変数の確認
if [ -z "$REACT_APP_API_BASE_URL" ]; then
    echo -e "${YELLOW}Warning: REACT_APP_API_BASE_URL is not set. Using default.${NC}"
    export REACT_APP_API_BASE_URL="http://localhost:4000"
fi

# Playwrightのインストール確認
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing Playwright browsers...${NC}"
    npx playwright install
fi

# テスト実行関数
run_tests() {
    local test_type=$1
    local extra_args=$2
    
    echo -e "${GREEN}Running $test_type tests...${NC}"
    
    if [ "$HEADED" = "headed" ]; then
        npx playwright test $extra_args --headed
    else
        npx playwright test $extra_args
    fi
}

# モードに応じてテストを実行
case $MODE in
    "all")
        run_tests "all" ""
        ;;
    "aws")
        run_tests "AWS integration" "aws-integration.spec.js"
        ;;
    "performance")
        run_tests "performance" "performance.spec.js"
        ;;
    "ui")
        run_tests "UI" "--grep-invert aws-integration|performance"
        ;;
    "debug")
        echo -e "${YELLOW}Running in debug mode...${NC}"
        PWDEBUG=1 npx playwright test --headed
        ;;
    "report")
        echo -e "${GREEN}Opening test report...${NC}"
        npx playwright show-report e2e-report
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: $0 [all|aws|performance|ui|debug|report] [headed]"
        exit 1
        ;;
esac

# テスト結果の確認
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests completed successfully!${NC}"
    
    # レポートの生成
    if [ -d "e2e-report" ]; then
        echo -e "${GREEN}Test report available at: e2e-report/index.html${NC}"
    fi
else
    echo -e "${RED}✗ Tests failed!${NC}"
    exit 1
fi