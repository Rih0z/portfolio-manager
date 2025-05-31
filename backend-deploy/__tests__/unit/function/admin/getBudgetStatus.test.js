/**
 * ファイルパス: __tests__/unit/function/admin/getBudgetStatus.test.js
 *
 * 管理者向け予算取得エンドポイントのユニットテスト
 * APIキー認証とレスポンス生成を検証する
 */

jest.mock('../../../../src/utils/budgetCheck', () => ({
  getBudgetStatus: jest.fn()
}));

jest.mock('../../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn().mockResolvedValue({ statusCode: 200 }),
  formatErrorResponse: jest.fn().mockResolvedValue({ statusCode: 401 })
}));

jest.mock('../../../../src/config/constants', () => ({
  ADMIN: { API_KEY: 'test-key', EMAIL: 'admin@example.com' }
}));

const { getBudgetStatus } = require('../../../../src/utils/budgetCheck');
const responseUtils = require('../../../../src/utils/responseUtils');
const handler = require('../../../../src/function/admin/getBudgetStatus').handler;

describe('admin getBudgetStatus handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('OPTIONS request returns 204', async () => {
    const event = { httpMethod: 'OPTIONS', headers: {} };
    const res = await handler(event, {});
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 401 when API key is invalid', async () => {
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'wrong' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  test('returns budget info when API key is valid', async () => {
    getBudgetStatus.mockResolvedValue({ usage: 10 });
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { refresh: 'true' } };
    const res = await handler(event, {});
    expect(getBudgetStatus).toHaveBeenCalledWith(true);
    expect(responseUtils.formatResponse).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
