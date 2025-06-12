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

    test('nullまたはundefinedエラーはfalseを返す', () => {
      expect(isRetryableApiError(null)).toBe(false);
      expect(isRetryableApiError(undefined)).toBe(false);
      expect(isRetryableApiError(false)).toBe(false);
    });

    test('すべてのネットワークエラーコードをテスト', () => {
      const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
      networkErrors.forEach(code => {
        const err = new Error('fail');
        err.code = code;
        expect(isRetryableApiError(err)).toBe(true);
      });
    });

    test('Network Errorメッセージを含むエラーは再試行対象', () => {
      const err = new Error('Network Error occurred');
      expect(isRetryableApiError(err)).toBe(true);
    });

    test('すべてのAWSエラーコードをテスト', () => {
      const awsErrors = [
        'ProvisionedThroughputExceededException',
        'ThrottlingException',
        'RequestLimitExceeded',
        'TooManyRequestsException'
      ];
      awsErrors.forEach(code => {
        const err = new Error('AWS error');
        err.code = code;
        expect(isRetryableApiError(err)).toBe(true);
      });
    });

    test('エラーにresponseもcodeもない場合はfalse', () => {
      const err = new Error('regular error');
      expect(isRetryableApiError(err)).toBe(false);
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

    test('onRetryコールバックが呼ばれる', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce('success');
      const onRetry = jest.fn();

      const result = await withRetry(fn, { 
        maxRetries: 2, 
        baseDelay: 0, 
        onRetry 
      });

      expect(result).toBe('success');
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        0, // attempt number
        expect.any(Number) // delay
      );
    });

    test('onRetryコールバックが非同期でも動作する', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce('success');
      const onRetry = jest.fn().mockResolvedValue(undefined);

      const result = await withRetry(fn, { 
        maxRetries: 2, 
        baseDelay: 0, 
        onRetry 
      });

      expect(result).toBe('success');
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('すべての試行が失敗した場合はlastErrorがスローされる', async () => {
      const errors = [
        new Error('first error'),
        new Error('second error'),
        new Error('final error')
      ];
      let count = 0;
      const fn = jest.fn().mockImplementation(() => {
        throw errors[count++];
      });

      await expect(withRetry(fn, { maxRetries: 2, baseDelay: 0 }))
        .rejects.toThrow('final error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('デフォルトオプションで動作する', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('指数バックオフ遅延の計算', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      
      const delayValues = [];
      const onRetry = jest.fn().mockImplementation((error, attempt, delay) => {
        delayValues.push(delay);
      });

      await withRetry(fn, { 
        maxRetries: 1, 
        baseDelay: 100,
        maxDelay: 1000,
        onRetry 
      });

      expect(delayValues.length).toBe(1);
      expect(delayValues[0]).toBeGreaterThanOrEqual(100); // baseDelay
      expect(delayValues[0]).toBeLessThanOrEqual(1000); // maxDelay
    });

    test('maxDelayを超えない', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      
      const delayValues = [];
      const onRetry = jest.fn().mockImplementation((error, attempt, delay) => {
        delayValues.push(delay);
      });

      await withRetry(fn, { 
        maxRetries: 1, 
        baseDelay: 10000, // very large base delay
        maxDelay: 500,    // smaller max delay
        onRetry 
      });

      expect(delayValues[0]).toBeLessThanOrEqual(500);
    });

    test('最大試行回数に達してもエラーが続く場合はlastErrorがスローされる', async () => {
      // この場合、66行目のthrow lastErrorが実行される
      const error1 = new Error('first error');
      const error2 = new Error('second error');
      const error3 = new Error('final error');
      
      let count = 0;
      const fn = jest.fn().mockImplementation(() => {
        if (count === 0) {
          count++;
          throw error1;
        } else if (count === 1) {
          count++;
          throw error2;
        } else {
          throw error3;
        }
      });

      try {
        await withRetry(fn, { maxRetries: 2, baseDelay: 0 });
        fail('Should have thrown an error');
      } catch (thrownError) {
        // 最後のエラー（error3）がスローされることを確認
        expect(thrownError).toBe(error3);
        expect(thrownError.message).toBe('final error');
      }
      
      expect(fn).toHaveBeenCalledTimes(3); // 初回 + 2回の再試行
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
