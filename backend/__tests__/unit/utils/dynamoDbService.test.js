/**
 * ファイルパス: __tests__/unit/utils/dynamoDbService.test.js
 *
 * dynamoDbServiceユーティリティのユニットテスト
 * marshall/unmarshall関連関数の挙動を検証する
 */

const modulePath = '../../../src/utils/dynamoDbService';

beforeEach(() => {
  jest.resetModules();
  jest.doMock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockReturnValue({ send: jest.fn() }),
    GetItemCommand: jest.fn(),
    PutItemCommand: jest.fn(),
    UpdateItemCommand: jest.fn(),
    DeleteItemCommand: jest.fn(),
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn()
  }));

  const marshallMock = jest.fn(obj => ({ marshalled: obj }));
  const unmarshallMock = jest.fn(obj => ({ unmarshalled: obj }));
  jest.doMock('@aws-sdk/util-dynamodb', () => ({ marshall: marshallMock, unmarshall: unmarshallMock }));
});

afterEach(() => {
  jest.resetModules();
});

describe('dynamoDbService utility', () => {
  test('marshallItem and unmarshallItem wrap AWS util functions', () => {
    const service = require(modulePath);
    const item = { id: 1 };
    const marshalled = service.marshallItem(item);
    const result = service.unmarshallItem(marshalled);
    expect(marshalled).toEqual({ marshalled: item });
    expect(result).toEqual({ unmarshalled: { marshalled: item } });
  });

  test('unmarshallItem returns null for falsy input', () => {
    const service = require(modulePath);
    expect(service.unmarshallItem(null)).toBeNull();
  });

  test('unmarshallItems maps array of items', () => {
    const service = require(modulePath);
    const items = [{ a: 1 }, { b: 2 }];
    const result = service.unmarshallItems(items);
    expect(result).toEqual([
      { unmarshalled: { a: 1 } },
      { unmarshalled: { b: 2 } }
    ]);
  });
});
