/**
 * ファイルパス: __tests__/unit/function/admin/manageFallbacks.test.js
 *
 * フォールバックデータ管理APIハンドラーのユニットテスト
 */

jest.mock('../../../../src/services/fallbackDataStore', () => ({
  getFallbackForSymbol: jest.fn(),
  getFallbackData: jest.fn(),
  exportCurrentFallbacksToGitHub: jest.fn(),
  getFailureStatistics: jest.fn(),
  getFailedSymbols: jest.fn()
}));

jest.mock('../../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn().mockResolvedValue({ statusCode: 200 }),
  formatErrorResponse: jest.fn().mockResolvedValue({ statusCode: 400 })
}));

jest.mock('../../../../src/config/constants', () => ({
  ADMIN: { API_KEY: 'test-key' }
}));

jest.mock('../../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn()
}));

const fallbackDataStore = require('../../../../src/services/fallbackDataStore');
const responseUtils = require('../../../../src/utils/responseUtils');
const handler = require('../../../../src/function/admin/manageFallbacks').handler;

describe('manageFallbacks handler', () => {
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
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'wrong' }, queryStringParameters: { action: 'getFallbacks' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('getFallbacks with symbol returns data', async () => {
    fallbackDataStore.getFallbackForSymbol.mockResolvedValue({ ticker: 'AAPL' });
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'getFallbacks', symbol: 'AAPL', type: 'us-stock' } };
    await handler(event, {});
    expect(fallbackDataStore.getFallbackForSymbol).toHaveBeenCalledWith('AAPL', 'us-stock');
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(expect.objectContaining({ data: { ticker: 'AAPL' } }));
  });

  test('exportToGitHub action triggers export', async () => {
    fallbackDataStore.exportCurrentFallbacksToGitHub.mockResolvedValue(true);
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'exportToGitHub' } };
    await handler(event, {});
    expect(fallbackDataStore.exportCurrentFallbacksToGitHub).toHaveBeenCalled();
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });
});


describe('manageFallbacks handler additional cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exportToGitHub action returns error when export fails', async () => {
    fallbackDataStore.exportCurrentFallbacksToGitHub.mockResolvedValue(false);
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'exportToGitHub' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  test('getFallbacks without symbol returns summary data', async () => {
    fallbackDataStore.getFallbackData.mockResolvedValue({
      stocks: { AAPL: {} },
      etfs: {},
      mutualFunds: { FUND1: {}, FUND2: {} },
      exchangeRates: { 'USDJPY': {} }
    });
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'getFallbacks' } };
    await handler(event, {});
    expect(fallbackDataStore.getFallbackData).toHaveBeenCalledWith(false);
    expect(responseUtils.formatResponse).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Object) }));
  });

  test('getFallbacks handles errors gracefully', async () => {
    fallbackDataStore.getFallbackData.mockRejectedValue(new Error('fail'));
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'getFallbacks' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  test('getStatistics returns statistics data', async () => {
    fallbackDataStore.getFailureStatistics.mockResolvedValue({ count: 5 });
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'getStatistics', days: '10' } };
    await handler(event, {});
    expect(fallbackDataStore.getFailureStatistics).toHaveBeenCalledWith(10);
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });

  test('getFailedSymbols returns symbol list', async () => {
    fallbackDataStore.getFailedSymbols.mockResolvedValue(['AAA', 'BBB']);
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'getFailedSymbols', date: '2025-05-20', type: 'jp' } };
    await handler(event, {});
    expect(fallbackDataStore.getFailedSymbols).toHaveBeenCalledWith('2025-05-20', 'jp');
    expect(responseUtils.formatResponse).toHaveBeenCalled();
  });

  test('invalid action returns 400', async () => {
    const event = { httpMethod: 'GET', headers: { 'x-api-key': 'test-key' }, queryStringParameters: { action: 'unknownAction' } };
    await handler(event, {});
    expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
