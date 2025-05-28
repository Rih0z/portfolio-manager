#!/bin/bash

# AWS Secrets Manager secret更新スクリプト
# 使用方法: ./scripts/update-secrets.sh

set -e

# 色付きの出力関数
print_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# AWS CLIの存在確認
if ! command -v aws &> /dev/null; then
    print_error "AWS CLIがインストールされていません。"
    print_info "インストール: https://aws.amazon.com/cli/"
    exit 1
fi

# リージョン設定
REGION="us-west-2"

print_info "AWS Secrets Manager secret更新スクリプトを開始します"
print_info "リージョン: $REGION"

# 必要なURLと情報を表示
show_urls_and_info() {
    echo ""
    echo "🔗 新しいAPIキーを取得する必要がある場合："
    echo ""
    echo "📊 Market Data APIs:"
    echo "   • Alpha Vantage: https://www.alphavantage.co/support/#api-key"
    echo "   • Alpaca Trading: https://alpaca.markets/docs/api-documentation/"
    echo ""
    echo "💱 Exchange Rate APIs:"
    echo "   • Open Exchange Rates: https://openexchangerates.org/signup/free"
    echo "   • Fixer: https://fixer.io/signup/free"
    echo ""
    echo "🔐 OAuth & Integration:"
    echo "   • Google Cloud Console: https://console.cloud.google.com/apis/credentials"
    echo "     Client ID: 243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com"
    echo "   • GitHub Tokens: https://github.com/settings/tokens"
    echo ""
    echo "📚 ドキュメント:"
    echo "   • API Documentation: https://github.com/Rih0z/portfolio-market-data-api"
    echo "   • Google OAuth Setup: Google Cloud Console → APIs & Services → Credentials"
    echo ""
    echo "⚠️  重要:"
    echo "   • 各APIプロバイダーでアカウント作成が必要です"
    echo "   • 無料プランの利用制限を確認してください"
    echo "   • テスト環境と本番環境で別々のAPIキーを使用することを推奨します"
    echo ""
    read -p "続行するにはEnterキーを押してください..."
}

# Google OAuth Secret更新
update_google_oauth() {
    print_info "Google OAuth credentialsを管理します"
    print_info "📍 Google Cloud Console: https://console.cloud.google.com/apis/credentials"
    echo ""
    
    # 現在のClient IDを取得
    CURRENT_CLIENT_ID=$(aws secretsmanager get-secret-value \
        --secret-id pfwise-api/google-oauth \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq -r '.clientId' || echo "")
    
    if [ -n "$CURRENT_CLIENT_ID" ]; then
        print_info "現在のClient ID: $CURRENT_CLIENT_ID"
        read -p "Client IDを更新しますか？ (y/N): " update_client_id
        if [[ "$update_client_id" =~ ^[Yy]$ ]]; then
            print_info "新しいClient IDをGoogle Cloud Consoleから取得してください"
            print_info "形式: XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com"
            read -p "新しいClient ID: " NEW_CLIENT_ID
        fi
    else
        print_info "Google Cloud ConsoleからOAuth 2.0クライアントIDを取得してください"
        print_info "形式: XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com"
        read -p "Google Client ID: " NEW_CLIENT_ID
    fi
    [ -z "$NEW_CLIENT_ID" ] && NEW_CLIENT_ID="$CURRENT_CLIENT_ID"
    
    # Client Secretの更新確認
    CURRENT_CLIENT_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id pfwise-api/google-oauth \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq -r '.clientSecret' || echo "")
    
    if [ -n "$CURRENT_CLIENT_SECRET" ]; then
        print_info "現在のClient Secret: ${CURRENT_CLIENT_SECRET:0:10}..."
        read -p "Client Secretを更新しますか？ (y/N): " update_client_secret
        if [[ "$update_client_secret" =~ ^[Yy]$ ]]; then
            print_info "Client Secretを再生成してください:"
            print_info "1. Google Cloud Console → 認証情報 → OAuth 2.0クライアントIDを選択"
            print_info "2. 「クライアントシークレットをリセット」をクリック"
            print_info "3. 新しいシークレットをコピー"
            print_info "形式: GOCSPX-[シークレット文字列]"
            read -p "新しいGoogle Client Secret: " NEW_CLIENT_SECRET
        fi
    else
        print_info "Google Cloud ConsoleからClient Secretを取得してください"
        print_info "形式: GOCSPX-[シークレット文字列]"
        read -p "Google Client Secret: " NEW_CLIENT_SECRET
    fi
    [ -z "$NEW_CLIENT_SECRET" ] && NEW_CLIENT_SECRET="$CURRENT_CLIENT_SECRET"
    
    # JSONを作成して更新
    SECRET_JSON=$(jq -n \
        --arg clientId "$NEW_CLIENT_ID" \
        --arg clientSecret "$NEW_CLIENT_SECRET" \
        '{clientId: $clientId, clientSecret: $clientSecret}')
    
    aws secretsmanager update-secret \
        --secret-id pfwise-api/google-oauth \
        --secret-string "$SECRET_JSON" \
        --region $REGION
    
    print_success "Google OAuth credentials設定を完了しました"
}

# GitHub Token更新
update_github_token() {
    print_info "GitHub Tokenを管理します"
    print_info "📍 GitHub Settings: https://github.com/settings/tokens"
    print_info "📍 新しいToken生成: https://github.com/settings/tokens/new"
    echo ""
    
    # 現在のTokenを取得
    CURRENT_GITHUB_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id pfwise-api/github-token \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq -r '.token' || echo "")
    
    if [ -n "$CURRENT_GITHUB_TOKEN" ]; then
        print_info "現在のGitHub Token: ${CURRENT_GITHUB_TOKEN:0:10}..."
        read -p "GitHub Tokenを更新しますか？ (y/N): " update_github
        if [[ "$update_github" =~ ^[Yy]$ ]]; then
            print_info "新しいPersonal Access Tokenを生成してください:"
            print_info "1. GitHub → Settings → Developer settings → Personal access tokens"
            print_info "2. 「Generate new token」をクリック"
            print_info "3. 必要なスコープを選択 (repo, admin:repo_hook等)"
            print_info "4. 生成されたTokenをコピー"
            print_info "形式: ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            read -p "新しいGitHub Personal Access Token: " NEW_GITHUB_TOKEN
        fi
    else
        print_info "GitHubからPersonal Access Tokenを取得してください"
        print_info "形式: ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        read -p "GitHub Personal Access Token: " NEW_GITHUB_TOKEN
    fi
    [ -z "$NEW_GITHUB_TOKEN" ] && NEW_GITHUB_TOKEN="$CURRENT_GITHUB_TOKEN"
    
    # JSONを作成して更新
    SECRET_JSON=$(jq -n --arg token "$NEW_GITHUB_TOKEN" '{token: $token}')
    
    aws secretsmanager update-secret \
        --secret-id pfwise-api/github-token \
        --secret-string "$SECRET_JSON" \
        --region $REGION
    
    print_success "GitHub Token設定を完了しました"
}

# その他のAPI Keys更新
update_api_keys() {
    print_info "API認証情報を管理します"
    print_info "各APIキーを更新するか選択してください"
    print_info "更新する場合: 新しいキーを入力"
    print_info "更新しない場合: Enterで現在の値を維持"
    
    # 現在の値を取得（存在しない場合は空文字）
    CURRENT_SECRETS=$(aws secretsmanager get-secret-value \
        --secret-id pfwise-api/credentials \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null || echo '{}')
    
    # 各APIキーの更新
    echo ""
    print_info "📊 Market Data API Keys"
    
    echo "=== Alpha Vantage API Key ==="
    print_info "📍 取得URL: https://www.alphavantage.co/support/#api-key"
    CURRENT_ALPHA_VANTAGE=$(echo "$CURRENT_SECRETS" | jq -r '.ALPHA_VANTAGE_API_KEY // empty')
    if [ -n "$CURRENT_ALPHA_VANTAGE" ]; then
        print_info "現在の値: ${CURRENT_ALPHA_VANTAGE:0:10}..."
        read -p "Alpha Vantage API Keyを更新しますか？ (y/N): " update_alpha
        if [[ "$update_alpha" =~ ^[Yy]$ ]]; then
            print_info "Alpha Vantageでアカウント作成し、無料のAPI Keyを取得してください"
            print_info "形式: 英数字16文字 (例: ABCD1234EFGH5678)"
            read -p "新しいAlpha Vantage API Key: " ALPHA_VANTAGE_KEY
        fi
    else
        print_info "Alpha Vantageでアカウント作成し、無料のAPI Keyを取得してください"
        print_info "形式: 英数字16文字 (例: ABCD1234EFGH5678)"
        read -p "Alpha Vantage API Key: " ALPHA_VANTAGE_KEY
    fi
    [ -z "$ALPHA_VANTAGE_KEY" ] && ALPHA_VANTAGE_KEY="$CURRENT_ALPHA_VANTAGE"
    
    echo "=== Alpaca Trading API Keys ==="
    print_info "📍 取得URL: https://alpaca.markets/docs/api-documentation/"
    print_info "📍 ダッシュボード: https://app.alpaca.markets/"
    CURRENT_ALPACA_KEY=$(echo "$CURRENT_SECRETS" | jq -r '.ALPACA_API_KEY // empty')
    CURRENT_ALPACA_SECRET=$(echo "$CURRENT_SECRETS" | jq -r '.ALPACA_API_SECRET // empty')
    if [ -n "$CURRENT_ALPACA_KEY" ]; then
        print_info "現在のAlpaca Key: ${CURRENT_ALPACA_KEY:0:10}..."
        read -p "Alpaca API Keyを更新しますか？ (y/N): " update_alpaca
        if [[ "$update_alpaca" =~ ^[Yy]$ ]]; then
            print_info "Alpacaアカウントのペーパートレーディング用APIキーを取得してください"
            print_info "Key形式: PK + 英数字 (例: PKXXXXXXXXXXXXXXXXXX)"
            print_info "Secret形式: 英数字40文字"
            read -p "新しいAlpaca API Key: " ALPACA_KEY
            read -p "新しいAlpaca API Secret: " ALPACA_SECRET
        fi
    else
        print_info "Alpacaアカウントのペーパートレーディング用APIキーを取得してください"
        print_info "Key形式: PK + 英数字 (例: PKXXXXXXXXXXXXXXXXXX)"
        print_info "Secret形式: 英数字40文字"
        read -p "Alpaca API Key: " ALPACA_KEY
        read -p "Alpaca API Secret: " ALPACA_SECRET
    fi
    [ -z "$ALPACA_KEY" ] && ALPACA_KEY="$CURRENT_ALPACA_KEY"
    [ -z "$ALPACA_SECRET" ] && ALPACA_SECRET="$CURRENT_ALPACA_SECRET"
    
    echo ""
    print_info "💱 Exchange Rate API Keys"
    
    echo "=== Open Exchange Rates API ==="
    print_info "📍 取得URL: https://openexchangerates.org/signup/free"
    CURRENT_OPEN_EXCHANGE=$(echo "$CURRENT_SECRETS" | jq -r '.OPEN_EXCHANGE_RATES_APP_ID // empty')
    if [ -n "$CURRENT_OPEN_EXCHANGE" ]; then
        print_info "現在の値: ${CURRENT_OPEN_EXCHANGE:0:10}..."
        read -p "Open Exchange Rates App IDを更新しますか？ (y/N): " update_open_exchange
        if [[ "$update_open_exchange" =~ ^[Yy]$ ]]; then
            print_info "Open Exchange Ratesで無料アカウント作成し、App IDを取得してください"
            print_info "形式: 英数字32文字"
            read -p "新しいOpen Exchange Rates App ID: " OPEN_EXCHANGE_KEY
        fi
    else
        print_info "Open Exchange Ratesで無料アカウント作成し、App IDを取得してください"
        print_info "形式: 英数字32文字"
        read -p "Open Exchange Rates App ID: " OPEN_EXCHANGE_KEY
    fi
    [ -z "$OPEN_EXCHANGE_KEY" ] && OPEN_EXCHANGE_KEY="$CURRENT_OPEN_EXCHANGE"
    
    echo "=== Fixer API Key ==="
    print_info "📍 取得URL: https://fixer.io/signup/free"
    CURRENT_FIXER=$(echo "$CURRENT_SECRETS" | jq -r '.FIXER_API_KEY // empty')
    if [ -n "$CURRENT_FIXER" ]; then
        print_info "現在の値: ${CURRENT_FIXER:0:10}..."
        read -p "Fixer API Keyを更新しますか？ (y/N): " update_fixer
        if [[ "$update_fixer" =~ ^[Yy]$ ]]; then
            print_info "Fixerで無料アカウント作成し、API Keyを取得してください"
            print_info "形式: 英数字32文字"
            read -p "新しいFixer API Key: " FIXER_KEY
        fi
    else
        print_info "Fixerで無料アカウント作成し、API Keyを取得してください"
        print_info "形式: 英数字32文字"
        read -p "Fixer API Key: " FIXER_KEY
    fi
    [ -z "$FIXER_KEY" ] && FIXER_KEY="$CURRENT_FIXER"
    
    echo ""
    print_info "🔐 システム認証キー"
    
    echo "=== 管理者API Key ==="
    CURRENT_ADMIN_KEY=$(echo "$CURRENT_SECRETS" | jq -r '.ADMIN_API_KEY // empty')
    if [ -n "$CURRENT_ADMIN_KEY" ]; then
        print_info "現在の管理者Key: ${CURRENT_ADMIN_KEY:0:10}..."
        read -p "管理者API Keyを更新しますか？ (y/N): " update_admin
        if [[ "$update_admin" =~ ^[Yy]$ ]]; then
            read -p "新しい管理者API Key: " ADMIN_KEY
        fi
    else
        read -p "管理者API Key: " ADMIN_KEY
    fi
    [ -z "$ADMIN_KEY" ] && ADMIN_KEY="$CURRENT_ADMIN_KEY"
    
    echo "=== CRON Secret ==="
    CURRENT_CRON_SECRET=$(echo "$CURRENT_SECRETS" | jq -r '.CRON_SECRET // empty')
    if [ -n "$CURRENT_CRON_SECRET" ]; then
        print_info "現在のCRON Secret: ${CURRENT_CRON_SECRET:0:10}..."
        read -p "CRON Secretを更新しますか？ (y/N): " update_cron
        if [[ "$update_cron" =~ ^[Yy]$ ]]; then
            read -p "新しいCRON Secret (Enterで自動生成): " CRON_SECRET
            if [ -z "$CRON_SECRET" ]; then
                CRON_SECRET=$(openssl rand -base64 32)
                print_info "CRON Secretを自動生成しました"
            fi
        fi
    else
        read -p "CRON Secret (Enterで自動生成): " CRON_SECRET
        if [ -z "$CRON_SECRET" ]; then
            CRON_SECRET=$(openssl rand -base64 32)
            print_info "CRON Secretを自動生成しました"
        fi
    fi
    [ -z "$CRON_SECRET" ] && CRON_SECRET="$CURRENT_CRON_SECRET"
    
    echo "=== ユーザーAPI Key ==="
    CURRENT_USER_KEY=$(echo "$CURRENT_SECRETS" | jq -r '.USER_API_KEY // empty')
    if [ -n "$CURRENT_USER_KEY" ]; then
        print_info "現在のユーザーKey: ${CURRENT_USER_KEY:0:10}..."
        read -p "ユーザーAPI Keyを更新しますか？ (y/N): " update_user
        if [[ "$update_user" =~ ^[Yy]$ ]]; then
            read -p "新しいユーザーAPI Key (Enterで自動生成): " USER_KEY
            if [ -z "$USER_KEY" ]; then
                USER_KEY=$(openssl rand -base64 32)
                print_info "ユーザーAPI Keyを自動生成しました"
            fi
        fi
    else
        read -p "ユーザーAPI Key (Enterで自動生成): " USER_KEY
        if [ -z "$USER_KEY" ]; then
            USER_KEY=$(openssl rand -base64 32)
            print_info "ユーザーAPI Keyを自動生成しました"
        fi
    fi
    [ -z "$USER_KEY" ] && USER_KEY="$CURRENT_USER_KEY"
    
    # JSONを作成して更新
    SECRET_JSON=$(jq -n \
        --arg alphaVantage "$ALPHA_VANTAGE_KEY" \
        --arg alpacaKey "$ALPACA_KEY" \
        --arg alpacaSecret "$ALPACA_SECRET" \
        --arg openExchange "$OPEN_EXCHANGE_KEY" \
        --arg fixerKey "$FIXER_KEY" \
        --arg adminKey "$ADMIN_KEY" \
        --arg cronSecret "$CRON_SECRET" \
        --arg userKey "$USER_KEY" \
        '{
            ALPHA_VANTAGE_API_KEY: $alphaVantage,
            ALPACA_API_KEY: $alpacaKey,
            ALPACA_API_SECRET: $alpacaSecret,
            OPEN_EXCHANGE_RATES_APP_ID: $openExchange,
            FIXER_API_KEY: $fixerKey,
            ADMIN_API_KEY: $adminKey,
            CRON_SECRET: $cronSecret,
            USER_API_KEY: $userKey
        }')
    
    # pfwise-api/credentialsが存在しない場合は作成
    if ! aws secretsmanager describe-secret --secret-id pfwise-api/credentials --region $REGION &>/dev/null; then
        print_info "pfwise-api/credentials secretを新規作成します"
        aws secretsmanager create-secret \
            --name pfwise-api/credentials \
            --description "API credentials for pfwise-api" \
            --secret-string "$SECRET_JSON" \
            --region $REGION
    else
        aws secretsmanager update-secret \
            --secret-id pfwise-api/credentials \
            --secret-string "$SECRET_JSON" \
            --region $REGION
    fi
    
    print_success "API Keys設定を完了しました"
    print_info "🔔 次の手順："
    print_info "1. システムの動作確認"
    print_info "2. API使用ログの確認"
}

# 現在の設定確認
show_current_secrets() {
    print_info "現在のsecrets設定を確認します"
    
    echo "=== Google OAuth ==="
    aws secretsmanager get-secret-value \
        --secret-id pfwise-api/google-oauth \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq . || print_warning "Google OAuth secretが見つかりません"
    
    echo "=== GitHub Token ==="
    aws secretsmanager get-secret-value \
        --secret-id pfwise-api/github-token \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq . || print_warning "GitHub Token secretが見つかりません"
    
    echo "=== API Credentials ==="
    aws secretsmanager get-secret-value \
        --secret-id pfwise-api/credentials \
        --region $REGION \
        --query 'SecretString' \
        --output text 2>/dev/null | jq . || print_warning "API Credentials secretが見つかりません"
}

# メニュー表示
show_menu() {
    echo ""
    echo "==================== Secrets Manager 管理メニュー ===================="
    echo "🔐 API認証情報管理ツール"
    echo ""
    echo "1) 🔐 Google OAuth credentials更新"
    echo "2) 🔐 GitHub Token更新"
    echo "3) 🔐 API Keys一括更新 ⭐推奨"
    echo "4) 📋 現在の設定確認"
    echo "5) 🔄 全secrets一括更新"
    echo "6) 🔗 APIキー取得先URL表示"
    echo "0) 🚪 終了"
    echo ""
    echo "💡 対応するAPI Keys:"
    echo "   - Google OAuth (Client ID/Secret)"
    echo "   - GitHub Personal Access Token"
    echo "   - Alpha Vantage API Key"
    echo "   - Alpaca Trading API Keys"
    echo "   - Exchange Rate API Keys (Open Exchange Rates, Fixer)"
    echo "   - 管理者認証キー・CRON Secret"
    echo "======================================================================="
}

# メイン処理
main() {
    # 初回起動時にURL情報を表示
    show_urls_and_info
    
    while true; do
        show_menu
        read -p "選択してください [0-6]: " choice
        
        case $choice in
            1)
                update_google_oauth
                ;;
            2)
                update_github_token
                ;;
            3)
                update_api_keys
                ;;
            4)
                show_current_secrets
                ;;
            5)
                print_info "全てのsecretsを更新します"
                update_google_oauth
                echo ""
                update_github_token
                echo ""
                update_api_keys
                print_success "全てのsecrets更新が完了しました"
                ;;
            6)
                show_urls_and_info
                ;;
            0)
                print_info "終了します"
                exit 0
                ;;
            *)
                print_error "無効な選択です"
                ;;
        esac
        
        echo ""
        read -p "Enterキーで続行..."
    done
}

# jqの存在確認
if ! command -v jq &> /dev/null; then
    print_error "jqがインストールされていません。"
    print_info "macOS: brew install jq"
    print_info "Ubuntu: sudo apt-get install jq"
    exit 1
fi

# スクリプト実行
main