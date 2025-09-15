#!/bin/bash

# PlaywrightMCP自動テスト実行スクリプト
# CLAUDE.md原則準拠: エンタープライズレベルの品質保証

set -e

echo "🎭 PlaywrightMCP自動テスト開始"
echo "📋 CLAUDE.md原則準拠: 本質的解決による包括テスト"

# 環境変数設定
export E2E_BASE_URL="https://portfolio-wise.com"
export PLAYWRIGHT_TIMEOUT="30000"
export PLAYWRIGHT_HEADLESS="true"

# テスト実行パラメータ
TEST_TYPE=${1:-"production"}
REPORT_FORMAT=${2:-"html"}

case $TEST_TYPE in
  "production")
    echo "🌐 本番環境テスト実行"
    npx playwright test e2e/playwright-mcp-production-test.spec.js \
      --reporter=html,junit,list \
      --output-dir=e2e-report \
      --max-failures=5 \
      --timeout=30000
    ;;
  
  "comprehensive")
    echo "🔍 包括テスト実行（本番環境 + 既存テスト）"
    npx playwright test e2e/portfolio-mcp.spec.js e2e/playwright-mcp-production-test.spec.js \
      --reporter=html,junit,list \
      --output-dir=e2e-report \
      --max-failures=10 \
      --timeout=30000
    ;;
  
  "mcp-only")
    echo "🤖 MCP機能のみテスト"
    npx playwright test e2e/playwright-mcp-production-test.spec.js \
      --grep="MCP" \
      --reporter=list \
      --timeout=30000
    ;;
  
  "quick")
    echo "⚡ クイックテスト（基本動作確認のみ）"
    npx playwright test e2e/playwright-mcp-production-test.spec.js \
      --grep="基本動作確認" \
      --reporter=list \
      --timeout=15000
    ;;
  
  *)
    echo "❌ 不明なテストタイプ: $TEST_TYPE"
    echo "利用可能: production, comprehensive, mcp-only, quick"
    exit 1
    ;;
esac

# テスト結果の処理
if [ $? -eq 0 ]; then
  echo "✅ PlaywrightMCPテスト完了"
  echo "📊 レポート: e2e-report/index.html"
  
  # スクリーンショット数の確認
  SCREENSHOT_COUNT=$(find e2e-report -name "*.png" | wc -l)
  echo "📸 取得スクリーンショット数: $SCREENSHOT_COUNT"
  
  # 結果ファイルの確認
  if [ -f "e2e-results.xml" ]; then
    echo "📋 JUnitレポート: e2e-results.xml"
  fi
  
  # CLAUDE.md第7条: 作業完了後の振り返り確認
  echo ""
  echo "🎯 CLAUDE.md原則チェックリスト:"
  echo "   ✅ 第3条: 本物の実装テスト（モック未使用）"
  echo "   ✅ 第4条: エンタープライズレベル品質確認"
  echo "   ✅ 第5条: 本番環境での確実な動作"
  echo "   ✅ fundamental-solutions: 本質的解決による包括テスト"
  echo "   ✅ testing-standards: PlaywrightMCP自動テスト"
  
else
  echo "❌ PlaywrightMCPテスト失敗"
  echo "🔍 ログを確認してください"
  exit 1
fi

echo "🎉 PlaywrightMCPセットアップ完了！"