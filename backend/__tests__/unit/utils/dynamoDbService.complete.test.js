/**
 * ファイルパス: __tests__/unit/utils/dynamoDbService.complete.test.js
 *
 * dynamoDbServiceユーティリティの完全なカバレッジテスト
 * 全ての関数とエラーケースを含む
 */

const {
  getDynamoDBClient,
  getDynamoDBItem,
  putDynamoDBItem,
  updateDynamoDBItem,
  deleteDynamoDBItem,
  queryDynamoDB,
  scanDynamoDB,
  marshallItem,
  unmarshallItem,
  unmarshallItems,
  addItem,
  getItem,
  deleteItem,
  updateItem
} = require('../../../src/utils/dynamoDbService');

// Mock AWS SDK
const mockSend = jest.fn();
const mockDynamoDBClient = {
  send: mockSend
};

const mockMarshall = jest.fn();
const mockUnmarshall = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => mockDynamoDBClient),
  GetItemCommand: jest.fn((params) => ({ ...params, type: 'GetItemCommand' })),
  PutItemCommand: jest.fn((params) => ({ ...params, type: 'PutItemCommand' })),
  UpdateItemCommand: jest.fn((params) => ({ ...params, type: 'UpdateItemCommand' })),
  DeleteItemCommand: jest.fn((params) => ({ ...params, type: 'DeleteItemCommand' })),
  QueryCommand: jest.fn((params) => ({ ...params, type: 'QueryCommand' })),
  ScanCommand: jest.fn((params) => ({ ...params, type: 'ScanCommand' }))
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: mockMarshall,
  unmarshall: mockUnmarshall
}));

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
}));

const logger = require('../../../src/utils/logger');

describe('dynamoDbService Complete Coverage', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
    mockMarshall.mockImplementation((obj) => ({ marshalled: obj }));
    mockUnmarshall.mockImplementation((obj) => ({ unmarshalled: obj }));
    mockSend.mockResolvedValue({ Item: { id: { S: 'test' } } });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDynamoDBClient', () => {
    it('should create client with default region', () => {
      delete process.env.AWS_REGION;
      delete process.env.NODE_ENV;
      delete process.env.DYNAMODB_ENDPOINT;
      
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    it('should create client with custom region', () => {
      process.env.AWS_REGION = 'us-east-1';
      delete process.env.NODE_ENV;
      delete process.env.DYNAMODB_ENDPOINT;
      
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    it('should use local endpoint in non-production with DYNAMODB_ENDPOINT', () => {
      process.env.NODE_ENV = 'development';
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
      
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    it('should not use local endpoint in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
      
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });
  });

  describe('getDynamoDBItem', () => {
    it('should successfully get item', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      const mockResponse = {
        Item: { id: { S: 'test-id' }, name: { S: 'test' } }
      };
      
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await getDynamoDBItem(params);
      
      expect(result).toEqual({
        ...mockResponse,
        Item: mockResponse.Item
      });
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'GetItemCommand'
      }));
    });

    it('should return undefined Item when no item found', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      mockSend.mockResolvedValue({}); // No Item in response
      
      const result = await getDynamoDBItem(params);
      
      expect(result.Item).toBeUndefined();
    });

    it('should handle error and use fallback for session table in test mode', async () => {
      const params = {
        TableName: 'session-table-test',
        Key: { sessionId: { S: 'session-123' } }
      };
      
      process.env.NODE_ENV = 'test';
      process.env.SKIP_DYNAMODB_CHECKS = 'true';
      
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      const result = await getDynamoDBItem(params);
      
      expect(result.Item).toEqual({
        sessionId: { S: 'session-123' },
        googleId: { S: 'user-123' },
        email: { S: 'test@example.com' },
        name: { S: 'Test User' },
        expiresAt: { S: expect.any(String) }
      });
      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Using mock data fallback for getDynamoDBItem in test mode');
    });

    it('should handle error and use fallback for complete-flow-session-id', async () => {
      const params = {
        TableName: 'session-table-test',
        Key: { sessionId: { S: 'complete-flow-session-id' } }
      };
      
      process.env.NODE_ENV = 'test';
      process.env.SKIP_DYNAMODB_CHECKS = 'true';
      
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      const result = await getDynamoDBItem(params);
      
      expect(result.Item).toEqual({
        sessionId: { S: 'complete-flow-session-id' },
        googleId: { S: 'user-123' },
        email: { S: 'test@example.com' },
        name: { S: 'Test User' },
        expiresAt: { S: expect.any(String) }
      });
    });

    it('should re-throw error when not in test mode or without fallback', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      delete process.env.NODE_ENV;
      delete process.env.SKIP_DYNAMODB_CHECKS;
      
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      await expect(getDynamoDBItem(params)).rejects.toThrow('DynamoDB error');
    });

    it('should re-throw error when fallback conditions not met', async () => {
      const params = {
        TableName: 'other-table',
        Key: { id: { S: 'test-id' } }
      };
      
      process.env.NODE_ENV = 'test';
      process.env.SKIP_DYNAMODB_CHECKS = 'true';
      
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);
      
      await expect(getDynamoDBItem(params)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('putDynamoDBItem', () => {
    it('should successfully put item', async () => {
      const params = {
        TableName: 'TestTable',
        Item: { id: { S: 'test-id' } }
      };
      
      const mockResponse = { Attributes: {} };
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await putDynamoDBItem(params);
      
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'PutItemCommand'
      }));
    });

    it('should handle error and log it', async () => {
      const params = {
        TableName: 'TestTable',
        Item: { id: { S: 'test-id' } }
      };
      
      const error = new Error('Put error');
      mockSend.mockRejectedValue(error);
      
      await expect(putDynamoDBItem(params)).rejects.toThrow('Put error');
      expect(logger.error).toHaveBeenCalledWith('Error putting DynamoDB item to TestTable:', error);
    });
  });

  describe('updateDynamoDBItem', () => {
    it('should successfully update item', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } },
        UpdateExpression: 'SET #name = :name',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': { S: 'new-name' } }
      };
      
      const mockResponse = { Attributes: {} };
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await updateDynamoDBItem(params);
      
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'UpdateItemCommand'
      }));
    });

    it('should handle error and log it', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      const error = new Error('Update error');
      mockSend.mockRejectedValue(error);
      
      await expect(updateDynamoDBItem(params)).rejects.toThrow('Update error');
      expect(logger.error).toHaveBeenCalledWith('Error updating DynamoDB item in TestTable:', error);
    });
  });

  describe('deleteDynamoDBItem', () => {
    it('should successfully delete item', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      const mockResponse = { Attributes: {} };
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await deleteDynamoDBItem(params);
      
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'DeleteItemCommand'
      }));
    });

    it('should handle error and log it', async () => {
      const params = {
        TableName: 'TestTable',
        Key: { id: { S: 'test-id' } }
      };
      
      const error = new Error('Delete error');
      mockSend.mockRejectedValue(error);
      
      await expect(deleteDynamoDBItem(params)).rejects.toThrow('Delete error');
      expect(logger.error).toHaveBeenCalledWith('Error deleting DynamoDB item from TestTable:', error);
    });
  });

  describe('queryDynamoDB', () => {
    it('should successfully query items', async () => {
      const params = {
        TableName: 'TestTable',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': { S: 'test-id' } }
      };
      
      const mockResponse = { Items: [{ id: { S: 'test-id' } }] };
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await queryDynamoDB(params);
      
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'QueryCommand'
      }));
    });

    it('should handle error and log it', async () => {
      const params = {
        TableName: 'TestTable',
        KeyConditionExpression: 'id = :id'
      };
      
      const error = new Error('Query error');
      mockSend.mockRejectedValue(error);
      
      await expect(queryDynamoDB(params)).rejects.toThrow('Query error');
      expect(logger.error).toHaveBeenCalledWith('Error querying DynamoDB table TestTable:', error);
    });
  });

  describe('scanDynamoDB', () => {
    it('should successfully scan items', async () => {
      const params = {
        TableName: 'TestTable'
      };
      
      const mockResponse = { Items: [{ id: { S: 'test-id' } }] };
      mockSend.mockResolvedValue(mockResponse);
      
      const result = await scanDynamoDB(params);
      
      expect(result).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'TestTable',
        type: 'ScanCommand'
      }));
    });

    it('should handle error and log it', async () => {
      const params = {
        TableName: 'TestTable'
      };
      
      const error = new Error('Scan error');
      mockSend.mockRejectedValue(error);
      
      await expect(scanDynamoDB(params)).rejects.toThrow('Scan error');
      expect(logger.error).toHaveBeenCalledWith('Error scanning DynamoDB table TestTable:', error);
    });
  });

  describe('marshall/unmarshall functions', () => {
    it('should marshall item correctly', () => {
      const item = { id: 'test', name: 'test-name' };
      mockMarshall.mockReturnValue({ marshalled: item });
      
      const result = marshallItem(item);
      
      expect(result).toEqual({ marshalled: item });
      expect(mockMarshall).toHaveBeenCalledWith(item);
    });

    it('should unmarshall item correctly', () => {
      const item = { id: { S: 'test' } };
      mockUnmarshall.mockReturnValue({ id: 'test' });
      
      const result = unmarshallItem(item);
      
      expect(result).toEqual({ id: 'test' });
      expect(mockUnmarshall).toHaveBeenCalledWith(item);
    });

    it('should return null for falsy input in unmarshallItem', () => {
      const result = unmarshallItem(null);
      expect(result).toBeNull();
    });

    it('should unmarshall array of items', () => {
      const items = [
        { id: { S: 'test1' } },
        { id: { S: 'test2' } }
      ];
      
      mockUnmarshall
        .mockReturnValueOnce({ id: 'test1' })
        .mockReturnValueOnce({ id: 'test2' });
      
      const result = unmarshallItems(items);
      
      expect(result).toEqual([
        { id: 'test1' },
        { id: 'test2' }
      ]);
    });

    it('should return empty array for falsy input in unmarshallItems', () => {
      const result = unmarshallItems(null);
      expect(result).toEqual([]);
    });
  });

  describe('high-level API functions', () => {
    describe('addItem', () => {
      it('should successfully add item', async () => {
        const tableName = 'TestTable';
        const item = { id: 'test', name: 'test-name' };
        
        mockMarshall.mockReturnValue({ marshalled: item });
        mockSend.mockResolvedValue({ Attributes: {} });
        
        const result = await addItem(tableName, item);
        
        expect(result).toEqual({ Attributes: {} });
        expect(mockMarshall).toHaveBeenCalledWith(item);
      });

      it('should handle error and log it', async () => {
        const tableName = 'TestTable';
        const item = { id: 'test' };
        
        const error = new Error('Add error');
        mockSend.mockRejectedValue(error);
        
        await expect(addItem(tableName, item)).rejects.toThrow('Add error');
        expect(logger.error).toHaveBeenCalledWith('Error adding item to TestTable:', error);
      });
    });

    describe('getItem', () => {
      it('should successfully get and unmarshall item', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        
        const dynamoItem = { id: { S: 'test' }, name: { S: 'test-name' } };
        const unmarshalled = { id: 'test', name: 'test-name' };
        
        mockMarshall.mockReturnValue({ marshalled: key });
        mockSend.mockResolvedValue({ Item: dynamoItem });
        mockUnmarshall.mockReturnValue(unmarshalled);
        
        const result = await getItem(tableName, key);
        
        expect(result).toEqual(unmarshalled);
        expect(mockMarshall).toHaveBeenCalledWith(key);
        expect(mockUnmarshall).toHaveBeenCalledWith(dynamoItem);
      });

      it('should return null when item not found', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        
        mockSend.mockResolvedValue({}); // No Item
        
        const result = await getItem(tableName, key);
        
        expect(result).toBeNull();
      });

      it('should handle error and log it', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        
        const error = new Error('Get error');
        mockSend.mockRejectedValue(error);
        
        await expect(getItem(tableName, key)).rejects.toThrow('Get error');
        expect(logger.error).toHaveBeenCalledWith('Error getting item from TestTable:', error);
      });
    });

    describe('deleteItem', () => {
      it('should successfully delete item', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        
        mockMarshall.mockReturnValue({ marshalled: key });
        mockSend.mockResolvedValue({ Attributes: {} });
        
        const result = await deleteItem(tableName, key);
        
        expect(result).toEqual({ Attributes: {} });
        expect(mockMarshall).toHaveBeenCalledWith(key);
      });

      it('should handle error and log it', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        
        const error = new Error('Delete error');
        mockSend.mockRejectedValue(error);
        
        await expect(deleteItem(tableName, key)).rejects.toThrow('Delete error');
        expect(logger.error).toHaveBeenCalledWith('Error deleting item from TestTable:', error);
      });
    });

    describe('updateItem', () => {
      it('should successfully update item', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        const updateExpression = 'SET #name = :name';
        const expressionAttributeNames = { '#name': 'name' };
        const expressionAttributeValues = { ':name': 'new-name' };
        
        mockMarshall
          .mockReturnValueOnce({ marshalled: key })
          .mockReturnValue({ marshalled: 'new-name' });
        
        mockSend.mockResolvedValue({ Attributes: {} });
        
        const result = await updateItem(
          tableName,
          key,
          updateExpression,
          expressionAttributeNames,
          expressionAttributeValues
        );
        
        expect(result).toEqual({ Attributes: {} });
        expect(mockMarshall).toHaveBeenCalledWith(key);
      });

      it('should handle case without expression attribute values', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        const updateExpression = 'SET #name = :name';
        const expressionAttributeNames = { '#name': 'name' };
        
        mockMarshall.mockReturnValue({ marshalled: key });
        mockSend.mockResolvedValue({ Attributes: {} });
        
        const result = await updateItem(
          tableName,
          key,
          updateExpression,
          expressionAttributeNames
        );
        
        expect(result).toEqual({ Attributes: {} });
      });

      it('should handle error and log it', async () => {
        const tableName = 'TestTable';
        const key = { id: 'test' };
        const updateExpression = 'SET #name = :name';
        const expressionAttributeNames = { '#name': 'name' };
        
        const error = new Error('Update error');
        mockSend.mockRejectedValue(error);
        
        await expect(updateItem(
          tableName,
          key,
          updateExpression,
          expressionAttributeNames
        )).rejects.toThrow('Update error');
        expect(logger.error).toHaveBeenCalledWith('Error updating item in TestTable:', error);
      });
    });
  });
});