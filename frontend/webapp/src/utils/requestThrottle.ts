/**
 * リクエストスロットリング・デバウンス・レート制限ユーティリティ
 */

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  priority: number;
}

// リクエストキューの管理
class RequestQueue {
  private queue: QueueItem<any>[];
  private running: number;
  private maxConcurrent: number;
  private minDelay: number;
  private lastRequestTime: number;

  constructor(maxConcurrent: number = 5, minDelay: number = 100) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
    this.lastRequestTime = 0;
  }

  async add<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      setTimeout(() => this.processQueue(), this.minDelay - timeSinceLastRequest);
      return;
    }

    const { fn, resolve, reject } = this.queue.shift()!;
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
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function debounced(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    clearTimeout(timeoutId);

    return new Promise<ReturnType<T>>((resolve, reject) => {
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
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number = 1000): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle: boolean;
  let lastResult: ReturnType<T> | undefined;

  return function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
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

interface RateLimitError {
  response?: {
    status?: number;
    headers?: Record<string, string>;
  };
  errorType?: string;
  message?: string;
}

interface RequestOptions {
  priority?: number;
  retryOnRateLimit?: boolean;
}

// レート制限付きリクエストマネージャー
class RateLimitedRequestManager {
  private queues: Record<string, RequestQueue>;
  private rateLimitErrors: Map<string, number[]>;
  private backoffMultipliers: Map<string, number>;

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

  async request<T>(apiType: string, fn: () => Promise<T>, options: RequestOptions = {}): Promise<T> {
    const queue = this.queues[apiType] || this.queues.default;
    const { priority = 0, retryOnRateLimit = true } = options;

    // バックオフ中の場合は待機
    const backoffTime = this.getBackoffTime(apiType);
    if (backoffTime > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, backoffTime));
    }

    try {
      const result = await queue.add(fn, priority);
      // 成功時はバックオフをリセット
      this.resetBackoff(apiType);
      return result;
    } catch (error) {
      // レート制限エラーの処理
      if (this.isRateLimitError(error as RateLimitError) && retryOnRateLimit) {
        this.recordRateLimitError(apiType);

        // エクスポネンシャルバックオフで再試行
        const retryAfter = this.calculateRetryAfter(apiType, error as RateLimitError);
        console.log(`Rate limit hit for ${apiType}, retrying after ${retryAfter}ms`);

        await new Promise<void>(resolve => setTimeout(resolve, retryAfter));
        return this.request(apiType, fn, { ...options, retryOnRateLimit: false });
      }

      throw error;
    }
  }

  private isRateLimitError(error: RateLimitError): boolean {
    return error.response?.status === 429 ||
           error.errorType === 'RATE_LIMIT' ||
           (error.message?.toLowerCase().includes('rate limit') ?? false);
  }

  private recordRateLimitError(apiType: string): void {
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

  private resetBackoff(apiType: string): void {
    this.backoffMultipliers.set(apiType, 1);
  }

  private getBackoffTime(apiType: string): number {
    const errors = this.rateLimitErrors.get(apiType) || [];
    if (errors.length === 0) return 0;

    const lastError = errors[errors.length - 1];
    const baseBackoff = this.getBaseBackoff(apiType);
    const multiplier = this.backoffMultipliers.get(apiType) || 1;
    const backoffTime = baseBackoff * multiplier;

    const timeSinceLastError = Date.now() - lastError;
    return Math.max(0, backoffTime - timeSinceLastError);
  }

  private getBaseBackoff(apiType: string): number {
    const backoffTimes: Record<string, number> = {
      alphaVantage: 60000,  // 1分
      yahooFinance: 10000,  // 10秒
      exchangeRate: 30000,  // 30秒
      default: 5000         // 5秒
    };

    return backoffTimes[apiType] || backoffTimes.default;
  }

  private calculateRetryAfter(apiType: string, error: RateLimitError): number {
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
export const debouncedRefreshMarketData = debounce(async (refreshFn: () => Promise<any>): Promise<any> => {
  return await refreshFn();
}, 2000);

// バッチリクエスト処理
export async function batchRequests<T>(requests: (() => Promise<T>)[], batchSize: number = 5, delay: number = 1000): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(req => req()));

    results.push(...batchResults);

    // 次のバッチまで待機（最後のバッチでは待機しない）
    if (i + batchSize < requests.length) {
      await new Promise<void>(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

// リクエスト重複排除
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>>;

  constructor() {
    this.pendingRequests = new Map();
  }

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 既に同じリクエストが実行中の場合は、その結果を待つ
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
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
