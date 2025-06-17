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
      delete process.env.LOG_LEVEL; // LOG_LEVELを削除してデフォルト値を使用
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.info('情報メッセージ');
      
      // 開発環境ではINFOレベルがデフォルトなのでINFOが出力される
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] 情報メッセージ'));
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

  describe('stringify関数のエッジケース', () => {
    test('循環参照があるオブジェクトを処理できる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      // 循環参照オブジェクトを作成
      const obj = { name: 'test' };
      obj.self = obj;
      
      reloadedLogger.info('循環参照:', obj);
      
      // JSON.stringifyが失敗した場合は[Object]が出力される
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Object]')
      );
    });
    
    test('nullオブジェクトを処理できる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.info('null値:', null);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('null')
      );
    });

    test('undefinedを処理できる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      reloadedLogger.info('undefined:', undefined);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('undefined')
      );
    });

    test('エラーオブジェクト（スタック無し）を処理できる', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      // スタックトレースのないエラー
      const errorWithoutStack = new Error('テストエラー');
      delete errorWithoutStack.stack;
      
      reloadedLogger.info('エラー（スタック無し）:', errorWithoutStack);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('テストエラー')
      );
    });
  });

  describe('環境別デフォルトログレベル', () => {
    test('本番環境ではWARNレベルがデフォルト', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const config = reloadedLogger.getLogConfig();
      
      expect(config.level).toBe('WARN');
      expect(config.isProduction).toBe(true);
    });

    test('unknown環境ではWARNレベルがデフォルト', () => {
      process.env.NODE_ENV = 'unknown';
      delete process.env.LOG_LEVEL;
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const config = reloadedLogger.getLogConfig();
      
      expect(config.level).toBe('WARN');
      expect(config.environment).toBe('unknown');
    });

    test('環境変数が未設定の場合', () => {
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const config = reloadedLogger.getLogConfig();
      
      expect(config.environment).toBe('unknown');
    });
  });

  describe('ログレベル優先度の境界値テスト', () => {
    test('未知のログレベルが指定された場合のデフォルト動作', () => {
      process.env.LOG_LEVEL = 'UNKNOWN_LEVEL';
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      // 未知のレベルは0として扱われるため、すべてのメッセージが出力される
      reloadedLogger.debug('デバッグ');
      reloadedLogger.info('情報');
      reloadedLogger.warn('警告');
      reloadedLogger.error('エラー');
      reloadedLogger.critical('致命的');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug, info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // warn
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error, critical
    });
  });
  
  describe('shouldLog関数の完全テスト', () => {
    test('各ログレベルの動作確認', () => {
      // DEBUGレベルでテスト
      process.env.LOG_LEVEL = 'DEBUG';
      jest.resetModules();
      let reloadedLogger = require('../../../src/utils/logger');
      
      // すべてのレベルが出力される
      reloadedLogger.debug('DEBUG');
      reloadedLogger.info('INFO');
      reloadedLogger.warn('WARN');
      reloadedLogger.error('ERROR');
      reloadedLogger.critical('CRITICAL');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug, info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error, critical
      
      // テストをリセット
      jest.clearAllMocks();
      
      // CRITICALレベルでテスト
      process.env.LOG_LEVEL = 'CRITICAL';
      jest.resetModules();
      reloadedLogger = require('../../../src/utils/logger');
      
      // CRITICALのみが出力される
      reloadedLogger.debug('DEBUG');
      reloadedLogger.info('INFO');
      reloadedLogger.warn('WARN');
      reloadedLogger.error('ERROR');
      reloadedLogger.critical('CRITICAL');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // critical only
    });
  });

  describe('完全な環境設定テスト', () => {
    test('デフォルト環境での三項演算子の完全カバレッジ', () => {
      // 完全に設定を削除
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;
      
      // モジュールをリロード
      jest.resetModules();
      const reloadedLogger = require('../../../src/utils/logger');
      
      const config = reloadedLogger.getLogConfig();
      
      // デフォルト値を確認（NODE_ENVが無いのでunknown、LOG_LEVELが無いのでWARN）
      expect(config.level).toBe('WARN');
      expect(config.environment).toBe('unknown');
      expect(config.isProduction).toBe(false);
      expect(config.isDevelopment).toBe(false);
      expect(config.isTest).toBe(false);
      
      // WARNレベルでの動作確認
      reloadedLogger.debug('デバッグ');
      reloadedLogger.info('情報');
      reloadedLogger.warn('警告');
      reloadedLogger.error('エラー');
      reloadedLogger.critical('致命的');
      
      // DEBUG、INFOは出力されない
      expect(consoleLogSpy).not.toHaveBeenCalled();
      // WARNは出力される
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      // ERROR、CRITICALは出力される
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    test('全環境での三項演算子の分岐を確実にカバー', () => {
      // 1. isProduction = true の場合をテスト
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      let reloadedLogger = require('../../../src/utils/logger');
      expect(reloadedLogger.getLogConfig().level).toBe('WARN');
      
      // 2. isDevelopment = true の場合をテスト
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      reloadedLogger = require('../../../src/utils/logger');
      expect(reloadedLogger.getLogConfig().level).toBe('INFO');
      
      // 3. isTest = true の場合をテスト
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      reloadedLogger = require('../../../src/utils/logger');
      expect(reloadedLogger.getLogConfig().level).toBe('ERROR');
      
      // 4. 全部false の場合（デフォルト）をテスト
      process.env.NODE_ENV = 'staging'; // production, development, test以外
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      reloadedLogger = require('../../../src/utils/logger');
      expect(reloadedLogger.getLogConfig().level).toBe('WARN');
      
      // 5. LOG_LEVELが設定されている場合は、それが優先される
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'CRITICAL';
      
      jest.resetModules();
      reloadedLogger = require('../../../src/utils/logger');
      expect(reloadedLogger.getLogConfig().level).toBe('CRITICAL');
    });
  });
});
