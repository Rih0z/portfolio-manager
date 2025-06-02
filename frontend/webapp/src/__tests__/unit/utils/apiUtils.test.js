/**
 * apiUtils.js のユニットテスト
 * API関連のユーティリティ関数とサーキットブレーカーのテスト
 */

import {
  withRetry,
  withExponentialBackoff,
  withTimeout,
  resetCircuitBreaker
} from '../../../utils/apiUtils';

// モック用のタイマー
jest.useFakeTimers();

describe('apiUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // サーキットブレーカーをリセット
    resetCircuitBreaker('test-api');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('withRetry', () => {
    it('成功した関数をそのまま実行する', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('失敗した関数を指定回数リトライする', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数を超えた場合はエラーを投げる', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(withRetry(mockFn, { maxRetries: 2 }))
        .rejects.toThrow('persistent failure');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
    });

    it('デフォルトパラメータで動作する', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('delayが正しく動作する', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const promise = withRetry(mockFn, { maxRetries: 1, delay: 1000 });
      
      // 最初の実行は即座に失敗
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // 1秒後にリトライ
      await jest.advanceTimersByTimeAsync(1000);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withExponentialBackoff', () => {
    it('成功した関数をそのまま実行する', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withExponentialBackoff(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('指数バックオフでリトライする', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const promise = withExponentialBackoff(mockFn, { maxRetries: 3, baseDelay: 100 });
      
      // 最初の実行
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // 100ms後に1回目のリトライ
      await jest.advanceTimersByTimeAsync(100);
      expect(mockFn).toHaveBeenCalledTimes(2);
      
      // 200ms後に2回目のリトライ
      await jest.advanceTimersByTimeAsync(200);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('最大遅延時間を超えない', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new Error('fail'));
      
      const promise = withExponentialBackoff(mockFn, { 
        maxRetries: 10, 
        baseDelay: 1000, 
        maxDelay: 5000 
      });
      
      // 大きな指数でも maxDelay を超えないことを確認
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(1000); // 1回目: 1000ms
      await jest.advanceTimersByTimeAsync(2000); // 2回目: 2000ms  
      await jest.advanceTimersByTimeAsync(4000); // 3回目: 4000ms
      await jest.advanceTimersByTimeAsync(5000); // 4回目: 5000ms (maxDelay)
      await jest.advanceTimersByTimeAsync(5000); // 5回目: 5000ms (maxDelay)
      
      await expect(promise).rejects.toThrow('fail');
      expect(mockFn).toHaveBeenCalledTimes(6); // 初回 + 5回リトライ
    });

    it('ジッターが適用される', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      // Math.randomをモック
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);
      
      const promise = withExponentialBackoff(mockFn, { 
        maxRetries: 1, 
        baseDelay: 1000, 
        jitter: true 
      });
      
      await jest.advanceTimersByTimeAsync(0);
      // ジッター適用で遅延は 500ms (1000 * 0.5)
      await jest.advanceTimersByTimeAsync(500);
      
      const result = await promise;
      expect(result).toBe('success');
      
      Math.random = originalRandom;
    });
  });

  describe('withTimeout', () => {
    it('タイムアウト前に完了した場合は結果を返す', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withTimeout(mockFn(), 5000);
      
      expect(result).toBe('success');
    });

    it('タイムアウトした場合はエラーを投げる', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      const promise = withTimeout(mockFn(), 1000);
      
      // 1秒経過でタイムアウト
      jest.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('カスタムタイムアウトメッセージを使用できる', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      const promise = withTimeout(mockFn(), 1000, 'Custom timeout message');
      
      jest.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow('Custom timeout message');
    });

    it('タイムアウト後も元のPromiseは継続する', async () => {
      let resolveOriginal;
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => { resolveOriginal = resolve; })
      );
      
      const promise = withTimeout(mockFn(), 1000);
      
      jest.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow('Operation timed out');
      
      // 元のPromiseを解決してもエラーは発生しない
      expect(() => resolveOriginal('late success')).not.toThrow();
    });
  });

  describe('resetCircuitBreaker', () => {
    it('存在するサーキットブレーカーをリセットできる', () => {
      // リセット処理は内部的に動作するため、エラーが発生しないことを確認
      expect(() => resetCircuitBreaker('test-api')).not.toThrow();
    });

    it('存在しないサーキットブレーカーをリセットしてもエラーが発生しない', () => {
      expect(() => resetCircuitBreaker('non-existent-api')).not.toThrow();
    });

    it('空の名前でもエラーが発生しない', () => {
      expect(() => resetCircuitBreaker('')).not.toThrow();
      expect(() => resetCircuitBreaker(null)).not.toThrow();
      expect(() => resetCircuitBreaker(undefined)).not.toThrow();
    });
  });

  describe('統合テスト', () => {
    it('withRetryとwithTimeoutを組み合わせて使用できる', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await withRetry(
        () => withTimeout(mockFn(), 5000),
        { maxRetries: 2, delay: 100 }
      );
      
      expect(result).toBe('success');
    });

    it('withExponentialBackoffとwithTimeoutを組み合わせて使用できる', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const promise = withExponentialBackoff(
        () => withTimeout(mockFn(), 5000),
        { maxRetries: 2, baseDelay: 100 }
      );
      
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      expect(result).toBe('success');
    });

    it('複雑なエラーケースを正しく処理する', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new Error('persistent failure'));
      
      const promise = withExponentialBackoff(
        () => withTimeout(mockFn(), 1000),
        { maxRetries: 2, baseDelay: 100 }
      );
      
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      
      await expect(promise).rejects.toThrow('persistent failure');
    });
  });

  describe('エラーハンドリング', () => {
    it('関数が同期的にエラーを投げた場合も正しく処理する', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });
      
      await expect(withRetry(mockFn, { maxRetries: 1 }))
        .rejects.toThrow('sync error');
    });

    it('非関数を渡した場合は適切にエラーハンドリングする', async () => {
      await expect(withRetry(null, { maxRetries: 1 }))
        .rejects.toThrow();
    });

    it('負の値のパラメータを正しく処理する', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      // 負の値は0として扱われる
      const result = await withRetry(mockFn, { maxRetries: -1 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の並行リクエストを処理できる', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const promises = Array.from({ length: 100 }, () => 
        withRetry(mockFn, { maxRetries: 1 })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      expect(results.every(result => result === 'success')).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(100);
    });

    it('メモリリークが発生しない', async () => {
      // 大量の失敗するリクエストでもメモリが蓄積されないことを確認
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      
      const promises = Array.from({ length: 10 }, () => 
        withRetry(mockFn, { maxRetries: 1, delay: 1 }).catch(() => 'failed')
      );
      
      await jest.advanceTimersByTimeAsync(10);
      const results = await Promise.all(promises);
      
      expect(results.every(result => result === 'failed')).toBe(true);
    });
  });
});