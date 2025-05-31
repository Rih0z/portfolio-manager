const mockSend = jest.fn();
const mockCloudWatch = {
  send: mockSend
};

// AWS SDK v3 mock
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => mockCloudWatch),
  GetMetricStatisticsCommand: jest.fn()
}));

// AWS SDK v2 fallback mock
jest.mock('aws-sdk', () => ({
  CloudWatch: jest.fn(() => mockCloudWatch)
}));

jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/cache', () => ({
  get: jest.fn(),
  set: jest.fn()
}));

let budgetCheck;
let cache;

beforeEach(() => {
  jest.resetModules();
  mockSend.mockReset();
  cache = require('../../../src/services/cache');
  budgetCheck = require('../../../src/utils/budgetCheck');
});

describe('getBudgetUsage', () => {
  test('calculates usage rate from CloudWatch metrics', async () => {
    mockSend.mockResolvedValue({ Datapoints: [{ Sum: 500000 }] });
    const usage = await budgetCheck.getBudgetUsage();
    expect(mockSend).toHaveBeenCalled();
    expect(usage).toBeCloseTo(0.5);
  });

  test('returns 0 when no datapoints', async () => {
    mockSend.mockResolvedValue({ Datapoints: [] });
    const usage = await budgetCheck.getBudgetUsage();
    expect(usage).toBe(0);
  });

  test('throws on CloudWatch error', async () => {
    const err = new Error('fail');
    mockSend.mockRejectedValue(err);
    await expect(budgetCheck.getBudgetUsage()).rejects.toThrow('fail');
  });
});

describe('getBudgetWarningMessage', () => {
  test('returns critical message from cached value', async () => {
    cache.get.mockResolvedValue({ usage: 0.96 });
    const message = await budgetCheck.getBudgetWarningMessage();
    expect(message).toContain('CRITICAL');
  });

  test('uses env flags when no cache', async () => {
    cache.get.mockResolvedValue(null);
    process.env.TEST_BUDGET_WARNING = 'true';
    const message = await budgetCheck.getBudgetWarningMessage();
    expect(message).toContain('WARNING');
    delete process.env.TEST_BUDGET_WARNING;
  });

  test('returns default message on error', async () => {
    cache.get.mockRejectedValue(new Error('x'));
    const message = await budgetCheck.getBudgetWarningMessage();
    expect(message).toBe('WARNING: Unable to determine current budget usage.');
  });
});
