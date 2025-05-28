/**
 * リクエストスロットリング・デバウンス・レート制限ユーティリティ
 */

// リクエストキューの管理
class RequestQueue {
  constructor(maxConcurrent = 5, minDelay = 100) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
    this.lastRequestTime = 0;
  }

  async add(fn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      setTimeout(() => this.processQueue(), this.minDelay - timeSinceLastRequest);
      return;
    }

    const { fn, resolve, reject } = this.queue.shift();
    this.running++;
    this.lastRequestTime = now;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

// デバウンス関数
export function debounce(fn, delay = 300) {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

// スロットル関数
export function throttle(fn, limit = 1000) {
  let inThrottle;
  let lastResult;
  
  return function throttled(...args) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = fn.apply(this, args);
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    
    return lastResult;
  };
}

// レート制限付きリクエストマネージャー
class RateLimitedRequestManager {
  constructor() {
    // API別のキューを管理
    this.queues = {
      alphaVantage: new RequestQueue(1, 12000), // 1分に5リクエスト = 12秒間隔
      yahooFinance: new RequestQueue(2, 1000),  // 2並列、1秒間隔
      exchangeRate: new RequestQueue(1, 5000),  // 5秒間隔
      default: new RequestQueue(5, 100)         // デフォルト: 5並列、100ms間隔
    };
    
    // レート制限エラーの追跡
    this.rateLimitErrors = new Map();
    this.backoffMultipliers = new Map();
  }

  async request(apiType, fn, options = {}) {
    const queue = this.queues[apiType] || this.queues.default;
    const { priority = 0, retryOnRateLimit = true } = options;

    // バックオフ中の場合は待機
    const backoffTime = this.getBackoffTime(apiType);
    if (backoffTime > 0) {
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }

    try {
      const result = await queue.add(fn, priority);
      // 成功時はバックオフをリセット
      this.resetBackoff(apiType);
      return result;
    } catch (error) {
      // レート制限エラーの処理
      if (this.isRateLimitError(error) && retryOnRateLimit) {
        this.recordRateLimitError(apiType);
        
        // エクスポネンシャルバックオフで再試行
        const retryAfter = this.calculateRetryAfter(apiType, error);
        console.log(`Rate limit hit for ${apiType}, retrying after ${retryAfter}ms`);
        
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return this.request(apiType, fn, { ...options, retryOnRateLimit: false });
      }
      
      throw error;
    }
  }

  isRateLimitError(error) {
    return error.response?.status === 429 || 
           error.errorType === 'RATE_LIMIT' ||
           error.message?.toLowerCase().includes('rate limit');
  }

  recordRateLimitError(apiType) {
    const now = Date.now();
    const errors = this.rateLimitErrors.get(apiType) || [];
    errors.push(now);
    
    // 直近1時間のエラーのみ保持
    const oneHourAgo = now - 3600000;
    const recentErrors = errors.filter(time => time > oneHourAgo);
    this.rateLimitErrors.set(apiType, recentErrors);
    
    // バックオフ倍率を増加
    const currentMultiplier = this.backoffMultipliers.get(apiType) || 1;
    this.backoffMultipliers.set(apiType, Math.min(currentMultiplier * 2, 64));
  }

  resetBackoff(apiType) {
    this.backoffMultipliers.set(apiType, 1);
  }

  getBackoffTime(apiType) {
    const errors = this.rateLimitErrors.get(apiType) || [];
    if (errors.length === 0) return 0;
    
    const lastError = errors[errors.length - 1];
    const baseBackoff = this.getBaseBackoff(apiType);
    const multiplier = this.backoffMultipliers.get(apiType) || 1;
    const backoffTime = baseBackoff * multiplier;
    
    const timeSinceLastError = Date.now() - lastError;
    return Math.max(0, backoffTime - timeSinceLastError);
  }

  getBaseBackoff(apiType) {
    const backoffTimes = {
      alphaVantage: 60000,  // 1分
      yahooFinance: 10000,  // 10秒
      exchangeRate: 30000,  // 30秒
      default: 5000         // 5秒
    };
    
    return backoffTimes[apiType] || backoffTimes.default;
  }

  calculateRetryAfter(apiType, error) {
    // Retry-Afterヘッダーがある場合はそれを使用
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    
    // エクスポネンシャルバックオフ
    const baseBackoff = this.getBaseBackoff(apiType);
    const multiplier = this.backoffMultipliers.get(apiType) || 1;
    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15のジッター
    
    return Math.floor(baseBackoff * multiplier * jitter);
  }
}

// シングルトンインスタンス
export const requestManager = new RateLimitedRequestManager();

// 市場データリフレッシュ用のデバウンス（ユーザーが連打できないように）
export const debouncedRefreshMarketData = debounce(async (refreshFn) => {
  return await refreshFn();
}, 2000);

// バッチリクエスト処理
export async function batchRequests(requests, batchSize = 5, delay = 1000) {
  const results = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(req => req()));
    
    results.push(...batchResults);
    
    // 次のバッチまで待機（最後のバッチでは待機しない）
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// リクエスト重複排除
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async dedupe(key, fn) {
    // 既に同じリクエストが実行中の場合は、その結果を待つ
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // 新しいリクエストを開始
    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();