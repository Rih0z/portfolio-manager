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
});
