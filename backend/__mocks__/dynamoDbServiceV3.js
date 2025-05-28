/**
 * DynamoDB Service V3 Mock for Testing
 * AWS SDK v3対応のテスト用モック
 */
'use strict';

const createMockDynamoDbV3 = () => {
  const mockSend = jest.fn();
  
  // デフォルトの成功レスポンス
  mockSend.mockImplementation((command) => {
    const commandName = command.constructor.name;
    
    switch (commandName) {
      case 'GetCommand':
        return Promise.resolve({ Item: null });
      case 'PutCommand':
      case 'UpdateCommand':
      case 'DeleteCommand':
        return Promise.resolve({});
      case 'ScanCommand':
        return Promise.resolve({ Items: [] });
      case 'QueryCommand':
        return Promise.resolve({ Items: [], Count: 0 });
      default:
        return Promise.resolve({});
    }
  });
  
  return {
    send: mockSend,
    
    // テストヘルパーメソッド
    mockGetResponse: (item) => {
      mockSend.mockImplementationOnce(() => Promise.resolve({ Item: item }));
    },
    
    mockPutSuccess: () => {
      mockSend.mockImplementationOnce(() => Promise.resolve({}));
    },
    
    mockError: (error) => {
      mockSend.mockImplementationOnce(() => Promise.reject(error));
    },
    
    mockScanResponse: (items) => {
      mockSend.mockImplementationOnce(() => Promise.resolve({ Items: items }));
    },
    
    mockQueryResponse: (items) => {
      mockSend.mockImplementationOnce(() => Promise.resolve({ Items: items, Count: items.length }));
    },
    
    // モックのリセット
    reset: () => {
      mockSend.mockReset();
      // デフォルトの実装を再設定
      mockSend.mockImplementation((command) => {
        const commandName = command.constructor.name;
        switch (commandName) {
          case 'GetCommand':
            return Promise.resolve({ Item: null });
          case 'PutCommand':
          case 'UpdateCommand':
          case 'DeleteCommand':
            return Promise.resolve({});
          case 'ScanCommand':
            return Promise.resolve({ Items: [] });
          case 'QueryCommand':
            return Promise.resolve({ Items: [], Count: 0 });
          default:
            return Promise.resolve({});
        }
      });
    }
  };
};

module.exports = { createMockDynamoDbV3 };