/**
 * ファイルパス: __tests__/unit/utils/awsConfig.test.js
 *
 * awsConfigユーティリティのユニットテスト
 * AWSクライアント生成ロジックと環境フラグを検証する
 */

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('awsConfig utility', () => {
  test('development endpoint and credentials are applied', () => {
    process.env.NODE_ENV = 'development';
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';

    const DynamoDBClientMock = jest.fn().mockImplementation(() => ({}));
    const fromMock = jest.fn().mockImplementation(() => ({}));

    jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
    jest.doMock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: fromMock } }));

    const awsConfig = require('../../../src/utils/awsConfig');
    awsConfig.getDynamoDb();

    expect(DynamoDBClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://localhost:8000',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
      })
    );
    expect(fromMock).toHaveBeenCalled();
  });

  test('resetAWSConfig clears cached clients', () => {
    process.env.NODE_ENV = 'development';

    const DynamoDBClientMock = jest.fn().mockImplementation(() => ({}));
    const fromMock = jest.fn().mockImplementation(() => ({}));

    jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
    jest.doMock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: fromMock } }));

    const awsConfig = require('../../../src/utils/awsConfig');
    const first = awsConfig.getDynamoDb();
    awsConfig.resetAWSConfig();
    const second = awsConfig.getDynamoDb();
    expect(first).not.toBe(second);
  });

  test('environment flags reflect NODE_ENV', () => {
    process.env.NODE_ENV = 'test';

    const DynamoDBClientMock = jest.fn().mockReturnValue({});
    const fromMock = jest.fn().mockReturnValue({});

    jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
    jest.doMock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: fromMock } }));

    const awsConfig = require('../../../src/utils/awsConfig');
    expect(awsConfig.isTest).toBe(true);
    expect(awsConfig.isDevelopment).toBe(false);
    expect(awsConfig.isProduction).toBe(false);
  });

  describe('all AWS service clients', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    test('getDynamoDbClient returns cached instance', () => {
      const DynamoDBClientMock = jest.fn().mockImplementation(() => ({ _isClient: true }));
      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      const first = awsConfig.getDynamoDbClient();
      const second = awsConfig.getDynamoDbClient();
      
      expect(first).toBe(second); // Same instance returned (cached)
      expect(DynamoDBClientMock).toHaveBeenCalledTimes(1); // Called only once
    });

    test('getDynamoDb (DocumentClient) returns cached instance', () => {
      const DynamoDBClientMock = jest.fn().mockImplementation(() => ({ _isLowLevel: true }));
      const fromMock = jest.fn().mockImplementation(() => ({ _isHighLevel: true }));

      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
      jest.doMock('@aws-sdk/lib-dynamodb', () => ({ 
        DynamoDBDocumentClient: { from: fromMock }
      }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      const first = awsConfig.getDynamoDb();
      const second = awsConfig.getDynamoDb();
      
      expect(first).toBe(second); // Same DocumentClient instance returned (cached)
      expect(fromMock).toHaveBeenCalledTimes(1); // from() called only once
    });

    test('getSNS client works correctly', () => {
      const SNSClientMock = jest.fn().mockImplementation(() => ({ _isSNS: true }));
      jest.doMock('@aws-sdk/client-sns', () => ({ SNSClient: SNSClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      const first = awsConfig.getSNS();
      const second = awsConfig.getSNS();
      
      expect(first).toBe(second); // Cached
      expect(SNSClientMock).toHaveBeenCalledTimes(1);
    });

    test('getSTS client works correctly', () => {
      const STSClientMock = jest.fn().mockImplementation(() => ({ _isSTS: true }));
      jest.doMock('@aws-sdk/client-sts', () => ({ STSClient: STSClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      const first = awsConfig.getSTS();
      const second = awsConfig.getSTS();
      
      expect(first).toBe(second); // Cached
      expect(STSClientMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('environment-specific configurations', () => {
    test('test environment with specific endpoints', () => {
      process.env.NODE_ENV = 'test';
      process.env.SNS_ENDPOINT = 'http://localhost:4569';
      process.env.STS_ENDPOINT = 'http://localhost:4570';

      const SNSClientMock = jest.fn().mockImplementation(() => ({}));
      const STSClientMock = jest.fn().mockImplementation(() => ({}));

      jest.doMock('@aws-sdk/client-sns', () => ({ SNSClient: SNSClientMock }));
      jest.doMock('@aws-sdk/client-sts', () => ({ STSClient: STSClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      awsConfig.getSNS();
      awsConfig.getSTS();

      expect(SNSClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:4569',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
        })
      );

      expect(STSClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:4570',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
        })
      );
    });

    test('global AWS_ENDPOINT fallback', () => {
      process.env.NODE_ENV = 'development';
      process.env.AWS_ENDPOINT = 'http://localhost:4566'; // LocalStack default
      delete process.env.DYNAMODB_ENDPOINT;
      delete process.env.SNS_ENDPOINT;
      delete process.env.STS_ENDPOINT;

      const DynamoDBClientMock = jest.fn().mockImplementation(() => ({}));
      const SNSClientMock = jest.fn().mockImplementation(() => ({}));
      const STSClientMock = jest.fn().mockImplementation(() => ({}));

      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
      jest.doMock('@aws-sdk/client-sns', () => ({ SNSClient: SNSClientMock }));
      jest.doMock('@aws-sdk/client-sts', () => ({ STSClient: STSClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      awsConfig.getDynamoDbClient();
      awsConfig.getSNS();
      awsConfig.getSTS();

      // All should use the global AWS_ENDPOINT
      expect(DynamoDBClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:4566',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
        })
      );

      expect(SNSClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:4566',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
        })
      );

      expect(STSClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:4566',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
        })
      );
    });

    test('production environment without endpoints', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AWS_ENDPOINT;
      delete process.env.DYNAMODB_ENDPOINT;
      delete process.env.SNS_ENDPOINT;
      delete process.env.STS_ENDPOINT;

      const DynamoDBClientMock = jest.fn().mockImplementation(() => ({}));
      const SNSClientMock = jest.fn().mockImplementation(() => ({}));
      const STSClientMock = jest.fn().mockImplementation(() => ({}));

      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
      jest.doMock('@aws-sdk/client-sns', () => ({ SNSClient: SNSClientMock }));
      jest.doMock('@aws-sdk/client-sts', () => ({ STSClient: STSClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      
      awsConfig.getDynamoDbClient();
      awsConfig.getSNS();
      awsConfig.getSTS();

      // Should not have endpoint or test credentials
      expect(DynamoDBClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'ap-northeast-1'
        })
      );
      expect(DynamoDBClientMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          endpoint: expect.anything(),
          credentials: expect.anything()
        })
      );
    });
  });

  describe('debug logging', () => {
    test('debug mode enables AWS SDK logging', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'debug';

      const loggerMock = {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      jest.doMock('../../../src/utils/logger', () => loggerMock);

      const DynamoDBClientMock = jest.fn().mockImplementation((options) => {
        // Simulate AWS SDK logger usage
        if (options.logger) {
          options.logger.debug('Test AWS SDK debug message');
          options.logger.info('Test AWS SDK info message');
          options.logger.warn('Test AWS SDK warn message');
          options.logger.error('Test AWS SDK error message');
        }
        return {};
      });

      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      awsConfig.getDynamoDbClient();

      expect(DynamoDBClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.objectContaining({
            debug: expect.any(Function),
            info: expect.any(Function),
            warn: expect.any(Function),
            error: expect.any(Function)
          })
        })
      );
    });

    test('non-debug mode does not include logger', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';

      const DynamoDBClientMock = jest.fn().mockImplementation(() => ({}));
      jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));

      const awsConfig = require('../../../src/utils/awsConfig');
      awsConfig.getDynamoDbClient();

      expect(DynamoDBClientMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          logger: expect.anything()
        })
      );
    });
  });

  describe('environment variables and defaults', () => {
    test('all environment variables are properly handled', () => {
      const awsConfig = require('../../../src/utils/awsConfig');
      
      // Test ENV object export
      expect(awsConfig.ENV).toEqual(
        expect.objectContaining({
          NODE_ENV: expect.any(String),
          REGION: expect.any(String),
          LOG_LEVEL: expect.any(String)
        })
      );
    });

    test('different environment flags', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      
      const awsConfig = require('../../../src/utils/awsConfig');
      expect(awsConfig.isProduction).toBe(true);
      expect(awsConfig.isDevelopment).toBe(false);
      expect(awsConfig.isTest).toBe(false);
    });
  });
});
