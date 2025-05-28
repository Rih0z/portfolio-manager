# AWS API Gateway CORS設定ガイド（詳細版）

## 現在の問題
- curlコマンドでは動作する ✅
- ブラウザからアクセスできない ❌ → CORS設定が必要

## AWSコンソールでの設定手順

### ステップ1: API Gatewayコンソールにアクセス
1. AWSコンソールにログイン
2. サービス → **API Gateway**を選択
3. API一覧から `x4scpbsuv2` を選択

### ステップ2: OPTIONSメソッドの追加
1. 左メニューから **リソース** を選択
2. `/dev/api/market-data` リソースを選択
3. **アクション** → **メソッドの作成** をクリック
4. ドロップダウンから **OPTIONS** を選択し、チェックマークをクリック

### ステップ3: OPTIONSメソッドの設定
1. **統合タイプ**: `Mock` を選択
2. **保存** をクリック

### ステップ4: メソッドレスポンスの設定
1. **OPTIONS** → **メソッドレスポンス** をクリック
2. **200** の横の矢印をクリックして展開
3. **レスポンスヘッダー** の **ヘッダーを追加** をクリック
4. 以下のヘッダーを追加:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Headers`
   - `Access-Control-Allow-Methods`

### ステップ5: 統合レスポンスの設定
1. 戻って **OPTIONS** → **統合レスポンス** をクリック
2. **200** の横の矢印をクリックして展開
3. **ヘッダーマッピング** セクションで以下を設定:
   - `Access-Control-Allow-Origin`: `'*'`
   - `Access-Control-Allow-Headers`: `'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'`
   - `Access-Control-Allow-Methods`: `'GET,POST,OPTIONS'`

### ステップ6: GETメソッドにもCORSヘッダーを追加
1. `/dev/api/market-data` の **GET** メソッドを選択
2. **メソッドレスポンス** → **200** → **レスポンスヘッダー** に同じヘッダーを追加
3. **統合レスポンス** → **200** → **ヘッダーマッピング** に同じ値を設定

### ステップ7: APIをデプロイ
1. **アクション** → **APIのデプロイ** をクリック
2. **デプロイメントステージ**: `dev` を選択
3. **デプロイ** をクリック

## AWS CLIでの設定（代替方法）

```bash
# 1. リソースIDを取得
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id x4scpbsuv2 \
  --region us-west-2 \
  --query "items[?path=='/dev/api/market-data'].id" \
  --output text)

# 2. OPTIONSメソッドを作成
aws apigateway put-method \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region us-west-2

# 3. Mock統合を設定
aws apigateway put-integration \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region us-west-2

# 4. メソッドレスポンスを設定
aws apigateway put-method-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Origin": true,
    "method.response.header.Access-Control-Allow-Headers": true,
    "method.response.header.Access-Control-Allow-Methods": true
  }' \
  --region us-west-2

# 5. 統合レスポンスを設定
aws apigateway put-integration-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Origin": "'\''*'\''",
    "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''",
    "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,OPTIONS'\''"
  }' \
  --region us-west-2

# 6. GETメソッドにもCORSヘッダーを追加
aws apigateway update-method-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --patch-operations \
    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value=true \
  --region us-west-2

aws apigateway update-integration-response \
  --rest-api-id x4scpbsuv2 \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --patch-operations \
    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value="'*'" \
  --region us-west-2

# 7. デプロイ
aws apigateway create-deployment \
  --rest-api-id x4scpbsuv2 \
  --stage-name dev \
  --description "CORS設定を追加" \
  --region us-west-2
```

## CloudFormationテンプレート（推奨）

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'API Gateway CORS Configuration'

Resources:
  MarketDataOptions:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: x4scpbsuv2
      ResourceId: !Ref MarketDataResource
      HttpMethod: OPTIONS
      AuthorizationType: NONE
      Integration:
        Type: MOCK
        RequestTemplates:
          application/json: '{"statusCode": 200}'
        IntegrationResponses:
          - StatusCode: 200
            ResponseParameters:
              method.response.header.Access-Control-Allow-Headers: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
              method.response.header.Access-Control-Allow-Methods: "'GET,POST,OPTIONS'"
              method.response.header.Access-Control-Allow-Origin: "'*'"
            ResponseTemplates:
              application/json: ''
      MethodResponses:
        - StatusCode: 200
          ResponseParameters:
            method.response.header.Access-Control-Allow-Headers: true
            method.response.header.Access-Control-Allow-Methods: true
            method.response.header.Access-Control-Allow-Origin: true
```

## 確認方法

設定後、以下のコマンドで確認：

```bash
# 1. OPTIONSリクエスト（プリフライト）のテスト
curl -X OPTIONS -i \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data

# 期待されるレスポンスヘッダー:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET,POST,OPTIONS
# Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token

# 2. 実際のGETリクエスト
curl -H "Origin: http://localhost:3000" -i \
  "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/api/market-data?type=us-stock&symbols=AAPL"
```

## トラブルシューティング

### 「CORSを有効化」がクリックできない場合
- OPTIONSメソッドを手動で作成してください（上記手順参照）
- すでにOPTIONSメソッドが存在する可能性があります

### 403エラーが続く場合
1. APIが正しくデプロイされているか確認
2. ブラウザの開発者ツールでネットワークタブを確認
3. OPTIONSリクエストが200を返しているか確認

### それでも動作しない場合
Lambda関数に直接CORSヘッダーを追加する方法が最も確実です（`AWS_LAMBDA_CORS_FIX.md`参照）。