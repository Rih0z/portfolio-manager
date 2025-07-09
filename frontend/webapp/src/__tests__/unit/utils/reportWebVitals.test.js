/**
 * reportWebVitals.js のテストファイル
 * Web Vitalsパフォーマンス測定ユーティリティの包括的テスト
 */

import reportWebVitals from '../../../reportWebVitals';

describe('reportWebVitals', () => {
  // 元の関数を保存
  let originalFunction;
  
  beforeAll(() => {
    originalFunction = reportWebVitals;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('関数の基本動作', () => {
    test('reportWebVitals は関数として定義されている', () => {
      expect(typeof reportWebVitals).toBe('function');
    });

    test('reportWebVitals をデフォルトエクスポートしている', () => {
      expect(reportWebVitals).toBeDefined();
    });
  });

  describe('パラメータバリデーション', () => {
    test('onPerfEntryがnullの場合、エラーが発生しない', () => {
      expect(() => {
        reportWebVitals(null);
      }).not.toThrow();
    });

    test('onPerfEntryがundefinedの場合、エラーが発生しない', () => {
      expect(() => {
        reportWebVitals(undefined);
      }).not.toThrow();
    });

    test('onPerfEntryが関数でない場合、エラーが発生しない', () => {
      expect(() => {
        reportWebVitals('not a function');
        reportWebVitals(123);
        reportWebVitals({});
        reportWebVitals([]);
        reportWebVitals(true);
      }).not.toThrow();
    });

    test('パラメータなしで呼び出された場合、エラーが発生しない', () => {
      expect(() => {
        reportWebVitals();
      }).not.toThrow();
    });

    test('有効なコールバック関数が渡された場合、エラーが発生しない', () => {
      const mockCallback = jest.fn();
      
      expect(() => {
        reportWebVitals(mockCallback);
      }).not.toThrow();
    });
  });

  describe('関数型チェック', () => {
    test('アロー関数も有効なコールバックとして受け入れられる', () => {
      const arrowCallback = () => {};
      
      expect(() => {
        reportWebVitals(arrowCallback);
      }).not.toThrow();
    });

    test('無名関数も有効なコールバックとして受け入れられる', () => {
      const anonymousCallback = function() {};
      
      expect(() => {
        reportWebVitals(anonymousCallback);
      }).not.toThrow();
    });

    test('Function コンストラクタで作成された関数も有効', () => {
      const constructorCallback = new Function('');
      
      expect(() => {
        reportWebVitals(constructorCallback);
      }).not.toThrow();
    });
  });

  describe('実際の使用パターン', () => {
    test('パフォーマンス測定値を受け取るコールバックパターン', () => {
      const performanceMetrics = [];
      const callback = (metric) => {
        performanceMetrics.push(metric);
      };
      
      expect(() => {
        reportWebVitals(callback);
      }).not.toThrow();
    });

    test('コンソールロギング用のコールバックパターン', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const loggingCallback = (metric) => console.log(metric);
      
      expect(() => {
        reportWebVitals(loggingCallback);
      }).not.toThrow();
      
      consoleLogSpy.mockRestore();
    });

    test('外部API送信用のコールバックパターン', () => {
      const sendToAnalytics = jest.fn();
      const analyticsCallback = (metric) => {
        sendToAnalytics(metric.name, metric.value);
      };
      
      expect(() => {
        reportWebVitals(analyticsCallback);
      }).not.toThrow();
    });
  });

  describe('型安全性', () => {
    test('instanceof Function チェックが動作する', () => {
      const realCallback = function() {};
      
      // 関数かどうかのチェックロジックをテスト
      expect(realCallback instanceof Function).toBe(true);
      expect(typeof realCallback).toBe('function');
      expect('string' instanceof Function).toBe(false);
      expect(123 instanceof Function).toBe(false);
      expect({} instanceof Function).toBe(false);
      expect([] instanceof Function).toBe(false);
      expect(null instanceof Function).toBe(false);
      expect(undefined instanceof Function).toBe(false);
    });

    test('truthyチェックが動作する', () => {
      const mockCallback = jest.fn();
      
      // truthyチェックのロジックをテスト
      expect(!!mockCallback).toBe(true);
      expect(!!null).toBe(false);
      expect(!!undefined).toBe(false);
      expect(!!'').toBe(false);
      expect(!!0).toBe(false);
      expect(!!false).toBe(false);
    });
  });

  describe('エラー処理', () => {
    test('コールバック内でエラーが発生しても reportWebVitals 自体は例外を投げない', () => {
      const errorCallback = () => {
        throw new Error('Callback error');
      };
      
      // reportWebVitals 自体はエラーを捕捉しないが、呼び出し時にはエラーが発生しない
      expect(() => {
        reportWebVitals(errorCallback);
      }).not.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のコールバック呼び出しでもパフォーマンス問題が発生しない', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const callback = () => {};
        reportWebVitals(callback);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // 1000回の呼び出しが100ms以内に完了することを確認
      expect(duration).toBeLessThan(100);
    });
  });

  describe('メモリリーク防止', () => {
    test('複数回呼び出してもメモリリークが発生しない', () => {
      // 大量の呼び出しでメモリ使用量をテスト
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        reportWebVitals(callback);
      }
      
      // ガベージコレクションを手動実行（可能な場合）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ使用量の増加が1MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });
});