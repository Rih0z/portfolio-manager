/**
 * DynamoDB Service Additional Coverage Tests
 * カバレッジ向上のための追加テスト
 */

const modulePath = '../../../src/utils/dynamoDbService';

describe('DynamoDB Service Additional Coverage', () => {
  let service;
  let mockDynamoClient;

  beforeEach(() => {
    jest.resetModules();
    
    // Create mock DynamoDB client
    mockDynamoClient = {
      send: jest.fn().mockResolvedValue({})
    };
    
    // Mock AWS SDK
    jest.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: jest.fn(() => mockDynamoClient),
      GetItemCommand: jest.fn((params) => ({ type: 'GetItem', params })),
      PutItemCommand: jest.fn((params) => ({ type: 'PutItem', params })),
      UpdateItemCommand: jest.fn((params) => ({ type: 'UpdateItem', params })),
      DeleteItemCommand: jest.fn((params) => ({ type: 'DeleteItem', params })),
      QueryCommand: jest.fn((params) => ({ type: 'Query', params })),
      ScanCommand: jest.fn((params) => ({ type: 'Scan', params }))
    }));

    // Mock marshall/unmarshall utilities  
    jest.doMock('@aws-sdk/util-dynamodb', () => ({
      marshall: jest.fn(obj => ({ M: obj })),
      unmarshall: jest.fn(obj => obj.M || obj)
    }));

    // Mock logger
    jest.doMock('../../../src/utils/logger', () => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    }));

    // Require the service after mocking
    service = require(modulePath);
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('marshalling utilities', () => {
    test('marshallItem converts JS objects to DynamoDB format', () => {
      const item = { id: '1', name: 'Test', count: 42, active: true };
      const marshalled = service.marshallItem(item);
      
      expect(typeof marshalled).toBe('object');
      expect(marshalled).toEqual({ M: item });
    });

    test('unmarshallItem converts DynamoDB format to JS objects', () => {
      const dynamoItem = {
        M: {
          id: '1',
          name: 'Test', 
          count: 42,
          active: true
        }
      };
      
      const unmarshalled = service.unmarshallItem(dynamoItem);
      
      expect(unmarshalled.id).toBe('1');
      expect(unmarshalled.name).toBe('Test');
      expect(unmarshalled.count).toBe(42);
      expect(unmarshalled.active).toBe(true);
    });

    test('unmarshallItem returns null for null input', () => {
      const result = service.unmarshallItem(null);
      expect(result).toBeNull();
    });

    test('unmarshallItems processes array of items', () => {
      const items = [
        { M: { id: '1', name: 'Item 1' } },
        { M: { id: '2', name: 'Item 2' } }
      ];
      
      const result = service.unmarshallItems(items);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'Item 1' });
      expect(result[1]).toEqual({ id: '2', name: 'Item 2' });
    });

    test('unmarshallItems returns null for null input', () => {
      const result = service.unmarshallItems(null);
      expect(result).toEqual([]);
    });
  });

  describe('high-level wrapper functions', () => {
    test('addItem calls putDynamoDBItem with marshalled data', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ success: true });
      
      const item = { id: '1', name: 'Test Item' };
      const result = await service.addItem('test-table', item);
      
      expect(mockDynamoClient.send).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('getItem calls getDynamoDBItem and unmarshalls result', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { M: { id: '1', name: 'Test Item' } }
      });
      
      const result = await service.getItem('test-table', { id: '1' });
      
      expect(mockDynamoClient.send).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'Test Item' });
    });

    test('getItem returns null when no item found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });
      
      const result = await service.getItem('test-table', { id: 'not-found' });
      
      expect(result).toBeNull();
    });

    test('deleteItem calls deleteDynamoDBItem', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ success: true });
      
      const result = await service.deleteItem('test-table', { id: '1' });
      
      expect(mockDynamoClient.send).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('updateItem calls updateDynamoDBItem', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ 
        Attributes: { M: { id: '1', name: 'Updated Item' } }
      });
      
      const result = await service.updateItem('test-table', { id: '1' }, 'SET #name = :name', {
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': 'Updated Item' }
      });
      
      expect(mockDynamoClient.send).toHaveBeenCalled();
      expect(result).toEqual({ 
        Attributes: { M: { id: '1', name: 'Updated Item' } }
      });
    });
  });

  describe('error handling', () => {
    test('handles DynamoDB errors gracefully', async () => {
      const error = new Error('DynamoDB error');
      mockDynamoClient.send.mockRejectedValueOnce(error);
      
      await expect(service.addItem('test-table', { id: '1' }))
        .rejects.toThrow('DynamoDB error');
    });

    test('logs errors appropriately', async () => {
      const logger = require('../../../src/utils/logger');
      const error = new Error('Test error');
      mockDynamoClient.send.mockRejectedValueOnce(error);
      
      try {
        await service.getItem('test-table', { id: '1' });
      } catch (e) {
        // Expected to throw
      }
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
});