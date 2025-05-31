const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv, NODE_ENV: 'development' };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('awsConfig additional branches', () => {
  test('SNS and STS clients use custom endpoints', () => {
    process.env.SNS_ENDPOINT = 'http://sns.local';
    process.env.STS_ENDPOINT = 'http://sts.local';

    const SNSClientMock = jest.fn(() => ({}));
    const STSClientMock = jest.fn(() => ({}));
    const DynamoDBClientMock = jest.fn(() => ({}));
    const fromMock = jest.fn(() => ({}));

    jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
    jest.doMock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: fromMock } }));
    jest.doMock('@aws-sdk/client-sns', () => ({ SNSClient: SNSClientMock }));
    jest.doMock('@aws-sdk/client-sts', () => ({ STSClient: STSClientMock }));

    const awsConfig = require('../../../src/utils/awsConfig');

    awsConfig.getSNS();
    awsConfig.getSTS();

    expect(SNSClientMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'http://sns.local',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    }));
    expect(STSClientMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'http://sts.local',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    }));
  });

  test('debug log level attaches logger functions', () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'debug';

    const DynamoDBClientMock = jest.fn(() => ({}));
    const fromMock = jest.fn(() => ({}));
    jest.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: DynamoDBClientMock }));
    jest.doMock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: fromMock } }));
    jest.mock('../../../src/utils/logger');
    const logger = require('../../../src/utils/logger');

    const awsConfig = require('../../../src/utils/awsConfig');
    awsConfig.getDynamoDb();

    const options = DynamoDBClientMock.mock.calls[0][0];
    expect(options.logger).toBeDefined();
    options.logger.debug('test');
    expect(logger.debug).toHaveBeenCalledWith('AWS SDK: test');
  });
});


