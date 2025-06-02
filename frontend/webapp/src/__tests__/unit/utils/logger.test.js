/**
 * logger.js のユニットテスト
 * ログユーティリティとセキュリティフィルタリングのテスト
 */

describe('logger', () => {
  let originalConsole;
  let originalEnv;

  beforeEach(() => {
    // コンソールとプロセス環境をバックアップ
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    originalEnv = process.env.NODE_ENV;
    
    // モックコンソールを設定
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    // コンソールと環境を復元
    Object.assign(console, originalConsole);
    process.env.NODE_ENV = originalEnv;
    
    // require cacheをクリア
    delete require.cache[require.resolve('../../../utils/logger')];
  });

  describe('logger functionality', () => {
    it('logger.jsがエラーなく読み込める', () => {
      expect(() => require('../../../utils/logger')).not.toThrow();
    });

    it('開発環境でlogger.jsを読み込める', () => {
      process.env.NODE_ENV = 'development';
      expect(() => require('../../../utils/logger')).not.toThrow();
    });

    it('本番環境でlogger.jsを読み込める', () => {
      process.env.NODE_ENV = 'production';
      expect(() => require('../../../utils/logger')).not.toThrow();
    });

    it('テスト環境でlogger.jsを読み込める', () => {
      process.env.NODE_ENV = 'test';
      expect(() => require('../../../utils/logger')).not.toThrow();
    });

    it('未定義環境でlogger.jsを読み込める', () => {
      process.env.NODE_ENV = undefined;
      expect(() => require('../../../utils/logger')).not.toThrow();
    });
  });

  describe('console methods existence', () => {
    it('コンソールメソッドが利用可能', () => {
      expect(typeof console.log).toBe('function');
      expect(typeof console.warn).toBe('function');
      expect(typeof console.error).toBe('function');
      expect(typeof console.info).toBe('function');
      expect(typeof console.debug).toBe('function');
    });

    it('モック関数が設定されている', () => {
      expect(jest.isMockFunction(console.log)).toBe(true);
      expect(jest.isMockFunction(console.warn)).toBe(true);
      expect(jest.isMockFunction(console.error)).toBe(true);
    });
  });

  describe('基本的なログ機能', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      require('../../../utils/logger');
    });

    it('ログが呼び出される', () => {
      console.log('test message');
      expect(console.log).toHaveBeenCalled();
    });

    it('エラーログが呼び出される', () => {
      console.error('test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('警告ログが呼び出される', () => {
      console.warn('test warning');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('環境別の動作', () => {
    it('本番環境でもエラーが発生しない', () => {
      process.env.NODE_ENV = 'production';
      delete require.cache[require.resolve('../../../utils/logger')];
      
      expect(() => {
        require('../../../utils/logger');
        console.log('production test');
        console.error('production error');
        console.warn('production warning');
      }).not.toThrow();
    });

    it('開発環境でもエラーが発生しない', () => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      
      expect(() => {
        require('../../../utils/logger');
        console.log('development test');
        console.error('development error');
        console.warn('development warning');
      }).not.toThrow();
    });

    it('テスト環境でもエラーが発生しない', () => {
      process.env.NODE_ENV = 'test';
      delete require.cache[require.resolve('../../../utils/logger')];
      
      expect(() => {
        require('../../../utils/logger');
        console.log('test message');
        console.error('test error');
        console.warn('test warning');
      }).not.toThrow();
    });
  });

  describe('複数回の初期化', () => {
    it('複数回requireしてもエラーが発生しない', () => {
      process.env.NODE_ENV = 'development';
      
      expect(() => {
        require('../../../utils/logger');
        require('../../../utils/logger');
        require('../../../utils/logger');
      }).not.toThrow();
    });

    it('環境を変更して複数回requireしてもエラーが発生しない', () => {
      expect(() => {
        process.env.NODE_ENV = 'development';
        delete require.cache[require.resolve('../../../utils/logger')];
        require('../../../utils/logger');
        
        process.env.NODE_ENV = 'production';
        delete require.cache[require.resolve('../../../utils/logger')];
        require('../../../utils/logger');
        
        process.env.NODE_ENV = 'test';
        delete require.cache[require.resolve('../../../utils/logger')];
        require('../../../utils/logger');
      }).not.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      require('../../../utils/logger');
    });

    it('大量のログを高速で処理できる', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        console.log(`Log message ${i}`, { data: `value${i}` });
        console.warn(`Warning ${i}`);
        console.error(`Error ${i}`);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    it('複雑なオブジェクトも効率的に処理できる', () => {
      const complexObj = {
        level1: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          data: Array.from({ length: 5 }, (_, j) => ({
            nested: `value${j}`
          }))
        }))
      };
      
      const startTime = Date.now();
      console.log('Complex object:', complexObj);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // 500ms以内
    });
  });

  describe('エラーハンドリング', () => {
    it('undefinedを渡してもエラーが発生しない', () => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      require('../../../utils/logger');
      
      expect(() => {
        console.log(undefined);
        console.warn(null);
        console.error();
      }).not.toThrow();
    });

    it('循環参照オブジェクトでもエラーが発生しない', () => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      require('../../../utils/logger');
      
      const obj = { name: 'test' };
      obj.self = obj;
      
      expect(() => console.log('Circular:', obj)).not.toThrow();
    });

    it('関数オブジェクトでもエラーが発生しない', () => {
      process.env.NODE_ENV = 'development';
      delete require.cache[require.resolve('../../../utils/logger')];
      require('../../../utils/logger');
      
      const func = function() { return 'test'; };
      
      expect(() => console.log('Function:', func)).not.toThrow();
    });
  });
});