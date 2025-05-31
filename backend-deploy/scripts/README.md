# Scripts README

## update-secrets.sh

AWS Secrets Managerでの機密情報管理スクリプト

### 🚀 使用方法

```bash
# スクリプト実行
./scripts/update-secrets.sh

# または
cd scripts && ./update-secrets.sh
```

### ✅ 事前準備

1. **AWS CLI設定済み**
   ```bash
   aws configure
   ```

2. **jqインストール済み**
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

3. **適切なIAM権限**
   - `secretsmanager:GetSecretValue`
   - `secretsmanager:UpdateSecret` 
   - `secretsmanager:CreateSecret`

### 📋 機能

- **🔐 Google OAuth credentials更新**
- **🔐 GitHub Token更新** 
- **🔐 API Keys一括更新**
- **📋 現在の設定確認**
- **🔄 全secrets一括更新**
- **🔗 APIキー取得先URL表示**

### 🔗 APIキー取得先

| サービス | URL | 説明 |
|---------|-----|------|
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | 株価データAPI |
| Alpaca Trading | https://alpaca.markets/docs/api-documentation/ | 米国株取引API |
| Open Exchange Rates | https://openexchangerates.org/signup/free | 為替レートAPI |
| Fixer | https://fixer.io/signup/free | 為替レートAPI |
| Google Cloud Console | https://console.cloud.google.com/apis/credentials | OAuth認証 |
| GitHub Tokens | https://github.com/settings/tokens | Git連携 |

### 🛡️ セキュリティ

- 機密情報はAWS Secrets Managerで暗号化保存
- 環境変数やコードへの平文保存を回避
- リージョン: `us-west-2`で統一

### 🐛 トラブルシューティング

**AWS権限エラー**:
```bash
aws sts get-caller-identity
```

**jqコマンドエラー**:
```bash
which jq || echo "jqをインストールしてください"
```

**リージョンエラー**:
```bash
export AWS_REGION=us-west-2
```