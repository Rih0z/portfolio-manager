/**
 * ファイルパス: __tests__/unit/utils/budgetCheck.test.js
 *
 * budgetCheckユーティリティのユニットテスト
 * 予算警告付与機能の挙動を検証する
 */

const budgetCheck = require('../../../src/utils/budgetCheck');

jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/cache');

const mockResponse = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ success: true })
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('addBudgetWarningToResponse', () => {
  test('警告がない場合はレスポンスを変更しない', async () => {
    jest.spyOn(budgetCheck, 'isBudgetCritical').mockResolvedValue(false);
    jest.spyOn(budgetCheck, 'isBudgetWarning').mockResolvedValue(false);

    const result = await budgetCheck.addBudgetWarningToResponse(mockResponse);
    expect(result).toEqual(mockResponse);
  });

  test('警告メッセージをヘッダーとボディに追加する', async () => {
    jest.spyOn(budgetCheck, 'isBudgetCritical').mockResolvedValue(false);
    jest.spyOn(budgetCheck, 'isBudgetWarning').mockResolvedValue(true);
    jest
      .spyOn(budgetCheck, 'getBudgetWarningMessage')
      .mockResolvedValue('WARNING: limit');

    const result = await budgetCheck.addBudgetWarningToResponse(mockResponse);

    expect(result.headers['X-Budget-Warning']).toBe('WARNING: limit');
    const body = JSON.parse(result.body);
    expect(body.budgetWarning).toBe('WARNING: limit');
  });

  test('JSON以外のレスポンスは変更しない', async () => {
    jest.spyOn(budgetCheck, 'isBudgetCritical').mockResolvedValue(true);
    const nonJson = { ...mockResponse, body: '<html></html>' };

    const result = await budgetCheck.addBudgetWarningToResponse(nonJson);
    expect(result).toEqual(nonJson);
  });

  test('内部エラー発生時は元のレスポンスを返す', async () => {
    jest
      .spyOn(budgetCheck, 'isBudgetCritical')
      .mockRejectedValue(new Error('fail'));

    const result = await budgetCheck.addBudgetWarningToResponse(mockResponse);
    expect(result).toEqual(mockResponse);
  });
});

describe('isBudgetCritical and isBudgetWarning', () => {
  const cache = require('../../../src/services/cache');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cache value triggers critical state', async () => {
    cache.get.mockResolvedValue({ usage: 0.96 });
    const result = await budgetCheck.isBudgetCritical();
    expect(result).toBe(true);
  });

  test('production mode fetches usage and caches result', async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(true);
    jest.spyOn(budgetCheck, 'getBudgetUsage').mockResolvedValue(0.97);
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const result = await budgetCheck.isBudgetCritical();

    expect(budgetCheck.getBudgetUsage).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
    expect(result).toBe(true);
    process.env.NODE_ENV = origEnv;
  });

  test('env flag forces critical', async () => {
    cache.get.mockResolvedValue(null);
    const origEnv = process.env.TEST_BUDGET_CRITICAL;
    process.env.TEST_BUDGET_CRITICAL = 'true';
    const result = await budgetCheck.isBudgetCritical();
    expect(result).toBe(true);
    process.env.TEST_BUDGET_CRITICAL = origEnv;
  });

  test('cache value triggers warning state', async () => {
    cache.get.mockResolvedValue({ usage: 0.9 });
    const result = await budgetCheck.isBudgetWarning();
    expect(result).toBe(true);
  });
});
