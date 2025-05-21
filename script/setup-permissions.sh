#!/bin/bash

# スクリプトに実行権限を付与する
#
# 使用方法:
#   ./script/setup-permissions.sh

echo "スクリプトに実行権限を付与します..."

# スクリプトディレクトリのパスを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 各スクリプトに実行権限を付与
chmod +x "$SCRIPT_DIR/run-all-tests.js"
chmod +x "$SCRIPT_DIR/run-unit-tests.js"
chmod +x "$SCRIPT_DIR/run-integration-tests.js"
chmod +x "$SCRIPT_DIR/run-e2e-tests.js"
chmod +x "$SCRIPT_DIR/generate-coverage-report.js"

echo "完了しました。以下のコマンドを直接実行できます:"
echo "  ./script/run-all-tests.js"
echo "  ./script/run-unit-tests.js"
echo "  ./script/run-integration-tests.js"
echo "  ./script/run-e2e-tests.js"
echo "  ./script/generate-coverage-report.js"
