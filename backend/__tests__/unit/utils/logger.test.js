/**
 * ファイルパス: __tests__/unit/utils/logger.test.js
 * 
 * ロギングユーティリティのユニットテスト
 * リクエスト情報やエラー情報などのログ出力機能をテストします
 * 
 * @created 2025-05-18
 */

// テスト対象モジュールのインポート
const logger = require('../../../src/utils/logger');

describe('Logger Utility', () => {
  // コンソール出力をモックにしてキャプチャ
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  
  // 元の環境変数を保存
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogLevel = process.env.LOG_LEVEL;
  
  beforeEach(() => {
    // 各テスト前にコンソールメソッドのスパイを設定
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // 環境変数をリセット
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    delete process.env.LOG_LEVEL;
  });
  
  afterEach(() => {
    // 各テスト後にスパイをリセット
    jest.clearAllMocks();
  });

  afterAll(() => {
    // テスト後に環境変数を元に戻す
    process.env.NODE_ENV = originalNodeEnv;
    if (originalLogLevel) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });
  
  describe('ログレベルの動作', () => {
    test('テスト環境ではデフォルトでエラーレベルのみ出力される', () => {
      logger.debug('デバッグメッセージ');
      logger.info('情報メッセージ');
      logger.warn('警告メッセージ');
      logger.error('エラーメッセージ');
      
      // debug, info は出力されない
      expect(consoleLogSpy).not.toHaveBeenCalled();
      // warn は出力されない
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      // error は出力される
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] エラーメッセージ'));
    });
    
    test('ログレベルを変更すると出力が変わる', () => {
      process.env.LOG_LEVEL = 'INFO';
      
      // このモジュールはシングルトンなので、テスト用にリロードする必要がある
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.debug('デバッグメッセージ');
      reloadedLogger.info('情報メッセージ');
      reloadedLogger.warn('警告メッセージ');
      reloadedLogger.error('エラーメッセージ');
      
      // debug は出力されない
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // info のみが console.log を使用
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] 情報メッセージ'));
      
      // warn は出力される
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] 警告メッセージ'));
      
      // error は出力される
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] エラーメッセージ'));
    });
    
    test('開発環境では詳細なログが出力される', () => {
      process.env.NODE_ENV = 'development';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.debug('デバッグメッセージ');
      
      // 開発環境ではデバッグメッセージも出力される
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] デバッグメッセージ'));
    });
  });
  
  describe('ログフォーマット', () => {
    test('ログには日時とレベルが含まれる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.info('テストメッセージ');
      
      // ISO形式のタイムスタンプとログレベルを確認
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] テストメッセージ/)
      );
    });
    
    test('オブジェクトは自動的にJSON文字列化される', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const testObj = { key: 'value', nested: { data: 123 } };
      reloadedLogger.info('オブジェクト:', testObj);
      
      // オブジェクトがJSON文字列に変換されていることを確認
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value","nested":{"data":123}}')
      );
    });
    
    test('エラーオブジェクトはスタックトレースが出力される', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const testError = new Error('テストエラー');
      reloadedLogger.error('エラー発生:', testError);
      
      // エラーのスタックトレースが含まれていることを確認
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: テストエラー')
      );
    });
  });
  
  describe('ログヘルパー関数', () => {
    test('log関数はinfo関数のエイリアス', () => {
      process.env.LOG_LEVEL = 'INFO';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.log('ログメッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] ログメッセージ'));
    });
    
    test('critical関数は重大なエラーを出力する', () => {
      reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.critical('重大なエラー');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[CRITICAL] 重大なエラー'));
    });
    
    test('getLogConfig関数は現在のログ設定を返す', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'WARN';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const config = reloadedLogger.getLogConfig();
      
      expect(config).toEqual({
        level: 'WARN',
        environment: 'production',
        isProduction: true,
        isDevelopment: false,
        isTest: false
      });
    });
  });
  
  describe('多引数ログ出力', () => {
    test('複数の引数を出力できる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.info('メッセージ1', 'メッセージ2', 123, { a: 1 });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('メッセージ1 メッセージ2 123 {"a":1}')
      );
    });
  });
});
