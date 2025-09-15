#!/bin/bash

# fix-deployment-now.sh
# デプロイメント問題を即座に解決するスクリプト

echo "🚨 緊急デプロイメント修復スクリプト"
echo "====================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: 現在の状況診断
echo -e "${YELLOW}📊 現在のシステム状況を診断中...${NC}"
PROCESS_COUNT=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
MEMORY_MB=$(ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum+=$6} END {print int(sum/1024)}')
echo "  - Node/NPMプロセス数: ${PROCESS_COUNT}"
echo "  - メモリ使用量: ${MEMORY_MB}MB"
echo ""

if [ $PROCESS_COUNT -gt 5 ]; then
    echo -e "${RED}⚠️ 警告: 異常に多くのプロセスが実行中です${NC}"
    echo ""
fi

# Step 2: ユーザー確認
echo -e "${YELLOW}このスクリプトは以下を実行します:${NC}"
echo "  1. 全てのNode/NPMプロセスを終了"
echo "  2. キャッシュをクリア"
echo "  3. クリーンビルド実行"
echo "  4. Cloudflare Pagesへデプロイ"
echo ""
read -p "続行しますか? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "中止しました"
    exit 1
fi

# Step 3: プロセスクリーンアップ
echo ""
echo -e "${YELLOW}🧹 Step 1/4: プロセスクリーンアップ${NC}"
echo "  全てのNode関連プロセスを終了中..."

# 強制終了
pkill -f "node" 2>/dev/null
pkill -f "npm" 2>/dev/null
pkill -f "wrangler" 2>/dev/null

# ポート解放
for port in 3000 3001 3002 3003; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

sleep 2

# 確認
REMAINING=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
if [ $REMAINING -eq 0 ]; then
    echo -e "${GREEN}  ✅ プロセスクリーンアップ完了${NC}"
else
    echo -e "${YELLOW}  ⚠️ ${REMAINING}個のプロセスが残っています${NC}"
fi

# Step 4: キャッシュクリア
echo ""
echo -e "${YELLOW}🗑️ Step 2/4: キャッシュクリア${NC}"
echo "  キャッシュディレクトリを削除中..."

rm -rf node_modules/.cache 2>/dev/null
rm -rf .wrangler/ 2>/dev/null
rm -rf ~/.npm/_cacache 2>/dev/null
rm -rf build 2>/dev/null

echo -e "${GREEN}  ✅ キャッシュクリア完了${NC}"

# Step 5: クリーンビルド
echo ""
echo -e "${YELLOW}🔨 Step 3/4: クリーンビルド実行${NC}"
echo "  最適化されたビルドを開始..."

# 環境変数設定
export CI=false
export GENERATE_SOURCEMAP=false
export NODE_OPTIONS="--max-old-space-size=2048 --openssl-legacy-provider"
export REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'
export REACT_APP_DEFAULT_EXCHANGE_RATE='150.0'

# ビルド実行（タイムアウト付き）
timeout 300 npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ ビルド成功${NC}"
    
    # ビルドサイズ確認
    if [ -d "build" ]; then
        BUILD_SIZE=$(du -sh build | cut -f1)
        echo "  ビルドサイズ: ${BUILD_SIZE}"
    fi
else
    echo -e "${RED}  ❌ ビルド失敗またはタイムアウト${NC}"
    echo ""
    echo -e "${YELLOW}代替案:${NC}"
    echo "  1. Cloudflare Dashboardから手動でアップロード"
    echo "     https://dash.cloudflare.com/"
    echo "  2. 既存のビルドを使用（build-backup-*）"
    exit 1
fi

# Step 6: デプロイ
echo ""
echo -e "${YELLOW}🚀 Step 4/4: Cloudflare Pagesへデプロイ${NC}"
echo "  Wranglerでデプロイを試行..."

# デプロイ試行（タイムアウト付き）
timeout 60 wrangler pages deploy build --project-name=pfwise-portfolio-manager --branch=main --commit-dirty=true

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ デプロイ成功！${NC}"
    echo ""
    echo -e "${GREEN}🎉 完了！${NC}"
    echo "  本番環境: https://portfolio-wise.com/"
    echo "  確認してください"
else
    echo -e "${YELLOW}  ⚠️ Wranglerデプロイがタイムアウトしました${NC}"
    echo ""
    echo -e "${YELLOW}手動デプロイ手順:${NC}"
    echo "  1. https://dash.cloudflare.com/ にアクセス"
    echo "  2. Pages → pfwise-portfolio-manager を選択"
    echo "  3. 'Upload assets' をクリック"
    echo "  4. buildフォルダをドラッグ&ドロップ"
    echo ""
    echo "  buildフォルダの場所:"
    echo "  $(pwd)/build"
fi

# Step 7: 最終診断
echo ""
echo -e "${YELLOW}📊 最終診断${NC}"
FINAL_PROCESS=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
FINAL_MEMORY=$(ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum+=$6} END {print int(sum/1024)}')
echo "  - Node/NPMプロセス数: ${FINAL_PROCESS}"
echo "  - メモリ使用量: ${FINAL_MEMORY}MB"

if [ $FINAL_PROCESS -le 2 ] && [ $FINAL_MEMORY -le 500 ]; then
    echo -e "${GREEN}  ✅ システム正常${NC}"
else
    echo -e "${YELLOW}  ⚠️ 追加のクリーンアップが必要かもしれません${NC}"
fi

echo ""
echo "スクリプト完了"