#!/bin/bash

# test-dev-server.sh
# 開発サーバーを起動してログを監視

echo "🚀 開発サーバー起動とログ監視"
echo "================================"

# 環境変数設定
export PORT=3003
export BROWSER=none
export REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod'
export REACT_APP_DEFAULT_EXCHANGE_RATE='150.0'

echo "環境設定:"
echo "  PORT: $PORT"
echo "  API: $REACT_APP_API_BASE_URL"
echo ""

# サーバー起動
echo "📦 開発サーバーを起動中..."
npm start 2>&1 | while read line; do
    echo "[$(date +%H:%M:%S)] $line"
    
    # 重要なメッセージを強調
    if [[ $line == *"Compiled successfully"* ]]; then
        echo "✅ ビルド成功！"
        echo "🌐 ブラウザで http://localhost:$PORT を開いてください"
    fi
    
    if [[ $line == *"error"* ]] || [[ $line == *"Error"* ]]; then
        echo "❌ エラー検出: $line"
    fi
    
    if [[ $line == *"warning"* ]] || [[ $line == *"Warning"* ]]; then
        echo "⚠️ 警告: $line"
    fi
done