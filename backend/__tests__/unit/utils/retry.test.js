/**
 * ファイルパス: __tests__/unit/utils/retry.test.js
 *
 * retryユーティリティのテスト
 */

const { withRetry, isRetryableApiError, sleep } = require('../../../src/utils/retry');

describe('retry utilities', () => {
  describe('isRetryableApiError', () => {
    test('ネットワーク系エラーコードを再試行対象と判定', () => {
      const err = new Error('fail');
      err.code = 'ECONNRESET';
      expect(isRetryableApiError(err)).toBe(true);
    });

    test('HTTP 500系や429は再試行対象', () => {
      const err = { response: { status: 503 } };
      expect(isRetryableApiError(err)).toBe(true);
      const err2 = { response: { status: 429 } };
      expect(isRetryableApiError(err2)).toBe(true);
    });

    test('その他のエラーは再試行しない', () => {
      const err = { response: { status: 404 } };
      expect(isRetryableApiError(err)).toBe(false);
    });

    test('AWSのスロットリングエラーは再試行対象', () => {
      const err = new Error('throttle');
      err.code = 'ThrottlingException';
      expect(isRetryableApiError(err)).toBe(true);
    });
  });

  describe('withRetry', () => {
    test('成功するまで再試行する', async () => {
      let count = 0;
      const fn = jest.fn().mockImplementation(() => {
        count += 1;
        if (count < 2) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('ok');
      });

      const result = await withRetry(fn, { maxRetries: 2, baseDelay: 0 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('最大回数を超えるとエラーをスロー', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(withRetry(fn, { maxRetries: 1, baseDelay: 0 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('shouldRetryがfalseを返した場合は再試行しない', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const shouldRetry = jest.fn().mockReturnValue(false);
      await expect(withRetry(fn, { maxRetries: 3, baseDelay: 0, shouldRetry })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleep', () => {
    test('指定時間待機する', async () => {
      jest.useFakeTimers();
      const promise = sleep(50);
      jest.advanceTimersByTime(50);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });
});
