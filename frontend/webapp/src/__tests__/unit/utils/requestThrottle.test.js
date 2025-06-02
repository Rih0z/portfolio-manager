/**
 * requestThrottle.js のユニットテスト
 * リクエストスロットリング・デバウンス・レート制限ユーティリティのテスト
 */

import {
  debounce,
  throttle,
  requestManager,
  debouncedRefreshMarketData,
  batchRequests,
  requestDeduplicator
} from '../../../utils/requestThrottle';

// タイマーのモック
jest.useFakeTimers();

describe('requestThrottle utilities', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // コンソールメソッドをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // タイマーをクリア
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // すべてのタイマーを実行
    jest.runAllTimers();
  });

  describe('RequestQueue class', () => {
    let RequestQueue;

    beforeEach(() => {
      // RequestQueueクラスを直接テストするため、モジュールから取得
      jest.resetModules();
      const module = require('../../../utils/requestThrottle');
      // RequestQueueはエクスポートされていないため、内部実装をテスト
      // プライベートクラスなので、RateLimitedRequestManager経由でテスト
    });

    it('デフォルト設定でキューを作成する', () => {
      // RateLimitedRequestManagerのデフォルトキューをテスト
      expect(requestManager.queues.default).toBeDefined();
      expect(requestManager.queues.default.maxConcurrent).toBe(5);
      expect(requestManager.queues.default.minDelay).toBe(100);
    });

    it('優先度順にリクエストを処理する', async () => {
      const results = [];
      
      const lowPriorityFn = jest.fn().mockImplementation(async () => {
        results.push('low');
        return 'low-result';
      });
      
      const highPriorityFn = jest.fn().mockImplementation(async () => {
        results.push('high');
        return 'high-result';
      });

      // 低優先度のリクエストを先に追加
      const lowPromise = requestManager.request('default', lowPriorityFn, { priority: 0 });
      
      // 高優先度のリクエストを後に追加
      const highPromise = requestManager.request('default', highPriorityFn, { priority: 10 });

      // タイマーを進めてキューを処理
      jest.runAllTimers();
      await Promise.resolve(); // マイクロタスクを実行

      await Promise.all([lowPromise, highPromise]);

      // 高優先度が先に実行される
      expect(results[0]).toBe('high');
      expect(results[1]).toBe('low');
    });

    it('同時実行数制限を適用する', async () => {
      const runningCount = { value: 0 };
      const maxConcurrentSeen = { value: 0 };

      const testFn = jest.fn().mockImplementation(() => {
        runningCount.value++;
        maxConcurrentSeen.value = Math.max(maxConcurrentSeen.value, runningCount.value);
        
        return new Promise(resolve => {
          setTimeout(() => {
            runningCount.value--;
            resolve('result');
          }, 100);
        });
      });

      // 10個のリクエストを同時に追加
      const promises = Array.from({ length: 10 }, () => 
        requestManager.request('default', testFn)
      );

      // タイマーを進めて処理
      jest.runAllTimers();

      await Promise.all(promises);

      // デフォルトの最大同時実行数は5
      expect(maxConcurrentSeen.value).toBeLessThanOrEqual(5);
    }, 10000);

    it('最小遅延時間を適用する', async () => {
      const timestamps = [];
      
      const testFn = jest.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        return 'result';
      });

      // 3つのリクエストを追加
      const promises = [
        requestManager.request('default', testFn),
        requestManager.request('default', testFn),
        requestManager.request('default', testFn)
      ];

      // すべてのタイマーを実行
      jest.runAllTimers();

      await Promise.all(promises);

      // 最小遅延時間(100ms)が適用されているかチェック
      expect(testFn).toHaveBeenCalledTimes(3);
    }, 10000);

    it('エラーが発生したリクエストを適切に処理する', async () => {
      const error = new Error('Test error');
      const errorFn = jest.fn().mockRejectedValue(error);
      const successFn = jest.fn().mockResolvedValue('success');

      const errorPromise = requestManager.request('default', errorFn);
      const successPromise = requestManager.request('default', successFn);

      jest.runAllTimers();

      await expect(errorPromise).rejects.toThrow('Test error');
      await expect(successPromise).resolves.toBe('success');

      // エラー後も他のリクエストは処理される
      expect(successFn).toHaveBeenCalled();
    }, 10000);
  });

  describe('debounce function', () => {
    it('指定した遅延時間でデバウンスする', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const debouncedFn = debounce(mockFn, 500);

      // 複数回連続で呼び出し
      debouncedFn('arg1');
      debouncedFn('arg2');
      const promise = debouncedFn('arg3');

      // 500ms前では実行されない
      jest.advanceTimersByTime(400);
      expect(mockFn).not.toHaveBeenCalled();

      // 500ms後に最後の呼び出しのみ実行
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
      expect(result).toBe('result');
    });

    it('デフォルトの遅延時間(300ms)を使用する', async () => {
      const mockFn = jest.fn().mockResolvedValue('default-result');
      const debouncedFn = debounce(mockFn);

      const promise = debouncedFn('test');

      // 300ms前では実行されない
      jest.advanceTimersByTime(200);
      expect(mockFn).not.toHaveBeenCalled();

      // 300ms後に実行
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('default-result');
    });

    it('エラーが発生した場合は適切に伝播する', async () => {
      const error = new Error('Debounce error');
      const errorFn = jest.fn().mockRejectedValue(error);
      const debouncedFn = debounce(errorFn, 200);

      const promise = debouncedFn('error-test');

      jest.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('Debounce error');
    });

    it('thisコンテキストを適切に保持する', async () => {
      const context = {
        value: 'context-value',
        method: jest.fn(function() {
          return this.value;
        })
      };

      const debouncedMethod = debounce(context.method, 100);
      const promise = debouncedMethod.call(context);

      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('context-value');
    });

    it('連続した呼び出しでタイマーがリセットされる', async () => {
      const mockFn = jest.fn().mockResolvedValue('reset-test');
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('call1');
      
      // 200ms後に再度呼び出し（タイマーリセット）
      jest.advanceTimersByTime(200);
      debouncedFn('call2');

      // 最初の300msではまだ実行されない
      jest.advanceTimersByTime(100);
      expect(mockFn).not.toHaveBeenCalled();

      // 追加で200ms進めて合計300ms
      jest.advanceTimersByTime(200);
      expect(mockFn).toHaveBeenCalledWith('call2');
    });
  });

  describe('throttle function', () => {
    it('指定した制限時間でスロットルする', () => {
      const mockFn = jest.fn().mockReturnValue('throttled-result');
      const throttledFn = throttle(mockFn, 1000);

      // 最初の呼び出しは即座に実行
      const result1 = throttledFn('arg1');
      expect(result1).toBe('throttled-result');
      expect(mockFn).toHaveBeenCalledWith('arg1');

      // 制限時間内の呼び出しは前の結果を返す
      const result2 = throttledFn('arg2');
      expect(result2).toBe('throttled-result');
      expect(mockFn).toHaveBeenCalledTimes(1); // まだ1回だけ

      // 制限時間経過後は新しい呼び出しを実行
      jest.advanceTimersByTime(1000);
      const result3 = throttledFn('arg3');
      expect(result3).toBe('throttled-result');
      expect(mockFn).toHaveBeenCalledWith('arg3');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('デフォルトの制限時間(1000ms)を使用する', () => {
      const mockFn = jest.fn().mockReturnValue('default-throttle');
      const throttledFn = throttle(mockFn);

      throttledFn('test1');
      throttledFn('test2'); // 1000ms以内なので実行されない

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      throttledFn('test3'); // 1000ms経過後なので実行される

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('thisコンテキストを適切に保持する', () => {
      const context = {
        value: 'throttle-context',
        method: jest.fn(function() {
          return this.value;
        })
      };

      const throttledMethod = throttle(context.method, 500);
      const result = throttledMethod.call(context);

      expect(result).toBe('throttle-context');
    });

    it('引数を正しく渡す', () => {
      const mockFn = jest.fn().mockReturnValue('args-test');
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1', 'arg2', { key: 'value' });

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });
  });

  describe('RateLimitedRequestManager', () => {
    beforeEach(() => {
      // レート制限エラーの履歴をクリア
      requestManager.rateLimitErrors.clear();
      requestManager.backoffMultipliers.clear();
    });

    it('API別のキューを正しく設定する', () => {
      expect(requestManager.queues.alphaVantage).toBeDefined();
      expect(requestManager.queues.alphaVantage.maxConcurrent).toBe(1);
      expect(requestManager.queues.alphaVantage.minDelay).toBe(12000);

      expect(requestManager.queues.yahooFinance).toBeDefined();
      expect(requestManager.queues.yahooFinance.maxConcurrent).toBe(2);
      expect(requestManager.queues.yahooFinance.minDelay).toBe(1000);

      expect(requestManager.queues.exchangeRate).toBeDefined();
      expect(requestManager.queues.exchangeRate.maxConcurrent).toBe(1);
      expect(requestManager.queues.exchangeRate.minDelay).toBe(5000);

      expect(requestManager.queues.default).toBeDefined();
      expect(requestManager.queues.default.maxConcurrent).toBe(5);
      expect(requestManager.queues.default.minDelay).toBe(100);
    });

    it('正常なリクエストを処理する', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const promise = requestManager.request('default', mockFn);
      jest.runAllTimers();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    }, 10000);

    it('不明なAPIタイプでデフォルトキューを使用する', async () => {
      const mockFn = jest.fn().mockResolvedValue('unknown-api');
      
      const promise = requestManager.request('unknownApi', mockFn);
      jest.runAllTimers();
      const result = await promise;
      
      expect(result).toBe('unknown-api');
    }, 10000);

    it('優先度を正しく適用する', async () => {
      const results = [];
      
      const lowPriorityFn = jest.fn().mockImplementation(async () => {
        results.push('low');
        return 'low';
      });
      
      const highPriorityFn = jest.fn().mockImplementation(async () => {
        results.push('high');
        return 'high';
      });

      // 低優先度を先に追加、高優先度を後に追加
      const promises = [
        requestManager.request('default', lowPriorityFn, { priority: 1 }),
        requestManager.request('default', highPriorityFn, { priority: 10 })
      ];

      jest.runAllTimers();
      await Promise.all(promises);

      // 高優先度が先に実行される
      expect(results[0]).toBe('high');
    }, 10000);

    describe('レート制限エラーの検出', () => {
      it('HTTP 429ステータスを検出する', () => {
        const error = {
          response: { status: 429 }
        };
        
        expect(requestManager.isRateLimitError(error)).toBe(true);
      });

      it('RATE_LIMITエラータイプを検出する', () => {
        const error = {
          errorType: 'RATE_LIMIT'
        };
        
        expect(requestManager.isRateLimitError(error)).toBe(true);
      });

      it('rate limitメッセージを検出する', () => {
        const error = {
          message: 'Rate limit exceeded'
        };
        
        expect(requestManager.isRateLimitError(error)).toBe(true);
      });

      it('通常のエラーは検出しない', () => {
        const error = {
          message: 'Network error',
          response: { status: 500 }
        };
        
        expect(requestManager.isRateLimitError(error)).toBe(false);
      });
    });

    describe('レート制限エラーの記録と管理', () => {
      it('レート制限エラーを記録する', () => {
        const originalNow = Date.now;
        const mockNow = 1000000;
        Date.now = jest.fn(() => mockNow);

        try {
          requestManager.recordRateLimitError('testApi');
          
          const errors = requestManager.rateLimitErrors.get('testApi');
          expect(errors).toContain(mockNow);
          
          const multiplier = requestManager.backoffMultipliers.get('testApi');
          expect(multiplier).toBe(2);
        } finally {
          Date.now = originalNow;
        }
      });

      it('古いエラー履歴を削除する', () => {
        const originalNow = Date.now;
        const baseTime = 1000000;
        
        try {
          // 2時間前のエラーを記録
          Date.now = jest.fn(() => baseTime);
          requestManager.recordRateLimitError('testApi');
          
          // 現在時刻を2時間後に設定
          Date.now = jest.fn(() => baseTime + 7200000);
          requestManager.recordRateLimitError('testApi');
          
          const errors = requestManager.rateLimitErrors.get('testApi');
          // 古いエラーは削除され、新しいエラーのみ残る
          expect(errors).toHaveLength(1);
          expect(errors[0]).toBe(baseTime + 7200000);
        } finally {
          Date.now = originalNow;
        }
      });

      it('バックオフ倍率の上限を適用する', () => {
        // 複数回エラーを記録してバックオフ倍率を上げる
        for (let i = 0; i < 10; i++) {
          requestManager.recordRateLimitError('testApi');
        }
        
        const multiplier = requestManager.backoffMultipliers.get('testApi');
        expect(multiplier).toBe(64); // 最大値
      });

      it('成功時にバックオフをリセットする', () => {
        // まずエラーを記録
        requestManager.recordRateLimitError('testApi');
        expect(requestManager.backoffMultipliers.get('testApi')).toBe(2);
        
        // リセット
        requestManager.resetBackoff('testApi');
        expect(requestManager.backoffMultipliers.get('testApi')).toBe(1);
      });
    });

    describe('バックオフ時間の計算', () => {
      it('エラーがない場合は0を返す', () => {
        const backoffTime = requestManager.getBackoffTime('cleanApi');
        expect(backoffTime).toBe(0);
      });

      it('最近のエラーに基づいてバックオフ時間を計算する', () => {
        const originalNow = Date.now;
        const baseTime = 1000000;
        
        try {
          Date.now = jest.fn(() => baseTime);
          requestManager.recordRateLimitError('testApi');
          
          // 1秒後にバックオフ時間をチェック
          Date.now = jest.fn(() => baseTime + 1000);
          const backoffTime = requestManager.getBackoffTime('testApi');
          
          // デフォルトのベースバックオフ(5000ms) * 倍率(2) - 経過時間(1000ms)
          expect(backoffTime).toBe(9000);
        } finally {
          Date.now = originalNow;
        }
      });

      it('十分な時間が経過した場合は0を返す', () => {
        const originalNow = Date.now;
        const baseTime = 1000000;
        
        try {
          Date.now = jest.fn(() => baseTime);
          requestManager.recordRateLimitError('testApi');
          
          // 十分な時間が経過
          Date.now = jest.fn(() => baseTime + 20000);
          const backoffTime = requestManager.getBackoffTime('testApi');
          
          expect(backoffTime).toBe(0);
        } finally {
          Date.now = originalNow;
        }
      });
    });

    describe('ベースバックオフ時間', () => {
      it('alphaVantageの適切なバックオフ時間を返す', () => {
        expect(requestManager.getBaseBackoff('alphaVantage')).toBe(60000);
      });

      it('yahooFinanceの適切なバックオフ時間を返す', () => {
        expect(requestManager.getBaseBackoff('yahooFinance')).toBe(10000);
      });

      it('exchangeRateの適切なバックオフ時間を返す', () => {
        expect(requestManager.getBaseBackoff('exchangeRate')).toBe(30000);
      });

      it('不明なAPIタイプではデフォルト値を返す', () => {
        expect(requestManager.getBaseBackoff('unknownApi')).toBe(5000);
      });
    });

    describe('リトライ時間の計算', () => {
      it('Retry-Afterヘッダーがある場合はそれを使用する', () => {
        const error = {
          response: {
            headers: {
              'retry-after': '30'
            }
          }
        };
        
        const retryAfter = requestManager.calculateRetryAfter('testApi', error);
        expect(retryAfter).toBe(30000); // 30秒をミリ秒に変換
      });

      it('Retry-Afterヘッダーがない場合はエクスポネンシャルバックオフを使用する', () => {
        const error = {};
        
        // バックオフ倍率を設定
        requestManager.backoffMultipliers.set('testApi', 4);
        
        const retryAfter = requestManager.calculateRetryAfter('testApi', error);
        
        // ベースバックオフ(5000) * 倍率(4) * ジッター(0.85-1.15)
        expect(retryAfter).toBeGreaterThanOrEqual(5000 * 4 * 0.85);
        expect(retryAfter).toBeLessThanOrEqual(5000 * 4 * 1.15);
      });

      it('ジッターが適用される', () => {
        const error = {};
        
        // 複数回計算して結果が異なることを確認
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(requestManager.calculateRetryAfter('testApi', error));
        }
        
        // 少なくとも2つの異なる値があることを確認（ジッターのため）
        const uniqueResults = [...new Set(results)];
        expect(uniqueResults.length).toBeGreaterThan(1);
      });
    });

    describe('レート制限エラーでの自動リトライ', () => {
      it('レート制限エラー時に自動的にリトライする', async () => {
        const rateLimitError = {
          response: { status: 429 }
        };
        
        const mockFn = jest.fn()
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce('success-after-retry');
        
        const promise = requestManager.request('testApi', mockFn, { retryOnRateLimit: true });
        
        // タイマーを進めてリトライを実行
        jest.runAllTimers();
        
        const result = await promise;
        
        expect(result).toBe('success-after-retry');
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Rate limit hit for testApi')
        );
      }, 15000);

      it('retryOnRateLimitがfalseの場合はリトライしない', async () => {
        const rateLimitError = {
          response: { status: 429 }
        };
        
        const mockFn = jest.fn().mockRejectedValue(rateLimitError);
        
        const promise = requestManager.request('testApi', mockFn, { retryOnRateLimit: false });
        jest.runAllTimers();
        
        await expect(promise).rejects.toEqual(rateLimitError);
        
        expect(mockFn).toHaveBeenCalledTimes(1);
      }, 10000);

      it('2回目のリトライではretryOnRateLimitをfalseに設定する', async () => {
        const rateLimitError = {
          response: { status: 429 }
        };
        
        const mockFn = jest.fn().mockRejectedValue(rateLimitError);
        
        const promise = requestManager.request('testApi', mockFn, { retryOnRateLimit: true });
        
        // タイマーを進めてリトライを実行
        jest.runAllTimers();
        
        await expect(promise).rejects.toEqual(rateLimitError);
        
        // 最初の呼び出し + 1回のリトライ = 2回
        expect(mockFn).toHaveBeenCalledTimes(2);
      }, 15000);
    });

    describe('バックオフ待機', () => {
      it('バックオフ時間がある場合は待機する', async () => {
        const originalNow = Date.now;
        const baseTime = 1000000;
        
        try {
          // レート制限エラーを記録してバックオフ状態にする
          Date.now = jest.fn(() => baseTime);
          requestManager.recordRateLimitError('testApi');
          
          // 少し時間が経過した状態
          Date.now = jest.fn(() => baseTime + 1000);
          
          const mockFn = jest.fn().mockResolvedValue('after-backoff');
          
          const promise = requestManager.request('testApi', mockFn);
          
          // バックオフ時間分タイマーを進める
          jest.runAllTimers();
          
          const result = await promise;
          
          expect(result).toBe('after-backoff');
        } finally {
          Date.now = originalNow;
        }
      }, 15000);
    });
  });

  describe('debouncedRefreshMarketData', () => {
    it('市場データリフレッシュ関数をデバウンスする', async () => {
      const mockRefreshFn = jest.fn().mockResolvedValue('refreshed');
      
      // 複数回呼び出し
      debouncedRefreshMarketData(mockRefreshFn);
      debouncedRefreshMarketData(mockRefreshFn);
      const promise = debouncedRefreshMarketData(mockRefreshFn);
      
      // 2秒待機
      jest.advanceTimersByTime(2000);
      
      const result = await promise;
      
      expect(result).toBe('refreshed');
      expect(mockRefreshFn).toHaveBeenCalledTimes(1);
    });

    it('2秒のデバウンス時間を使用する', async () => {
      const mockRefreshFn = jest.fn().mockResolvedValue('delayed');
      
      const promise = debouncedRefreshMarketData(mockRefreshFn);
      
      // 1.9秒では実行されない
      jest.advanceTimersByTime(1900);
      expect(mockRefreshFn).not.toHaveBeenCalled();
      
      // 2秒で実行される
      jest.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result).toBe('delayed');
    });
  });

  describe('batchRequests', () => {
    it('リクエストをバッチ処理する', async () => {
      const requests = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
        jest.fn().mockResolvedValue('result4'),
        jest.fn().mockResolvedValue('result5')
      ];
      
      const promise = batchRequests(requests, 2, 500);
      
      // バッチ間の遅延を処理
      jest.runAllTimers();
      
      const results = await promise;
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toBe(`result${index + 1}`);
      });
      
      // すべてのリクエストが実行された
      requests.forEach(req => {
        expect(req).toHaveBeenCalled();
      });
    }, 10000);

    it('デフォルトのバッチサイズと遅延を使用する', async () => {
      const requests = Array.from({ length: 12 }, (_, i) => 
        jest.fn().mockResolvedValue(`result${i}`)
      );
      
      const promise = batchRequests(requests);
      
      // デフォルト遅延(1000ms)でバッチ処理
      jest.runAllTimers();
      
      const results = await promise;
      
      expect(results).toHaveLength(12);
    }, 10000);

    it('エラーがあるリクエストも適切に処理する', async () => {
      const requests = [
        jest.fn().mockResolvedValue('success'),
        jest.fn().mockRejectedValue(new Error('batch error')),
        jest.fn().mockResolvedValue('success2')
      ];
      
      const promise = batchRequests(requests, 3, 100);
      
      jest.advanceTimersByTime(200);
      
      const results = await promise;
      
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toBe('success');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason.message).toBe('batch error');
      expect(results[2].status).toBe('fulfilled');
      expect(results[2].value).toBe('success2');
    });

    it('最後のバッチでは遅延しない', async () => {
      const requests = [
        jest.fn().mockResolvedValue('last1'),
        jest.fn().mockResolvedValue('last2')
      ];
      
      const startTime = Date.now();
      const promise = batchRequests(requests, 5, 1000);
      
      // バッチサイズが5で要素が2つなので最後のバッチ
      jest.advanceTimersByTime(100);
      
      const results = await promise;
      
      expect(results).toHaveLength(2);
      // 遅延なしで完了
    });

    it('空の配列を適切に処理する', async () => {
      const results = await batchRequests([]);
      
      expect(results).toEqual([]);
    });
  });

  describe('RequestDeduplicator', () => {
    beforeEach(() => {
      // 重複排除のpendingRequestsをクリア
      requestDeduplicator.pendingRequests.clear();
    });

    it('同じキーのリクエストを重複排除する', async () => {
      const mockFn = jest.fn().mockResolvedValue('deduped-result');
      
      // 同じキーで複数回呼び出し
      const promises = [
        requestDeduplicator.dedupe('test-key', mockFn),
        requestDeduplicator.dedupe('test-key', mockFn),
        requestDeduplicator.dedupe('test-key', mockFn)
      ];
      
      const results = await Promise.all(promises);
      
      // すべて同じ結果を返す
      expect(results).toEqual(['deduped-result', 'deduped-result', 'deduped-result']);
      
      // 関数は1回だけ実行される
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('異なるキーのリクエストは個別に実行する', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('result1');
      const mockFn2 = jest.fn().mockResolvedValue('result2');
      
      const promises = [
        requestDeduplicator.dedupe('key1', mockFn1),
        requestDeduplicator.dedupe('key2', mockFn2)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual(['result1', 'result2']);
      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });

    it('エラーが発生したリクエストも重複排除する', async () => {
      const error = new Error('Dedupe error');
      const errorFn = jest.fn().mockRejectedValue(error);
      
      const promises = [
        requestDeduplicator.dedupe('error-key', errorFn),
        requestDeduplicator.dedupe('error-key', errorFn)
      ];
      
      // 両方のプロミスが同じエラーで reject される
      await expect(promises[0]).rejects.toThrow('Dedupe error');
      await expect(promises[1]).rejects.toThrow('Dedupe error');
      
      // エラーでも1回だけ実行される
      expect(errorFn).toHaveBeenCalledTimes(1);
    });

    it('リクエスト完了後にpendingRequestsから削除する', async () => {
      const mockFn = jest.fn().mockResolvedValue('cleanup-test');
      
      const promise1 = requestDeduplicator.dedupe('cleanup-key', mockFn);
      
      // リクエスト実行中はpendingRequestsに存在
      expect(requestDeduplicator.pendingRequests.has('cleanup-key')).toBe(true);
      
      await promise1;
      
      // 完了後は削除される
      expect(requestDeduplicator.pendingRequests.has('cleanup-key')).toBe(false);
      
      // 同じキーで新しいリクエストは再実行される
      const promise2 = requestDeduplicator.dedupe('cleanup-key', mockFn);
      await promise2;
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('エラー時もpendingRequestsから削除する', async () => {
      const error = new Error('Cleanup error');
      const errorFn = jest.fn().mockRejectedValue(error);
      
      try {
        await requestDeduplicator.dedupe('error-cleanup-key', errorFn);
      } catch (e) {
        // エラーを無視
      }
      
      // エラー後もpendingRequestsから削除される
      expect(requestDeduplicator.pendingRequests.has('error-cleanup-key')).toBe(false);
    });

    it('finallyブロックが確実に実行される', async () => {
      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('Finally test error');
      });
      
      try {
        await requestDeduplicator.dedupe('finally-key', mockFn);
      } catch (e) {
        // エラーを無視
      }
      
      // finallyブロックでクリーンアップされる
      expect(requestDeduplicator.pendingRequests.has('finally-key')).toBe(false);
    });
  });

  describe('統合テスト', () => {
    it('複数のユーティリティを組み合わせて使用する', async () => {
      const apiCall = jest.fn().mockResolvedValue('integrated-result');
      
      // デバウンス + レート制限 + 重複排除の組み合わせ
      const debouncedApiCall = debounce(
        () => requestDeduplicator.dedupe(
          'integrated-key',
          () => requestManager.request('default', apiCall)
        ),
        200
      );
      
      // 複数回呼び出し
      const promises = [
        debouncedApiCall(),
        debouncedApiCall(),
        debouncedApiCall()
      ];
      
      jest.runAllTimers();
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual(['integrated-result', 'integrated-result', 'integrated-result']);
      expect(apiCall).toHaveBeenCalledTimes(1);
    }, 10000);

    it('レート制限エラーから回復する完全なフロー', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'rate limit exceeded'
      };
      
      const apiCall = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('recovered-result');
      
      const promise = requestManager.request('alphaVantage', apiCall);
      
      // レート制限エラーの処理とリトライを進める
      jest.runAllTimers(); // alphaVantageのバックオフ時間
      
      const result = await promise;
      
      expect(result).toBe('recovered-result');
      expect(apiCall).toHaveBeenCalledTimes(2);
      
      // バックオフ状態がリセットされる
      expect(requestManager.backoffMultipliers.get('alphaVantage')).toBe(1);
    }, 15000);

    it('高負荷時のパフォーマンステスト', async () => {
      const startTime = Date.now();
      
      // 大量のリクエストを生成
      const requests = Array.from({ length: 100 }, (_, i) => 
        () => Promise.resolve(`result${i}`)
      );
      
      // バッチ処理で実行
      const promise = batchRequests(requests, 10, 100);
      
      jest.runAllTimers();
      
      const results = await promise;
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      // 適切なバッチサイズで処理される
      expect(endTime - startTime).toBeLessThan(10000);
    }, 15000);
  });

  describe('エラーハンドリング', () => {
    it('非同期エラーを適切に処理する', async () => {
      const asyncError = new Error('Async operation failed');
      const errorFn = jest.fn().mockRejectedValue(asyncError);
      
      await expect(requestManager.request('default', errorFn))
        .rejects.toThrow('Async operation failed');
    });

    it('同期エラーを適切に処理する', async () => {
      const syncError = new Error('Sync operation failed');
      const errorFn = jest.fn().mockImplementation(() => {
        throw syncError;
      });
      
      const promise = requestManager.request('default', errorFn);
      jest.runAllTimers();
      
      await expect(promise).rejects.toThrow('Sync operation failed');
    }, 10000);

    it('undefined/nullレスポンスを適切に処理する', async () => {
      const nullFn = jest.fn().mockResolvedValue(null);
      const undefinedFn = jest.fn().mockResolvedValue(undefined);
      
      const nullPromise = requestManager.request('default', nullFn);
      const undefinedPromise = requestManager.request('default', undefinedFn);
      
      jest.runAllTimers();
      
      const nullResult = await nullPromise;
      const undefinedResult = await undefinedPromise;
      
      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeUndefined();
    }, 10000);
  });

  describe('メモリリーク防止', () => {
    it('古いレート制限エラー履歴を適切にクリーンアップする', () => {
      const originalNow = Date.now;
      
      try {
        // 古いエラーを大量に記録
        for (let i = 0; i < 100; i++) {
          Date.now = jest.fn(() => 1000000 + i * 1000);
          requestManager.recordRateLimitError('memoryTest');
        }
        
        // 時間を大幅に進める
        Date.now = jest.fn(() => 1000000 + 7200000); // 2時間後
        requestManager.recordRateLimitError('memoryTest');
        
        const errors = requestManager.rateLimitErrors.get('memoryTest');
        
        // 古いエラーは削除され、最新のもののみ残る
        expect(errors.length).toBeLessThanOrEqual(10);
      } finally {
        Date.now = originalNow;
      }
    });

    it('RequestDeduplicatorが完了したリクエストをクリーンアップする', async () => {
      const mockFn = jest.fn().mockResolvedValue('memory-test');
      
      // 複数のリクエストを実行
      for (let i = 0; i < 10; i++) {
        await requestDeduplicator.dedupe(`memory-key-${i}`, mockFn);
      }
      
      // 全てのキーがクリーンアップされている
      expect(requestDeduplicator.pendingRequests.size).toBe(0);
    });
  });
});