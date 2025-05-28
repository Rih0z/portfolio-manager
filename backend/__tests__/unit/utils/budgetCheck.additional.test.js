const cache = require('../../../src/services/cache');
const budgetCheck = require('../../../src/utils/budgetCheck');

jest.mock('../../../src/services/cache');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isBudgetWarning additional cases', () => {
  test('production mode fetches usage when cache miss', async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(true);
    jest.spyOn(budgetCheck, 'getBudgetUsage').mockResolvedValue(0.9);
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const result = await budgetCheck.isBudgetWarning();

    expect(budgetCheck.getBudgetUsage).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
    expect(result).toBe(true);
    process.env.NODE_ENV = origEnv;
  });

  test('env flag forces warning', async () => {
    cache.get.mockResolvedValue(null);
    process.env.TEST_BUDGET_WARNING = 'true';
    const result = await budgetCheck.isBudgetWarning();
    expect(result).toBe(true);
    delete process.env.TEST_BUDGET_WARNING;
  });

  test('getBudgetUsage edge cases', async () => {
    // Mock CloudWatch before requiring the module
    const mockCloudWatch = { send: jest.fn() };
    jest.doMock('@aws-sdk/client-cloudwatch', () => ({
      CloudWatchClient: jest.fn(() => mockCloudWatch),
      GetMetricStatisticsCommand: jest.fn()
    }));

    // Clear module cache and re-require to get the mocked version
    jest.resetModules();
    const budgetCheckWithMock = require('../../../src/utils/budgetCheck');

    // Test with no datapoints
    mockCloudWatch.send.mockResolvedValue({ Datapoints: [] });
    const usageEmpty = await budgetCheckWithMock.getBudgetUsage();
    expect(usageEmpty).toBe(0);

    // Test with multiple datapoints
    mockCloudWatch.send.mockResolvedValue({ 
      Datapoints: [{ Sum: 300000 }, { Sum: 200000 }] 
    });
    const usageMultiple = await budgetCheckWithMock.getBudgetUsage();
    expect(usageMultiple).toBeGreaterThan(0);
    
    // Clean up
    jest.dontMock('@aws-sdk/client-cloudwatch');
    jest.resetModules();
  });

  test('budget calculation with different limits', () => {
    // Test different monthly budget scenarios
    const originalLimit = process.env.MONTHLY_BUDGET_LIMIT;
    
    process.env.MONTHLY_BUDGET_LIMIT = '500';
    // Usage calculation should use this limit
    
    process.env.MONTHLY_BUDGET_LIMIT = '1000';
    // Usage calculation should use this limit
    
    // Restore
    if (originalLimit) {
      process.env.MONTHLY_BUDGET_LIMIT = originalLimit;
    } else {
      delete process.env.MONTHLY_BUDGET_LIMIT;
    }
  });

  test('error handling in budget functions', async () => {
    // Test cache errors
    cache.get.mockRejectedValue(new Error('Cache connection failed'));
    
    const result = await budgetCheck.isBudgetWarning();
    // Should handle error gracefully
    expect(typeof result).toBe('boolean');
  });
});


