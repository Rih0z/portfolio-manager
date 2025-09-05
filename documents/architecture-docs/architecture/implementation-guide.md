# PortfolioWise 実装ガイド

## 1. 開発環境セットアップ

### 1.1 必要な前提条件
```bash
# 必要なツール
- Node.js v18.x 以上
- npm v8.x 以上
- AWS CLI v2
- Serverless Framework v3.32.2
- Git
- Wrangler CLI (Cloudflare Pages用)
```

### 1.2 初期セットアップ手順

#### フロントエンド
```bash
# リポジトリクローン
git clone git@github.com:Rih0z/portfolio-manager.git
cd portfolio-manager/frontend/webapp

# 依存関係インストール
npm install --legacy-peer-deps

# 環境変数設定
cp .env.example .env.development
# .env.developmentを編集してAPI URLを設定

# 開発サーバー起動
npm start
```

#### バックエンド
```bash
cd backend

# 依存関係インストール
npm install

# AWS認証情報設定
aws configure --profile pfwise

# ローカルDynamoDB起動
npm run dynamodb:start

# Serverless Offline起動
npm run dev
```

## 2. コーディング規約

### 2.1 ファイル命名規則
```
コンポーネント: PascalCase    例: MarketDataCard.jsx
サービス: camelCase         例: marketDataService.js
ユーティリティ: camelCase    例: formatCurrency.js
定数: UPPER_SNAKE_CASE      例: API_ENDPOINTS.js
```

### 2.2 コンポーネント構造
```jsx
// 推奨コンポーネント構造
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

// Atlassianコンポーネントインポート
import { Button, Card } from '../atlassian';

// カスタムフック
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

// スタイル
import './ComponentName.css'; // 必要な場合のみ

const ComponentName = ({ prop1, prop2 }) => {
  // i18n
  const { t } = useTranslation();
  
  // Context
  const { portfolio } = usePortfolioContext();
  
  // State
  const [localState, setLocalState] = useState(null);
  
  // Effects
  useEffect(() => {
    // 副作用処理
  }, [dependency]);
  
  // Event Handlers
  const handleClick = () => {
    // 処理
  };
  
  // Render Helpers
  const renderContent = () => {
    return <div>{/* content */}</div>;
  };
  
  // Main Render
  return (
    <Card>
      {renderContent()}
    </Card>
  );
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number
};

ComponentName.defaultProps = {
  prop2: 0
};

export default ComponentName;
```

### 2.3 API呼び出しパターン
```javascript
// services/marketDataService.js パターン
export const fetchMarketData = async (symbols, options = {}) => {
  try {
    // 1. 入力検証
    if (!symbols || symbols.length === 0) {
      throw new Error('Symbols are required');
    }
    
    // 2. API呼び出し（リトライ付き）
    const response = await apiClient.get('/market-data', {
      params: { symbols: symbols.join(',') },
      ...options
    });
    
    // 3. レスポンス処理
    return processMarketDataResponse(response.data);
    
  } catch (error) {
    // 4. エラーハンドリング
    console.error('Market data fetch failed:', error);
    
    // 5. フォールバック
    return getFallbackData(symbols);
  }
};
```

## 3. 状態管理パターン

### 3.1 Context API使用方法
```jsx
// context/PortfolioContext.jsx
export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ポートフォリオ更新関数
  const updatePortfolio = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.updatePortfolio(data);
      setPortfolio(result);
      
      // LocalStorageにも保存
      localStorage.setItem('portfolio', JSON.stringify(result));
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const value = useMemo(() => ({
    portfolio,
    loading,
    error,
    updatePortfolio,
    // その他の関数...
  }), [portfolio, loading, error]);
  
  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
```

### 3.2 カスタムフック
```javascript
// hooks/useMarketData.js
export const useMarketData = (symbols) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!symbols || symbols.length === 0) return;
    
    let cancelled = false;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await marketDataService.fetchMarketData(symbols);
        
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // クリーンアップ
    return () => {
      cancelled = true;
    };
  }, [symbols]);
  
  return { data, loading, error, refetch: fetchData };
};
```

## 4. バックエンド実装パターン

### 4.1 Lambda関数テンプレート
```javascript
// function/functionName.js
const { createResponse, createErrorResponse } = require('../utils/responseUtils');
const { validateRequest } = require('../middleware/validation');
const { withAuth } = require('../middleware/auth');

const handler = async (event, context) => {
  try {
    // 1. リクエスト検証
    const { error, value } = validateRequest(event);
    if (error) {
      return createErrorResponse(400, error.message);
    }
    
    // 2. ビジネスロジック実行
    const result = await processBusinessLogic(value);
    
    // 3. 成功レスポンス
    return createResponse(200, result);
    
  } catch (error) {
    // 4. エラーハンドリング
    console.error('Function error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

// 認証ミドルウェア適用（必要な場合）
module.exports.handler = withAuth(handler);
```

### 4.2 キャッシング戦略
```javascript
// services/cache.js
const getCachedData = async (key, ttl = 3600) => {
  try {
    // 1. DynamoDBからキャッシュ取得
    const cached = await dynamodb.get({
      TableName: CACHE_TABLE,
      Key: { cacheKey: key }
    }).promise();
    
    // 2. TTL確認
    if (cached.Item && cached.Item.ttl > Date.now() / 1000) {
      return cached.Item.data;
    }
    
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

const setCachedData = async (key, data, ttl = 3600) => {
  try {
    await dynamodb.put({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey: key,
        data: data,
        ttl: Math.floor(Date.now() / 1000) + ttl,
        createdAt: new Date().toISOString()
      }
    }).promise();
  } catch (error) {
    console.error('Cache write error:', error);
    // キャッシュ書き込み失敗は無視（処理は継続）
  }
};
```

## 5. テスト実装

### 5.1 ユニットテスト
```javascript
// __tests__/unit/components/MarketDataCard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketDataCard from '../../../src/components/dashboard/MarketDataCard';

describe('MarketDataCard', () => {
  it('should display market data correctly', async () => {
    const mockData = {
      symbol: 'AAPL',
      price: 150.00,
      change: 2.50,
      changePercent: 1.7
    };
    
    render(<MarketDataCard data={mockData} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('+1.7%')).toBeInTheDocument();
  });
  
  it('should handle refresh click', async () => {
    const onRefresh = jest.fn();
    render(<MarketDataCard data={{}} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
```

### 5.2 統合テスト
```javascript
// __tests__/integration/api/marketData.test.js
const request = require('supertest');
const app = require('../../../src/app');

describe('Market Data API', () => {
  it('should fetch market data successfully', async () => {
    const response = await request(app)
      .get('/api/market-data')
      .query({ symbols: 'AAPL,GOOGL' })
      .set('Authorization', 'Bearer valid-token');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveLength(2);
  });
  
  it('should return cached data when available', async () => {
    // 1回目のリクエスト
    const first = await request(app)
      .get('/api/market-data')
      .query({ symbols: 'AAPL' });
    
    // 2回目のリクエスト（キャッシュから）
    const second = await request(app)
      .get('/api/market-data')
      .query({ symbols: 'AAPL' });
    
    expect(second.body).toEqual(first.body);
    expect(second.headers['x-cache']).toBe('HIT');
  });
});
```

## 6. デプロイメント

### 6.1 フロントエンドデプロイ
```bash
# ビルド
cd frontend/webapp
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
NODE_OPTIONS='--openssl-legacy-provider' \
npm run build

# Cloudflare Pagesへデプロイ
wrangler pages deploy build --project-name=pfwise-portfolio-manager

# 本番URL: https://portfolio-wise.com/
```

### 6.2 バックエンドデプロイ
```bash
cd backend

# 開発環境
npm run deploy

# 本番環境
npm run deploy:prod

# ログ確認
serverless logs -f marketData -t --stage prod
```

## 7. トラブルシューティング

### 7.1 よくある問題と解決方法

#### フロントエンド
```bash
# Problem: i18n翻訳が表示されない
# Solution: package.jsonのsideEffectsにi18nファイルを追加
"sideEffects": [
  "src/i18n/**/*.js",
  "src/i18n/**/*.json"
]

# Problem: ビルドエラー (OpenSSL)
# Solution: NODE_OPTIONS環境変数を設定
NODE_OPTIONS='--openssl-legacy-provider' npm run build

# Problem: APIへの接続エラー
# Solution: CORSとAPI URLの確認
- バックエンドのCORS設定確認
- .envのREACT_APP_API_BASE_URL確認
```

#### バックエンド
```bash
# Problem: Lambda実行タイムアウト
# Solution: メモリサイズとタイムアウト値の調整
memorySize: 512  # 256から増加
timeout: 60       # 30から増加

# Problem: DynamoDB throttling
# Solution: オンデマンド料金に変更またはRCU/WCU増加

# Problem: Secrets Manager アクセスエラー
# Solution: Lambda実行ロールにSecretsManager権限追加
```

## 8. パフォーマンス最適化

### 8.1 フロントエンド最適化
```javascript
// 遅延読み込み
const AIAdvisor = lazy(() => import('./pages/AIAdvisor'));

// メモ化
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    processData(data), [data]
  );
  
  return <div>{processedData}</div>;
});

// デバウンス
const searchHandler = useDebouncedCallback(
  (query) => {
    performSearch(query);
  },
  500
);
```

### 8.2 バックエンド最適化
```javascript
// バッチ処理
const batchGetItems = async (keys) => {
  const params = {
    RequestItems: {
      [TABLE_NAME]: {
        Keys: keys.map(key => ({ id: key }))
      }
    }
  };
  
  return dynamodb.batchGet(params).promise();
};

// 並列処理
const results = await Promise.all([
  fetchFromYahoo(symbol),
  fetchFromJPX(symbol),
  fetchFromAlphaVantage(symbol)
]);
```

## 9. セキュリティベストプラクティス

### 9.1 フロントエンド
- XSS対策: Reactの自動エスケープを信頼
- CSP設定: Content-Security-Policyヘッダー設定
- 環境変数: APIキーは絶対にフロントエンドに含めない
- HTTPS: 全通信をHTTPS経由で行う

### 9.2 バックエンド
- 認証: Google OAuth 2.0使用
- 認可: Lambda Authorizerで権限チェック
- シークレット管理: AWS Secrets Manager使用
- 監査ログ: CloudWatchに全APIアクセスを記録
- Rate Limiting: IP/ユーザーベースの制限

## 10. 継続的改善

### 10.1 監視項目
- API応答時間
- エラーレート
- キャッシュヒット率
- Lambda実行時間
- DynamoDB消費容量

### 10.2 改善サイクル
1. メトリクス収集（CloudWatch）
2. 分析（CloudWatch Insights）
3. 改善案策定
4. 実装・テスト
5. デプロイ
6. 効果測定

---
*このガイドは開発者向けの実装ガイドラインです。最新の情報はCLAUDE.mdを参照してください。*