import logger, { replaceConsoleLog } from '../../../utils/logger';

/**
 * logger.js のユニットテスト
 * ログユーティリティとセキュリティフィルタリングのテスト
 */

// Mock process.env to test different environments
const originalEnv = process.env.NODE_ENV;

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('log method', () => {
    it('logs messages in test environment', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Test message');
      
      consoleSpy.mockRestore();
    });

    it('logs messages in development environment', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Test message');
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive information in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log({ token: 'secret123', password: 'mypassword' });
      
      expect(consoleSpy).toHaveBeenCalledWith({ token: '[MASKED]', password: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive strings', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('Bearer abcd1234567890abcd');
      
      // 長い文字列はマスクされる
      expect(consoleSpy).toHaveBeenCalledWith('abcd...abcd');
      
      consoleSpy.mockRestore();
    });

    it('does not log sensitive info in production without masking', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('This contains token information');
      
      // 機密情報を含むログは本番環境では出力されない
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('logs non-sensitive info in production', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('Safe message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Safe message');
      
      consoleSpy.mockRestore();
    });
  });

  describe('info method', () => {
    it('logs info messages in test environment', () => {
      const consoleSpy = jest.spyOn(console, 'info');
      
      logger.info('Info message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Info message');
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive info in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'info');
      
      logger.info({ authorization: 'Bearer token' });
      
      expect(consoleSpy).toHaveBeenCalledWith({ authorization: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('warn method', () => {
    it('always logs warnings with masking', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'warn');
      
      logger.warn('Warning with token');
      
      expect(consoleSpy).toHaveBeenCalledWith('Warning with token');
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive data in warnings', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      logger.warn({ secret: 'mysecret' });
      
      expect(consoleSpy).toHaveBeenCalledWith({ secret: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('error method', () => {
    it('always logs errors with masking', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'error');
      
      logger.error('Error message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error message');
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive data in errors', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      logger.error({ credential: 'secret123' });
      
      expect(consoleSpy).toHaveBeenCalledWith({ credential: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('debug method', () => {
    it('logs debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.debug('Debug message');
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug message');
      
      consoleSpy.mockRestore();
    });

    it('does not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.debug('Debug message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('masks sensitive data in debug logs', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.debug({ session: 'sessionid' });
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', { session: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('sensitive data masking', () => {
    it('masks array data with sensitive keys', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log([{ auth: 'value' }, { safe: 'value' }]);
      
      expect(consoleSpy).toHaveBeenCalledWith([{ auth: '[MASKED]' }, { safe: 'value' }]);
      
      consoleSpy.mockRestore();
    });

    it('preserves boolean values for sensitive keys', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log({ authenticated: true });
      
      expect(consoleSpy).toHaveBeenCalledWith({ authenticated: true });
      
      consoleSpy.mockRestore();
    });

    it('handles nested objects', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log({
        user: {
          name: 'John',
          token: 'secret123'
        }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith({
        user: {
          name: 'John',
          token: '[MASKED]'
        }
      });
      
      consoleSpy.mockRestore();
    });

    it('handles null and undefined values', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log(null, undefined, { token: null, password: undefined });
      
      expect(consoleSpy).toHaveBeenCalledWith(null, undefined, { token: '[MASKED]', password: '[MASKED]' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('replaceConsoleLog', () => {
    it('replaces console.log in production', () => {
      process.env.NODE_ENV = 'production';
      const originalLog = console.log;
      
      replaceConsoleLog();
      
      expect(console.log).not.toBe(originalLog);
      
      // Restore original
      console.log = originalLog;
    });

    it('does not replace console.log in development', () => {
      process.env.NODE_ENV = 'development';
      const originalLog = console.log;
      
      replaceConsoleLog();
      
      expect(console.log).toBe(originalLog);
    });
  });

  describe('edge cases', () => {
    it('handles empty arguments', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log();
      
      expect(consoleSpy).toHaveBeenCalledWith();
      
      consoleSpy.mockRestore();
    });

    it('handles mixed argument types', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      logger.log('string', 123, true, { key: 'value' }, ['array']);
      
      expect(consoleSpy).toHaveBeenCalledWith('string', 123, true, { key: 'value' }, ['array']);
      
      consoleSpy.mockRestore();
    });

    it('handles functions and symbols', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const fn = () => {};
      const sym = Symbol('test');
      
      logger.log(fn, sym);
      
      expect(consoleSpy).toHaveBeenCalledWith(fn, sym);
      
      consoleSpy.mockRestore();
    });
  });
});