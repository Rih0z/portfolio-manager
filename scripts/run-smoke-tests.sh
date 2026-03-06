#!/bin/bash
#
# デプロイ後スモークテスト実行スクリプト
# Wranglerデプロイ後に手動実行可能
#
# Usage: ./scripts/run-smoke-tests.sh [URL]
#

set -euo pipefail

PROD_URL="${1:-https://portfolio-wise.com}"

echo "=== Production Smoke Tests ==="
echo "Target: $PROD_URL"
echo ""

PROD_URL="$PROD_URL" npx playwright test \
  --project=production-smoke \
  --reporter=list

echo ""
echo "=== Smoke Tests Complete ==="
