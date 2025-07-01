# Google認証問題の調査結果と分析

## 問題の概要
本番環境（https://portfolio-wise.com/）でGoogle認証が失敗する問題

## 調査結果

### 1. 現在のコードの状態

#### AuthContext.js (174-176行目)
```javascript
loginEndpoint = isProduction 
  ? `${AWS_API_BASE}/auth/google/login`
  : '/api-proxy/auth/google/login';
```

**問題点**: 本番環境（portfolio-wise.com）では直接AWS APIを呼び出すが、開発環境ではプロキシ経由となっている。

### 2. 環境判定ロジック (167-171行目)
```javascript
const isProduction = window.location.hostname === 'portfolio-wise.com' || 
                    window.location.hostname.includes('portfolio-manager') ||
                    window.location.hostname.includes('pages.dev');
```

この判定により：
- `portfolio-wise.com` → 本番環境として認識 ✓
- Cloudflare Pagesプレビュー → 本番環境として認識 ✓
- localhost → 開発環境として認識 ✓

### 3. API呼び出しの実装 (224-233行目)
```javascript
const response = await fetch(loginEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  credentials: 'include',  // Cookieを含める
  body: JSON.stringify(requestBody),
  signal: controller.signal
});
```

### 4. 最近の変更履歴
- `b745774b`: 直接AWS APIエンドポイントを使用するよう修正
- `ba5afea3`: プロキシ設定を追加（/api-proxy/）
- `026a6b92`: 為替レートタイムアウト最適化（認証には直接影響なし）

## 問題の原因分析

### 可能性1: CORS設定の問題
本番環境から直接AWS APIを呼び出す際、CORSエラーが発生している可能性

**確認方法**:
1. ブラウザの開発者ツール → ネットワークタブ
2. `/auth/google/login`リクエストを確認
3. レスポンスヘッダーの`Access-Control-Allow-Origin`を確認

### 可能性2: 環境変数の問題
`REACT_APP_API_BASE_URL`が正しく設定されていない可能性

**確認方法**:
```javascript
console.log('AWS_API_BASE:', process.env.REACT_APP_API_BASE_URL);
```

### 可能性3: Cloudflare Pagesのプロキシ機能との競合
Cloudflare Pagesの`functions/api-proxy/[[path]].js`が本番環境でも動作している可能性

## 推奨される修正案

### 案1: 本番環境でもプロキシを使用（推奨）
```javascript
// AuthContext.js (174-176行目)を修正
loginEndpoint = '/api-proxy/auth/google/login';  // 常にプロキシを使用
```

**メリット**:
- Cloudflare Pagesのプロキシ機能により、CORS問題を回避
- セキュリティヘッダーの追加が可能
- 環境による差異を最小化

### 案2: バックエンドのCORS設定を確認・修正
バックエンド（AWS Lambda）側で以下を確認：
- `https://portfolio-wise.com`がCORS許可リストに含まれているか
- `credentials: 'include'`に対応しているか（`Access-Control-Allow-Credentials: true`）

### 案3: デバッグ情報の追加
```javascript
// エラー時の詳細ログ追加
console.error('認証エラー詳細:', {
  endpoint: loginEndpoint,
  origin: window.location.origin,
  hostname: window.location.hostname,
  isProduction,
  awsApiBase: AWS_API_BASE,
  requestBody: { ...requestBody, credential: requestBody.credential ? '[HIDDEN]' : undefined }
});
```

## 実装した修正内容

### 1. 認証エンドポイントの統一（2025-07-01実装）

全ての認証関連エンドポイントをプロキシ経由に統一しました：

```javascript
// 変更前（本番環境で直接API呼び出し）
loginEndpoint = isProduction 
  ? `${AWS_API_BASE}/auth/google/login`
  : '/api-proxy/auth/google/login';

// 変更後（全環境でプロキシ使用）
loginEndpoint = '/api-proxy/auth/google/login';
```

#### 修正したエンドポイント：
- `/api-proxy/auth/google/login` - Google認証
- `/api-proxy/auth/session` - セッション確認
- `/api-proxy/auth/logout` - ログアウト
- `/api-proxy/auth/google/drive/initiate` - Drive API認証

### 2. デバッグログの強化

認証エラー時により詳細な情報を出力するように改善：

```javascript
console.error('認証エラー詳細:', {
  endpoint: loginEndpoint,
  origin: window.location.origin,
  hostname: window.location.hostname,
  isProduction,
  isDevelopment,
  awsApiBase: AWS_API_BASE,
  requestBody: { 
    ...requestBody, 
    credential: requestBody.credential ? '[HIDDEN - ' + requestBody.credential.length + ' chars]' : undefined,
    code: requestBody.code ? '[HIDDEN - ' + requestBody.code.length + ' chars]' : undefined
  }
});
```

### 3. 修正の利点

1. **CORS問題の回避**: Cloudflare Pagesのプロキシ機能によりCORS設定を適切に処理
2. **環境差異の解消**: 開発環境と本番環境で同じコードパスを使用
3. **セキュリティの向上**: プロキシ経由でセキュリティヘッダーを追加可能
4. **デバッグの容易化**: 問題発生時の原因特定が容易

## デプロイ手順

```bash
# 1. ビルド
cd frontend/webapp
npm run build

# 2. デプロイ
wrangler pages deploy build --project-name=pfwise-portfolio-manager

# 3. 本番環境で動作確認
# https://portfolio-wise.com/ にアクセスしてGoogle認証をテスト
```

## 緊急対応案

もし案1が動作しない場合、以下の確認を行う：

1. Cloudflare Pagesの環境変数確認
   - `REACT_APP_API_BASE_URL`が正しく設定されているか
   - Cloudflare Pagesダッシュボードで確認

2. functions/api-proxy/[[path]].jsの動作確認
   - 本番環境でプロキシが正しく動作しているか
   - エラーログの確認