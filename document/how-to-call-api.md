# ポートフォリオマネージャー マーケットデータAPI利用ガイド

このドキュメントは、フロントエンドエンジニア向けにマーケットデータAPIの利用方法を説明するものです。APIの基本的な使い方からエラーハンドリングまでをカバーしています。

## 1. APIの概要

このAPIは株式や投資信託などの市場データを取得するためのものです。米国株、日本株、投資信託、為替レートなど様々な金融商品の最新価格データを提供します。また、Google認証によるユーザー認証およびGoogle Driveとの連携機能も備えています。

**主な機能：**
- 米国株式データ取得
- 日本株式データ取得
- 投資信託データ取得
- 為替レート取得
- データキャッシング
- 使用量制限
- Google認証
- Google Driveデータ同期

**システム特長：**
- マルチレイヤーのデータ取得戦略（キャッシュ → API → スクレイピング → フォールバック）
- キャッシュを利用した高速なレスポンス
- 人気銘柄のキャッシュプリウォーミング（6時間ごと）
- 障害耐性の高い設計（データソース障害時も動作継続）
- AWS Lambda + DynamoDBによるスケーラブルな構成
- **APIキー認証によるセキュアなアクセス制御**
- **IP制限とレート制限による不正利用防止**
- **バッチ処理による複数銘柄・為替ペアの一括取得（AWS コスト最適化）**

## 2. 環境とエンドポイント

### 2.1 環境別URL

**開発環境（ローカル）**
```
http://localhost:3000/dev/api/market-data
```

**開発環境（AWS）**
```
https://[dev-api-id].execute-api.ap-northeast-1.amazonaws.com/dev/api/market-data
```

**本番環境**
```
https://[prod-api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data
```

※実際の`[dev-api-id]`と`[prod-api-id]`は、システム管理者にお問い合わせください。

### 2.2 API認証とセキュリティ

**認証方式：**
このAPIは2つの認証方法を提供しています：

1. **ユーザー認証** - Google OAuthを使用したユーザー認証（Cookieベースのセッション管理）
2. **APIキー認証** - 管理者エンドポイント用（AWS API Gatewayのx-api-key）

**APIキーの設定方法（管理者エンドポイントのみ）：**
```javascript
// リクエストヘッダーにAPIキーを含める
headers: {
  'x-api-key': 'your-api-key-here',
  'Content-Type': 'application/json'
}
```

**アクセス制限：**
- 公開エンドポイント: 認証不要（マーケットデータ、認証関連）
- Google Drive関連エンドポイント: Google OAuth認証必須
- 管理者エンドポイント: AWS API GatewayのAPIキー必須

### 2.3 エンドポイント一覧

#### 公開エンドポイント（認証不要）

```
# マーケットデータ取得 (GET)
GET /api/market-data

# Google認証処理 (POST)
POST /auth/google/login

# セッション情報取得 (GET)
GET /auth/session

# ログアウト処理 (POST)
POST /auth/logout

# Google Drive OAuth認証開始 (GET)
GET /auth/google/drive/initiate

# Google Drive OAuthコールバック (GET)
GET /auth/google/drive/callback
```

#### Google Drive連携エンドポイント（Google OAuth認証必須）

```
# ポートフォリオデータの保存 (POST)
POST /drive/save

# ポートフォリオデータの読み込み (GET)
GET /drive/load?fileId=[fileId]

# ファイル一覧の取得 (GET)
GET /drive/files
```

#### 管理者エンドポイント（AWS API Gateway APIキー必須）

```
# APIステータス確認 (GET)
GET /admin/status

# 使用量カウンターリセット (POST)
POST /admin/reset

# 予算ステータス取得 (GET)
GET /admin/getBudgetStatus
```

#### デバッグエンドポイント（開発環境のみ）

```
# Google OAuth設定確認 (GET)
GET /debug/google-config
```

**注意事項：**
- 管理者エンドポイントはAWS API Gatewayの`private: true`設定により保護されています
- APIキーは`x-api-key`ヘッダーで送信してください
- CORS設定により、許可されたオリジンからのみアクセス可能です

## 3. マーケットデータ取得API

### 3.1 基本的なリクエスト形式

```
# マーケットデータ取得 (GET)
GET /api/market-data
```

APIはHTTP GETリクエストで呼び出します。URLパラメータで取得対象を指定します。

**必須パラメータ：**
- `type`: データタイプ（`us-stock`, `jp-stock`, `mutual-fund`, `exchange-rate`のいずれか）
- `symbols`: 銘柄コードまたは通貨ペア（カンマ区切りで複数指定可能）

**オプションパラメータ：**
- `base`: 為替レートのベース通貨（デフォルト: `USD`）
- `target`: 為替レートの対象通貨（デフォルト: `JPY`）
- `refresh`: キャッシュを無視して最新データを取得する場合は`true`（デフォルト: `false`）

### 3.2 リクエスト例

#### 米国株データの取得（パブリックアクセス）
```javascript
// Axiosを使用した例（認証なし - 制限あり）
const fetchUSStocks = async (symbols) => {
  try {
    const response = await axios.get('[BASE_URL]/api/market-data', {
      params: {
        type: 'us-stock',
        symbols: symbols.join(',') // 例: 'AAPL,MSFT,GOOGL' - バッチ処理で効率化
      }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.error('レート制限に達しました。APIキーの使用を検討してください。');
    } else {
      console.error('API呼び出しエラー:', error);
    }
    return null;
  }
};

// 注意: 複数銘柄を取得する場合は、カンマ区切りで一括取得することを推奨
// 個別にAPIを呼び出すより、バッチ処理の方がAWSコストを大幅に削減できます
```

#### 米国株データの取得（APIキー使用）
```javascript
// APIキーを使用した例（高いレート制限）
const fetchUSStocksWithKey = async (symbols, apiKey) => {
  try {
    const response = await axios.get('[BASE_URL]/api/market-data', {
      params: {
        type: 'us-stock',
        symbols: symbols.join(',')
      },
      headers: {
        'X-API-Key': apiKey
      }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('APIキーが無効です');
    } else if (error.response?.status === 429) {
      console.error('レート制限に達しました');
    } else {
      console.error('API呼び出しエラー:', error);
    }
    return null;
  }
};
```

#### 日本株データの取得
```javascript
const fetchJPStocks = async (symbols) => {
  try {
    const response = await axios.get('https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data', {
      params: {
        type: 'jp-stock',
        symbols: symbols.join(',') // 例: '7203,9984,6758'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return null;
  }
};
```

#### 投資信託データの取得
```javascript
const fetchMutualFunds = async (symbols) => {
  try {
    const response = await axios.get('https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data', {
      params: {
        type: 'mutual-fund',
        symbols: symbols.join(',') // 例: '2931113C,0131103C'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return null;
  }
};
```

#### 為替レートの取得
```javascript
// 単一の為替レート取得
const fetchExchangeRate = async (base = 'USD', target = 'JPY') => {
  try {
    const response = await axios.get('https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data', {
      params: {
        type: 'exchange-rate',
        symbols: `${base}-${target}`,
        base,
        target
      }
    });
    return response.data;
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return null;
  }
};

// 複数の為替レートを一括取得（推奨）
const fetchMultipleExchangeRates = async (pairs) => {
  try {
    // 例: pairs = [['USD', 'JPY'], ['EUR', 'JPY'], ['GBP', 'JPY']]
    const symbols = pairs.map(([base, target]) => `${base}-${target}`).join(',');
    
    const response = await axios.get('https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data', {
      params: {
        type: 'exchange-rate',
        symbols: symbols // 例: 'USD-JPY,EUR-JPY,GBP-JPY'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return null;
  }
};
```

### 3.3 銘柄コードの形式

各市場の銘柄コードの形式は以下の通りです：

- **米国株**: アルファベット記号（例: `AAPL`, `MSFT`, `GOOGL`）
- **日本株**: 4桁の数字、オプションでサフィックス `.T`（例: `7203`, `9984`, `7203.T`）
- **投資信託**: 7-8桁の数字 + `C`、オプションでサフィックス `.T`（例: `2931113C`, `0131103C.T`）
- **為替レート**: ベース通貨と対象通貨をハイフンで結合（例: `USD-JPY`, `EUR-USD`）

### 3.4 レスポンス形式

#### 成功時のレスポンス
```json
{
  "success": true,
  "data": {
    "AAPL": {
      "ticker": "AAPL",
      "price": 188.42,
      "change": 1.25,
      "changePercent": 0.67,
      "name": "Apple Inc.",
      "currency": "USD",
      "lastUpdated": "2025-05-11T15:30:00.000Z",
      "source": "Yahoo Finance API",
      "isStock": true,
      "isMutualFund": false,
      "volume": 52387100,
      "marketCap": 2883765000000
    },
    "MSFT": {
      "ticker": "MSFT",
      "price": 425.52,
      "change": -2.48,
      "changePercent": -0.58,
      "name": "Microsoft Corporation",
      "currency": "USD",
      "lastUpdated": "2025-05-11T15:30:00.000Z",
      "source": "Yahoo Finance API",
      "isStock": true,
      "isMutualFund": false,
      "volume": 24567800,
      "marketCap": 3162840000000
    }
  },
  "source": "API",
  "lastUpdated": "2025-05-11T15:35:22.123Z",
  "processingTime": "523ms",
  "usage": {
    "daily": {
      "count": 125,
      "limit": 5000,
      "percentage": 2.5
    },
    "monthly": {
      "count": 2450,
      "limit": 100000,
      "percentage": 2.45
    }
  }
}
```

### 3.5 データソースと優先順位

APIは以下のデータソースから情報を取得します。優先順位順に試行され、上位のソースで失敗した場合は下位のソースにフォールバックします：

#### 米国株
1. **Yahoo Finance API** - 最も正確で高速なデータソース
2. **Yahoo Finance（スクレイピング）** - APIが失敗した場合のバックアップ
3. **MarketWatch（スクレイピング）** - 最後の手段
4. **フォールバックデータ** - すべてのソースが失敗した場合

#### 日本株
1. **Yahoo Finance Japan（スクレイピング）**
2. **Minkabu（スクレイピング）**
3. **Kabutan（スクレイピング）**
4. **フォールバックデータ**

#### 投資信託
1. **Morningstar CSV** - 公式データ
2. **フォールバックデータ**

#### 為替レート
1. **Exchangerate-host API**
2. **動的計算** - 基準レートをもとに計算
3. **ハードコード値** - 最終手段
4. **緊急フォールバック値**

## 4. 認証API

### Google認証 - クイックリファレンス

**サーバーが受け入れる認証形式:**

```javascript
// 形式1: Google One Tap（推奨）
POST /auth/google/login
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6I..." // IDトークン
}

// 形式2: OAuth Authorization Code Flow
POST /auth/google/login
{
  "code": "4/0AY0e-g7...",
  "redirectUri": "http://localhost:3001/auth/callback"
}
```

**重要なポイント:**
- ✅ `credential`フィールドにはIDトークンを送信
- ✅ `code`フィールドには認証コードを送信
- ❌ IDトークンを`code`フィールドに送信しない
- ❌ `credential`と`code`を同時に送信しない

### 4.1 Google認証プロセス

#### 4.1.1 Google認証の概要

**重要:** サーバーは2つの認証方法をサポートしています：

| 認証方式 | 送信フィールド | 内容 | リダイレクトURI |
|---------|--------------|------|----------------|
| **Google One Tap** | `credential` | IDトークン（JWT形式） | 不要 |
| **OAuth Authorization Code Flow** | `code` | 認証コード | 必要 |

**エンドポイント:**
```
POST /auth/google/login
```

**リクエスト形式:**
```javascript
// Google One Tapの場合
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6I..." // IDトークン
}

// OAuth Authorization Code Flowの場合
{
  "code": "4/0AY0e-g7...", // 認証コード
  "redirectUri": "http://localhost:3001/auth/callback"
}
```

#### 4.1.2 よくあるエラーと解決方法

| エラーメッセージ | 原因 | 解決方法 |
|---------------|------|---------|
| 認証コードが無効または期限切れです | IDトークンを`code`フィールドで送信 | `credential`フィールドを使用 |
| 認証情報が不足しています | `code`も`credential`も送信されていない | 適切なフィールドでトークンを送信 |
| リダイレクトURIが一致しません | OAuth flowでURIが不一致 | Google Consoleの設定を確認 |

#### 4.1.3 Google認証の初期化と実装

```javascript
// Google認証の初期化（React向け例）
// npm install @react-oauth/google
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const App = () => {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {/* アプリケーションコンポーネント */}
      <LoginComponent />
    </GoogleOAuthProvider>
  );
};

const LoginComponent = () => {
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      console.log('Google認証レスポンス:', credentialResponse);
      
      // Google One Tap (credential) または OAuth flow (code) に対応
      const payload = {};
      
      if (credentialResponse.credential) {
        // Google One Tap の場合
        console.log('One Tap認証を使用');
        payload.credential = credentialResponse.credential;
      } else if (credentialResponse.code) {
        // OAuth authorization code flow の場合
        console.log('OAuth Code Flow認証を使用');
        payload.code = credentialResponse.code;
        payload.redirectUri = window.location.origin + '/auth/callback';
      } else {
        console.error('認証レスポンスにcredentialもcodeも含まれていません');
        return;
      }
      
      const response = await axios.post(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/google/login',
        payload,
        {
          withCredentials: true // Cookieを送受信するために必要
        }
      );
      
      if (response.data.success) {
        // ログイン成功処理
        console.log('認証成功:', response.data.user);
        // ユーザー情報の保存やリダイレクト処理
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      // エラーレスポンスの詳細を確認
      if (error.response) {
        console.error('エラーステータス:', error.response.status);
        console.error('エラーデータ:', error.response.data);
      }
    }
  };
  
  return (
    <div>
      <h2>Googleアカウントでログイン</h2>
      <GoogleLogin
        flow="auth-code" // OAuth flowを使用する場合は "auth-code"、One Tapのみの場合は省略可
        onSuccess={handleGoogleLogin}
        onError={() => console.error('ログイン失敗')}
        useOneTap
      />
    </div>
  );
};
```

#### 4.1.4 認証トラブルシューティング

##### デバッグ用コード例

```javascript
// 認証レスポンスの詳細を確認するデバッグ関数
const debugGoogleResponse = (credentialResponse) => {
  console.log('=== Google認証デバッグ情報 ===');
  console.log('レスポンス全体:', credentialResponse);
  console.log('credential存在:', !!credentialResponse.credential);
  console.log('code存在:', !!credentialResponse.code);
  console.log('clientId:', credentialResponse.clientId);
  console.log('select_by:', credentialResponse.select_by);
  
  if (credentialResponse.credential) {
    // JWTトークンのヘッダー部分をデコード（デバッグ用）
    const [header] = credentialResponse.credential.split('.');
    try {
      const decodedHeader = JSON.parse(atob(header));
      console.log('トークンヘッダー:', decodedHeader);
    } catch (e) {
      console.error('トークンデコードエラー:', e);
    }
  }
};

// 使用例
const handleGoogleLogin = async (credentialResponse) => {
  debugGoogleResponse(credentialResponse); // デバッグ情報を出力
  // ... 既存の処理
};
```

##### よくある問題と解決策

1. **「認証コードが無効」エラーが発生する場合**

```javascript
// ❌ 間違った実装例
const payload = {
  code: credentialResponse.credential, // IDトークンをcodeとして送信
  redirectUri: "..."
};

// ✅ 正しい実装例
const payload = {
  credential: credentialResponse.credential // credentialフィールドを使用
};
```

2. **Google One TapとOAuth Flowの判別**

```javascript
// 認証タイプを自動判別する関数
const getAuthPayload = (credentialResponse) => {
  if (credentialResponse.credential) {
    // One Tapの場合
    return { 
      type: 'one-tap',
      payload: { credential: credentialResponse.credential }
    };
  } else if (credentialResponse.code) {
    // OAuth Flowの場合
    return { 
      type: 'oauth',
      payload: { 
        code: credentialResponse.code,
        redirectUri: window.location.origin + '/auth/callback'
      }
    };
  }
  throw new Error('認証レスポンスが無効です');
};
```

3. **サーバー側の期待値を確認**

サーバーは以下の形式を期待しています：
- **Content-Type**: `application/json`
- **認証データ**: `credential`または`code`フィールド（両方同時は不可）
- **Cookie設定**: `withCredentials: true`必須

#### 4.1.5 セッション確認

```javascript
const checkSession = async () => {
  try {
    const response = await axios.get(
      'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/session',
      { withCredentials: true }
    );
    
    if (response.data.success && response.data.isAuthenticated) {
      console.log('認証済みユーザー:', response.data.user);
      return response.data.user;
    } else {
      console.log('未認証状態');
      return null;
    }
  } catch (error) {
    console.error('セッション確認エラー:', error);
    return null;
  }
};
```

#### 4.1.3 ログアウト処理

```javascript
const handleLogout = async () => {
  try {
    const response = await axios.post(
      'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/logout',
      {},
      { withCredentials: true }
    );
    
    if (response.data.success) {
      console.log('ログアウト成功');
      // ログアウト後の処理（ローカルストレージのクリアなど）
      return true;
    }
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
  return false;
};
```

### 4.2 完全な認証実装例

```javascript
// 完全な認証実装（エラーハンドリング込み）
import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const API_BASE_URL = 'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod';

const LoginComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError(null);
    
    try {
      // レスポンスタイプを判定
      const payload = {};
      let authType = '';
      
      if (credentialResponse.credential) {
        // Google One Tap認証
        authType = 'Google One Tap';
        payload.credential = credentialResponse.credential;
        console.log('認証タイプ: Google One Tap');
      } else if (credentialResponse.code) {
        // OAuth Authorization Code Flow
        authType = 'OAuth Code Flow';
        payload.code = credentialResponse.code;
        payload.redirectUri = window.location.origin + '/auth/callback';
        console.log('認証タイプ: OAuth Code Flow');
      } else {
        throw new Error('認証レスポンスが無効です');
      }
      
      // APIリクエスト
      console.log('送信するペイロード:', payload);
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/google/login`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true // Cookie設定に必須
        }
      );
      
      if (response.data.success) {
        console.log('認証成功！', response.data.user);
        // 成功時の処理（リダイレクトなど）
        window.location.href = '/dashboard';
      } else {
        throw new Error(response.data.message || '認証に失敗しました');
      }
      
    } catch (error) {
      console.error('認証エラー:', error);
      
      // エラータイプの判定
      if (error.response) {
        // サーバーエラーレスポンス
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            if (data.error?.message?.includes('認証コードが無効')) {
              setError('認証形式が間違っています。credentialフィールドを使用してください。');
            } else {
              setError(data.error?.message || 'リクエストが無効です');
            }
            break;
          case 401:
            setError('認証に失敗しました');
            break;
          case 500:
            setError('サーバーエラーが発生しました');
            break;
          default:
            setError(`エラー: ${status}`);
        }
      } else if (error.request) {
        // ネットワークエラー
        setError('ネットワークエラー: サーバーに接続できません');
      } else {
        // その他のエラー
        setError(error.message || '不明なエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2>Googleアカウントでログイン</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          エラー: {error}
        </div>
      )}
      
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={(error) => {
          console.error('Google認証エラー:', error);
          setError('Google認証に失敗しました');
        }}
        useOneTap
        disabled={loading}
      />
      
      {loading && <p>認証処理中...</p>}
    </div>
  );
};

// アプリケーション全体をプロバイダーでラップ
const App = () => {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <LoginComponent />
    </GoogleOAuthProvider>
  );
};

export default App;
```

### 4.3 認証APIレスポンス形式

#### 4.2.1 ログイン成功時

```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "109476395873295845628",
    "email": "user@example.com",
    "name": "サンプルユーザー",
    "picture": "https://lh3.googleusercontent.com/a/..."
  },
  "session": {
    "expiresAt": "2025-05-18T12:34:56.789Z"
  }
}
```

#### 4.2.2 セッション確認時

```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "109476395873295845628",
    "email": "user@example.com",
    "name": "サンプルユーザー",
    "picture": "https://lh3.googleusercontent.com/a/..."
  },
  "session": {
    "expiresAt": "2025-05-18T12:34:56.789Z"
  }
}
```

#### 4.2.3 ログアウト成功時

```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

## 5. Google Drive連携API

**重要：** Google Drive連携機能にはGoogle OAuth認証が必要です。

### 5.1 ポートフォリオデータの保存

```javascript
const savePortfolioToGoogleDrive = async (portfolioData) => {
  try {
    const response = await axios.post(
      '[BASE_URL]/drive/save',
      {
        portfolioData: portfolioData
      },
      { 
        withCredentials: true
      }
    );
    
    if (response.data.success) {
      console.log('Google Driveに保存成功:', response.data.file);
      return response.data.file;
    }
  } catch (error) {
    console.error('Google Drive保存エラー:', error);
    if (error.response && error.response.status === 401) {
      // 認証エラーの処理（ログイン画面への遷移など）
    }
  }
  return null;
};
```

### 5.2 ポートフォリオデータの読み込み

```javascript
const loadPortfolioFromGoogleDrive = async (fileId, apiKey) => {
  try {
    const response = await axios.get(
      '[BASE_URL]/drive/load',
      {
        params: { fileId },
        withCredentials: true,
        headers: {
          'X-API-Key': apiKey
        }
      }
    );
    
    if (response.data.success) {
      console.log('Google Driveから読み込み成功:', response.data.file);
      return response.data.data; // ポートフォリオデータ
    }
  } catch (error) {
    console.error('Google Drive読み込みエラー:', error);
    if (error.response && error.response.status === 401) {
      // 認証エラーの処理
    }
  }
  return null;
};
```

### 5.3 ファイル一覧の取得

```javascript
const listGoogleDriveFiles = async (apiKey) => {
  try {
    const response = await axios.get(
      '[BASE_URL]/drive/files',
      { 
        withCredentials: true,
        headers: {
          'X-API-Key': apiKey
        }
      }
    );
    
    if (response.data.success) {
      console.log('Google Driveファイル一覧取得成功:', response.data.files);
      return response.data.files;
    }
  } catch (error) {
    console.error('Google Driveファイル一覧取得エラー:', error);
    if (error.response && error.response.status === 401) {
      // 認証エラーの処理
    }
  }
  return [];
};
```

### 5.4 Google Drive連携APIレスポンス形式

#### 5.4.1 ファイル保存成功時

```json
{
  "success": true,
  "message": "ポートフォリオデータをGoogle Driveに保存しました",
  "file": {
    "id": "1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s",
    "name": "portfolio-data-2025-05-11T12-34-56-789Z.json",
    "url": "https://drive.google.com/file/d/1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s/view",
    "createdAt": "2025-05-11T12:34:56.789Z"
  }
}
```

#### 5.4.2 ファイル読み込み成功時

```json
{
  "success": true,
  "message": "ポートフォリオデータをGoogle Driveから読み込みました",
  "file": {
    "name": "portfolio-data-2025-05-10T15-22-33-456Z.json",
    "createdAt": "2025-05-10T15:22:33.456Z",
    "modifiedAt": "2025-05-10T15:22:33.456Z"
  },
  "data": {
    "name": "マイポートフォリオ",
    "holdings": [
      {
        "ticker": "AAPL",
        "shares": 10,
        "costBasis": 150.25
      },
      {
        "ticker": "7203.T",
        "shares": 100,
        "costBasis": 2100
      }
    ],
    "createdAt": "2025-05-10T15:22:33.456Z"
  }
}
```

#### 5.4.3 ファイル一覧取得成功時

```json
{
  "success": true,
  "files": [
    {
      "id": "1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s",
      "name": "portfolio-data-2025-05-11T12-34-56-789Z.json",
      "size": 1024,
      "mimeType": "application/json",
      "createdAt": "2025-05-11T12:34:56.789Z",
      "modifiedAt": "2025-05-11T12:34:56.789Z",
      "webViewLink": "https://drive.google.com/file/d/1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s/view"
    },
    {
      "id": "2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw",
      "name": "portfolio-data-2025-05-10T15-22-33-456Z.json",
      "size": 980,
      "mimeType": "application/json",
      "createdAt": "2025-05-10T15:22:33.456Z",
      "modifiedAt": "2025-05-10T15:22:33.456Z",
      "webViewLink": "https://drive.google.com/file/d/2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw/view"
    }
  ],
  "count": 2
}
```

## 6. エラーハンドリング

### 6.1 基本的なエラーハンドリング

```javascript
const fetchMarketData = async (type, symbols) => {
  try {
    const response = await axios.get('https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data', {
      params: { type, symbols }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.error('APIエラー:', response.data.error);
      return null;
    }
  } catch (error) {
    // ネットワークエラーや5xx系エラー
    if (error.response) {
      // サーバーからレスポンスがあった場合
      console.error('APIエラーレスポンス:', error.response.status, error.response.data);
      
      // エラーコードに応じた処理
      if (error.response.status === 429) {
        console.warn('API使用量制限に達しました');
        // 使用量制限エラー処理
      } else if (error.response.status === 400) {
        console.error('リクエストパラメータが無効です:', error.response.data);
        // パラメータエラー処理
      } else if (error.response.status >= 500) {
        console.error('サーバーエラーが発生しました');
        // サーバーエラー処理
      }
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない場合
      console.error('APIレスポンスなし:', error.request);
      // タイムアウトやネットワークエラー処理
    } else {
      // リクエスト設定エラー
      console.error('APIリクエストエラー:', error.message);
    }
    return null;
  }
};
```

### 6.2 認証エラーの処理

```javascript
const handleApiRequest = async (url, method = 'get', data = null, params = null) => {
  try {
    const config = {
      withCredentials: true
    };
    
    if (params) {
      config.params = params;
    }
    
    let response;
    if (method === 'get') {
      response = await axios.get(url, config);
    } else {
      response = await axios.post(url, data, config);
    }
    
    return response.data;
  } catch (error) {
    // 認証エラー（401）の場合の処理
    if (error.response && error.response.status === 401) {
      console.error('認証エラー - APIキーが無効またはログインが必要です');
      
      // ログイン状態をクリア
      localStorage.removeItem('user');
      
      // 未認証状態を通知
      if (typeof onAuthChange === 'function') {
        onAuthChange(false);
      }
      
      return { success: false, error: 'APIキーが無効またはログインが必要です' };
    }
    
    // レート制限エラー（429）の場合の処理
    if (error.response && error.response.status === 429) {
      console.error('レート制限に達しました');
      return { success: false, error: 'レート制限に達しました。しばらく時間をおいてからお試しください。' };
    }
    
    // その他のエラー処理
    console.error('APIエラー:', error);
    return { success: false, error: error.message };
  }
};
```

### 6.3 使用量制限とエラーハンドリング

システムには以下の使用量制限が設定されています：

- **日次制限**: 5,000リクエスト/日（デフォルト）
- **月次制限**: 100,000リクエスト/月（デフォルト）

制限に達した場合は`429 Too Many Requests`エラーが返されます。

```javascript
const fetchStockDataWithRateLimitHandling = async (ticker, apiKey = null) => {
  try {
    const config = {
      params: { 
        type: 'us-stock', 
        symbols: ticker 
      }
    };
    
    // APIキーがある場合はヘッダーに追加
    if (apiKey) {
      config.headers = { 'X-API-Key': apiKey };
    }
    
    const response = await axios.get('[BASE_URL]/api/market-data', config);
    return response.data;
  } catch (error) {
    // レート制限エラーの処理
    if (error.response && error.response.status === 429) {
      if (!apiKey) {
        console.warn('パブリックAPIの制限に達しました。APIキーの使用をご検討ください。');
      } else {
        console.warn('APIキーの制限に達しました。しばらく時間をおいてからお試しください。');
      }
      
      // クライアント側でフォールバックデータを提供
      return {
        success: true,
        data: {
          [ticker]: {
            ticker: ticker,
            price: 100, // デフォルト値
            name: ticker,
            currency: 'USD',
            lastUpdated: new Date().toISOString(),
            source: 'Client Fallback',
            isStock: true,
            isMutualFund: false
          }
        }
      };
    }
    
    // その他のエラー処理
    console.error('APIエラー:', error);
    throw error;
  }
};
```

### 6.4 エラーレスポンス形式

APIが返すエラーレスポンスの形式は以下の通りです：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMS",
    "message": "銘柄コードが無効です"
  }
}
```

主なエラーコード一覧：

**認証・セキュリティ関連：**
- `MISSING_API_KEY`: APIキーが必要です
- `INVALID_API_KEY`: APIキーが無効です
- `RATE_LIMIT_EXCEEDED`: レート制限に達しました
- `IP_BLOCKED`: IPアドレスがブラックリストに登録されています
- `ADMIN_IP_RESTRICTED`: 管理者機能は許可されたIPからのみアクセス可能です
- `SUSPICIOUS_ACTIVITY`: 疑わしいアクセスパターンが検出されました

**一般的なエラー：**
- `INVALID_PARAMS`: リクエストパラメータが無効
- `SOURCE_ERROR`: データソースからのデータ取得に失敗
- `NOT_FOUND`: 要求されたリソースが見つからない
- `SERVER_ERROR`: サーバー内部エラー
- `AUTH_ERROR`: 認証エラー
- `NO_SESSION`: セッションが存在しない
- `DRIVE_ERROR`: Google Drive操作エラー
- `DATA_SOURCE_ERROR`: データソースエラー
- `BLACKLISTED`: スクレイピングブラックリスト登録済み
- `DATA_VALIDATION_ERROR`: データ検証エラー

## 7. React用ユーティリティフック

### 7.1 認証フック

```javascript
// useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// 認証コンテキストの作成
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // セッション確認
  const checkSession = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/session',
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.isAuthenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  // ログアウト処理
  const logout = async () => {
    try {
      await axios.post(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/logout',
        {},
        { withCredentials: true }
      );
      setUser(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };
  
  // Googleログイン処理
  const loginWithGoogle = async (credentialResponse) => {
    try {
      const response = await axios.post(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/auth/google/login',
        {
          code: credentialResponse.code,
          redirectUri: window.location.origin + '/auth/callback'
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
    }
    return false;
  };
  
  // 初回マウント時にセッション確認
  useEffect(() => {
    checkSession();
  }, []);
  
  // 提供する値
  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    loginWithGoogle,
    logout,
    checkSession
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// カスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};
```

### 7.2 Google Drive連携フック

```javascript
// useGoogleDrive.js
import { useState } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

export const useGoogleDrive = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ファイル一覧取得
  const listFiles = async () => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/drive/files',
        { withCredentials: true }
      );
      
      if (response.data.success) {
        return response.data.files;
      } else {
        setError(response.data.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル一覧取得エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // ファイル保存
  const saveFile = async (portfolioData) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/drive/save',
        { portfolioData },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        return response.data.file;
      } else {
        setError(response.data.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル保存エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // ファイル読み込み
  const loadFile = async (fileId) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/drive/load',
        {
          params: { fileId },
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        setError(response.data.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル読み込みエラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    listFiles,
    saveFile,
    loadFile,
    loading,
    error
  };
};
```

### 7.3 マーケットデータフック

```javascript
// useMarketData.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useMarketData = (type, symbols, refreshInterval = 0) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    if (!symbols) return;
    
    try {
      setLoading(true);
      
      const endpoint = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/dev/api/market-data'
        : 'https://[api-id].execute-api.ap-northeast-1.amazonaws.com/prod/api/market-data';
      
      const response = await axios.get(endpoint, {
        params: { 
          type, 
          symbols: Array.isArray(symbols) ? symbols.join(',') : symbols 
        }
      });
      
      if (response.data.success) {
        setData(response.data.data);
        setError(null);
      } else {
        setError(response.data.error || '不明なエラー');
      }
    } catch (err) {
      setError(err.message || 'APIエラー');
    } finally {
      setLoading(false);
    }
  }, [type, symbols]);
  
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    
    const runFetchData = async () => {
      await fetchData();
      if (!isMounted) return;
      
      // 定期的な更新が必要な場合
      if (refreshInterval > 0) {
        intervalId = setInterval(fetchData, refreshInterval);
      }
    };
    
    runFetchData();
    
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchData, refreshInterval]);
  
  return { data, loading, error, refetch: fetchData };
};
```

## 8. コンポーネント使用例

### 8.1 Google認証ボタンの実装

```jsx
// LoginPage.jsx
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const success = await loginWithGoogle(credentialResponse);
    if (success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="login-container">
      <h1>ポートフォリオマネージャー</h1>
      <p>Googleアカウントでログインして全ての機能を利用しましょう</p>
      
      <div className="login-buttons">
        <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
          <GoogleLogin
            flow="auth-code"
            onSuccess={handleGoogleLoginSuccess}
            onError={() => console.error('ログイン失敗')}
            useOneTap
            shape="pill"
            theme="filled_blue"
            text="continue_with"
          />
        </GoogleOAuthProvider>
      </div>
    </div>
  );
};

export default LoginPage;
```

### 8.2 Google Driveファイル一覧の表示

```jsx
// GoogleDriveFiles.jsx
import React, { useEffect, useState } from 'react';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useAuth } from '../hooks/useAuth';

const GoogleDriveFiles = ({ onFileSelect }) => {
  const { isAuthenticated } = useAuth();
  const { listFiles, loadFile, loading, error } = useGoogleDrive();
  const [files, setFiles] = useState([]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated]);
  
  const fetchFiles = async () => {
    const filesList = await listFiles();
    if (filesList) {
      setFiles(filesList);
    }
  };
  
  const handleFileSelect = async (fileId) => {
    const data = await loadFile(fileId);
    if (data && onFileSelect) {
      onFileSelect(data);
    }
  };
  
  if (!isAuthenticated) {
    return <p>ファイル一覧を表示するにはログインしてください</p>;
  }
  
  if (loading) {
    return <p>ファイル一覧を読み込み中...</p>;
  }
  
  if (error) {
    return <p>エラー: {error}</p>;
  }
  
  return (
    <div className="drive-files">
      <h2>Google Driveのポートフォリオデータ</h2>
      {files.length === 0 ? (
        <p>保存されたファイルがありません</p>
      ) : (
        <ul className="file-list">
          {files.map(file => (
            <li key={file.id} className="file-item">
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-date">
                  {new Date(file.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="file-actions">
                <button
                  onClick={() => handleFileSelect(file.id)}
                  className="btn btn-primary"
                >
                  読み込む
                </button>
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  表示
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button onClick={fetchFiles} className="btn btn-refresh">
        更新
      </button>
    </div>
  );
};

export default GoogleDriveFiles;
```

### 8.3 ポートフォリオデータ保存ボタン

```jsx
// SavePortfolioButton.jsx
import React, { useState } from 'react';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useAuth } from '../hooks/useAuth';

const SavePortfolioButton = ({ portfolioData }) => {
  const { isAuthenticated, user } = useAuth();
  const { saveFile, loading, error } = useGoogleDrive();
  const [saveStatus, setSaveStatus] = useState(null);
  
  const handleSave = async () => {
    if (!isAuthenticated) {
      setSaveStatus({
        success: false,
        message: 'Google Driveに保存するにはログインしてください'
      });
      return;
    }
    
    if (!portfolioData) {
      setSaveStatus({
        success: false,
        message: '保存するデータがありません'
      });
      return;
    }
    
    // タイムスタンプとユーザー情報を追加
    const dataToSave = {
      ...portfolioData,
      lastSaved: new Date().toISOString(),
      savedBy: user ? {
        email: user.email,
        name: user.name
      } : 'unknown'
    };
    
    const result = await saveFile(dataToSave);
    
    if (result) {
      setSaveStatus({
        success: true,
        message: 'ポートフォリオデータをGoogle Driveに保存しました',
        file: result
      });
    } else {
      setSaveStatus({
        success: false,
        message: error || 'Google Driveへの保存に失敗しました'
      });
    }
  };
  
  return (
    <div className="save-portfolio">
      <button
        onClick={handleSave}
        disabled={loading || !isAuthenticated}
        className={`btn ${isAuthenticated ? 'btn-primary' : 'btn-secondary'}`}
      >
        {loading ? '保存中...' : 'Google Driveに保存'}
      </button>
      
      {saveStatus && (
        <div className={`save-status ${saveStatus.success ? 'success' : 'error'}`}>
          <p>{saveStatus.message}</p>
          {saveStatus.success && saveStatus.file && (
            <a
              href={saveStatus.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="view-file"
            >
              保存したファイルを表示
            </a>
          )}
        </div>
      )}
      
      {!isAuthenticated && (
        <p className="login-prompt">
          Google Driveに保存するには、ログインしてください。
        </p>
      )}
    </div>
  );
};

export default SavePortfolioButton;
```

## 9. CORS対応と認証関連の注意点

### 9.1 CORS設定

認証でCookieを使用するため、APIとフロントエンドのCORS設定が重要です。

```javascript
// axiosのデフォルト設定を変更
axios.defaults.withCredentials = true;

// または個別のリクエストで設定
const response = await axios.get(url, { withCredentials: true });
```

フロントエンドのオリジンがバックエンドのCORS許可リストに含まれていることを確認してください。APIの実装では、以下のヘッダーが適切に設定されています：

```
Access-Control-Allow-Origin: [フロントエンドのオリジン]
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 9.2 Cookieの扱い

- セッションCookieはHTTP Onlyフラグが設定されているため、JavaScriptから直接アクセスできません
- 認証関連の全てのAPIリクエストには `withCredentials: true` を設定してください
- SPAの場合、ルーティングによってCookieのパスが問題になる場合があります（Path: `/`で設定されていることを確認）
- セッションCookieの有効期間はデフォルトで7日間です（`SESSION_EXPIRES_DAYS`環境変数で調整可能）

### 9.3 セキュリティのベストプラクティス

- Google Client IDは公開情報ですが、クライアントシークレットは厳重に保護してください
- 認証状態の確認は定期的に行い、無効なセッションでのAPI呼び出しを防止してください
- ログイン状態の永続化にはCookieのみを使用し、LocalStorageには機密情報を保存しないでください
- 管理者用API呼び出しにはx-api-keyヘッダーが必要です。このキーは安全に管理してください

## 10. 応用例：認証と市場データの連携

### 10.1 認証済みユーザー向けの拡張機能

```jsx
// PortfolioPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMarketData } from '../hooks/useMarketData';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import GoogleDriveFiles from '../components/GoogleDriveFiles';
import SavePortfolioButton from '../components/SavePortfolioButton';

const PortfolioPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { listFiles, loadFile, saveFile } = useGoogleDrive();
  const [portfolio, setPortfolio] = useState(null);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  
  // 選択された銘柄の市場データを取得
  const { data: marketData, loading: marketLoading } = useMarketData(
    'us-stock',
    selectedSymbols.join(','),
    isAuthenticated ? 60000 : 300000 // 認証済みユーザーはより頻繁に更新
  );
  
  // ポートフォリオからシンボルを抽出
  useEffect(() => {
    if (portfolio && portfolio.holdings) {
      const symbols = portfolio.holdings.map(holding => holding.ticker);
      setSelectedSymbols(symbols);
    }
  }, [portfolio]);
  
  // ポートフォリオデータの読み込み
  const handleFileSelect = (data) => {
    setPortfolio(data);
  };
  
  // ポートフォリオの現在価値を計算
  const calculatePortfolioValue = () => {
    if (!portfolio || !marketData) return 0;
    
    return portfolio.holdings.reduce((total, holding) => {
      const marketInfo = marketData[holding.ticker];
      if (marketInfo) {
        return total + (holding.shares * marketInfo.price);
      }
      return total;
    }, 0);
  };
  
  return (
    <div className="portfolio-page">
      <h1>マイポートフォリオ</h1>
      
      {isAuthenticated ? (
        <>
          <div className="user-info">
            <img src={user.picture} alt={user.name} className="user-avatar" />
            <span className="user-name">こんにちは、{user.name}さん</span>
          </div>
          
          <div className="portfolio-tools">
            <GoogleDriveFiles onFileSelect={handleFileSelect} />
            
            {portfolio && (
              <>
                <div className="portfolio-summary">
                  <h2>{portfolio.name || 'マイポートフォリオ'}</h2>
                  <p className="portfolio-value">
                    総資産価値: ${calculatePortfolioValue().toLocaleString()}
                  </p>
                  
                  <table className="holdings-table">
                    <thead>
                      <tr>
                        <th>銘柄</th>
                        <th>数量</th>
                        <th>現在価格</th>
                        <th>評価額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map(holding => {
                        const marketInfo = marketData && marketData[holding.ticker];
                        return (
                          <tr key={holding.ticker}>
                            <td>{holding.ticker}</td>
                            <td>{holding.shares}</td>
                            <td>
                              {marketInfo ? 
                                `$${marketInfo.price.toLocaleString()}` : 
                                '読み込み中...'}
                            </td>
                            <td>
                              {marketInfo ?
                                `$${(holding.shares * marketInfo.price).toLocaleString()}` :
                                '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <SavePortfolioButton portfolioData={portfolio} />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="login-prompt">
          <p>ポートフォリオの管理にはログインが必要です。</p>
          <a href="/login" className="btn btn-primary">ログインする</a>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
```

### 10.2 システム実装上の注意点

1. **運用時のデータソース優先順位**  
   ソースコードでは各データタイプに対して複数のデータソースが定義されており、優先順位によって順番に試行されます。これは`constants.js`の`DATA_SOURCES`オブジェクトで管理されています。システム運用中にデータソースの信頼性や応答速度に変化があった場合、この優先順位は動的に調整されます。

2. **キャッシュ管理**  
   システムは自動的にキャッシュのプリウォーミングを行い、人気銘柄のデータをあらかじめキャッシュに保存します。この銘柄リストは`constants.js`の`PREWARM_SYMBOLS`で定義されています。実運用環境のパフォーマンスを最適化するためには、このリストを定期的に見直し、最もアクセス頻度の高い銘柄を含めるようにしてください。

3. **AWS無料枠の制限対応**  
   AWS Free Tierの上限に近づくと、システムはより保守的な動作モードに移行します。Budget StatusがCRITICALになると、キャッシュの強制リフレッシュリクエスト（`refresh=true`）が拒否されるなど、コスト削減対策が自動的に適用されます。

5. **AWS コスト最適化の実装**
   - **バッチ処理の活用**: 複数銘柄や為替ペアを取得する場合は、必ずカンマ区切りで一括取得してください。個別のAPI呼び出しと比較して、DynamoDBアクセスを70-80%削減できます。
   - **キャッシュ時間の統一**: 全てのデータタイプのキャッシュ時間は1時間に統一されています。
   - **スケジュール実行の最適化**: キャッシュウォーミングは6時間ごとに実行されます（以前は1時間ごと）。
   - **ログレベルの最適化**: 本番環境ではWARNレベル以上のログのみ記録され、CloudWatch Logsのコストを削減しています。

4. **エラー監視**  
   システムは自動的にデータ取得の失敗や異常値を検出し、特定の閾値を超えた場合にはアラートを送信します。特に注意すべき重要なエラーが発生した場合は管理者に通知されます。

---

このガイドはポートフォリオマネージャーマーケットデータAPIの基本的な使用方法を説明しています。より詳細な情報やサポートが必要な場合は、システム管理者にお問い合わせください。

