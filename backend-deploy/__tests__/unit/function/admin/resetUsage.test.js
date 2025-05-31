/**
 * ファイルパス: __tests__/unit/function/admin/resetUsage.test.js
 *
 * 使用量カウンターリセットAPIハンドラーのユニットテスト
 */

jest.mock('../../../../src/services/usage', () => ({
  resetUsage: jest.fn()
}));

jest.mock('../../../../src/services/alerts', () => ({
  sendAlert: jest.fn()
}));

jest.mock('../../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn().mockResolvedValue({ statusCode: 200 }),
  formatErrorResponse: jest.fn().mockResolvedValue({ statusCode: 400 })
}));

jest.mock('../../../../src/config/constants', () => ({
  ADMIN: { API_KEY: 'test-key' }
}));

const usageService = require('../../../../src/services/usage');
const alertService = require('../../../../src/services/alerts');
const responseUtils = require('../../../../src/utils/responseUtils');
const handler = require('../../../../src/function/admin/resetUsage').handler;

describe('resetUsage handler', () => {
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
    const event = { httpMethod: 'POST', headers: { 'x-api-key': 'wrong' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('resets usage counters with provided type', async () => {
    usageService.resetUsage.mockResolvedValue({ result: true });
    const event = { httpMethod: 'POST', headers: { 'x-api-key': 'test-key' }, body: JSON.stringify({ resetType: 'monthly' }) };
    await handler(event, {});
    expect(usageService.resetUsage).toHaveBeenCalledWith('monthly');
    expect(alertService.sendAlert).toHaveBeenCalled();
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(expect.objectContaining({ data: { result: true } }));
  });
});

