# フロントエンド修正ガイド

## 発生している問題

### 1. 429エラー（レート制限）
個別に銘柄データを取得しているため、短時間に大量のリクエストが発生し、レート制限に引っかかっています。

### 2. 401エラー（認証エラー）
セッションCookieが正しく設定・送信されていないため、Google Drive APIへのアクセスが失敗しています。

### 3. Cookie設定問題
`sessionId`という名前のCookieが設定されていない、または送信されていません。

## 修正方法

### 1. バッチリクエストの実装

**現在の問題のあるコード:**
```javascript
// 個別にリクエストを送信している
for (const symbol of symbols) {
  const response = await fetch(`/api/market-data?type=us-stock&symbols=${symbol}`);
}
```

**修正後のコード:**
```javascript
// 一括でリクエストを送信
const fetchMarketDataBatch = async (symbols, type = 'us-stock') => {
  try {
    const response = await fetch(
      `${API_URL}/api/market-data?type=${type}&symbols=${symbols.join(',')}`,
      {
        credentials: 'include' // 重要: Cookieを送信
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error('レート制限に達しました。しばらく待ってから再試行してください。');
        // Circuit breakerパターンの実装
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1分待機
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data; // 複数銘柄のデータオブジェクト
  } catch (error) {
    console.error('Market data fetch error:', error);
    throw error;
  }
};

// 使用例
const symbols = ['VOO', 'GLD', 'VXUS', 'EIDO', 'IBIT', 'INDA', 'LQD', 'QQQ', 'VWO', 'IEF', 'VNQ'];
const marketData = await fetchMarketDataBatch(symbols);
```

### 2. Axios設定の修正

**axios設定:**
```javascript
// APIクライアントの設定
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true, // 重要: Cookieを送信
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // レスポンスインターセプター
  client.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 429) {
        // レート制限エラーの処理
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
        
        // Circuit breakerの実装
        if (window.circuitBreaker) {
          window.circuitBreaker.open(error.config.url, retryAfter * 1000);
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};
```

### 3. 認証処理の修正

**Google認証後の処理:**
```javascript
const handleGoogleLogin = async (credentialResponse) => {
  try {
    const payload = {
      code: credentialResponse.code,
      redirectUri: window.location.origin + '/auth/google/callback'
    };
    
    const response = await axios.post(
      `${API_URL}/auth/google/login`,
      payload,
      {
        withCredentials: true, // 重要: Cookieを受信
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      // Set-Cookieヘッダーはブラウザが自動的に処理
      console.log('Login successful');
      
      // セッション確認
      await checkSession();
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

### 4. Circuit Breakerパターンの実装

```javascript
class CircuitBreaker {
  constructor() {
    this.states = new Map(); // URL -> { state, retryAfter }
  }

  open(url, duration) {
    this.states.set(url, {
      state: 'OPEN',
      retryAfter: Date.now() + duration
    });
  }

  isOpen(url) {
    const circuit = this.states.get(url);
    if (!circuit) return false;
    
    if (circuit.state === 'OPEN' && Date.now() > circuit.retryAfter) {
      this.states.delete(url);
      return false;
    }
    
    return circuit.state === 'OPEN';
  }

  reset() {
    this.states.clear();
  }
}

// グローバルに設定
window.circuitBreaker = new CircuitBreaker();
```

### 5. リクエスト最適化の実装

```javascript
// リクエストキューの実装
class RequestQueue {
  constructor(maxConcurrent = 3, delay = 1000) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
    this.delay = delay;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      
      // 遅延を追加してレート制限を回避
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), this.delay);
      }
    }
  }
}

// 使用例
const requestQueue = new RequestQueue(2, 500); // 同時2リクエスト、500ms間隔

// 個別リクエストが必要な場合
const fetchWithQueue = async (symbol) => {
  return requestQueue.add(() => 
    fetch(`${API_URL}/api/market-data?type=us-stock&symbols=${symbol}`, {
      credentials: 'include'
    })
  );
};
```

## 推奨される修正手順

1. **即座に実装すべき修正**
   - バッチリクエストの実装（最重要）
   - `withCredentials: true`の設定
   - Circuit Breakerパターンの実装

2. **段階的に実装**
   - RequestQueueの実装
   - エラーハンドリングの強化
   - リトライロジックの実装

3. **テスト**
   - 少数の銘柄でテスト
   - エラー処理の確認
   - Cookie送信の確認

## デバッグ方法

```javascript
// Cookieの確認
console.log('Current cookies:', document.cookie);

// リクエストヘッダーの確認
axios.interceptors.request.use(request => {
  console.log('Request headers:', request.headers);
  console.log('With credentials:', request.withCredentials);
  return request;
});

// レスポンスヘッダーの確認
axios.interceptors.response.use(response => {
  console.log('Response headers:', response.headers);
  console.log('Set-Cookie:', response.headers['set-cookie']);
  return response;
});
```

## まとめ

主な問題は以下の2点です：
1. 個別リクエストによるレート制限
2. Cookie設定の問題

バッチリクエストの実装と、適切なCookie設定（`withCredentials: true`）により、これらの問題は解決できます。