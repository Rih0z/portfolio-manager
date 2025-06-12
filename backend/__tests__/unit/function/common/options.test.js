/**
 * options.jsのテスト
 * OPTIONSリクエストハンドラーのテスト
 */
'use strict';

const { handler } = require('../../../../src/function/common/options');
const { getOptionsResponse } = require('../../../../src/utils/corsHelper');

// モックの設定
jest.mock('../../../../src/utils/corsHelper');

describe('options.handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    test('getOptionsResponseを呼び出してレスポンスを返す', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: ''
      };

      getOptionsResponse.mockReturnValue(mockResponse);

      const event = {
        httpMethod: 'OPTIONS',
        path: '/api/test'
      };

      const result = await handler(event);

      expect(getOptionsResponse).toHaveBeenCalledTimes(1);
      expect(getOptionsResponse).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    test('異なるイベントでも同じレスポンスを返す', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: ''
      };

      getOptionsResponse.mockReturnValue(mockResponse);

      const event = {
        httpMethod: 'OPTIONS',
        path: '/api/different-path',
        queryStringParameters: { test: 'value' }
      };

      const result = await handler(event);

      expect(getOptionsResponse).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    test('空のイベントでも正常に動作する', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };

      getOptionsResponse.mockReturnValue(mockResponse);

      const result = await handler({});

      expect(getOptionsResponse).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    test('nullイベントでも正常に動作する', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {},
        body: ''
      };

      getOptionsResponse.mockReturnValue(mockResponse);

      const result = await handler(null);

      expect(getOptionsResponse).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    test('getOptionsResponseがエラーをスローした場合は例外が伝播する', async () => {
      const error = new Error('CORS helper error');
      getOptionsResponse.mockImplementation(() => {
        throw error;
      });

      const event = {
        httpMethod: 'OPTIONS'
      };

      await expect(handler(event)).rejects.toThrow('CORS helper error');
      expect(getOptionsResponse).toHaveBeenCalledTimes(1);
    });

    test('非同期処理として正しく動作する', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };

      getOptionsResponse.mockReturnValue(mockResponse);

      const event = {
        httpMethod: 'OPTIONS'
      };

      const promise = handler(event);
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual(mockResponse);
    });
  });
});