const {
  isBudgetCritical,
  isBudgetWarning,
  getBudgetUsage,
  getBudgetWarningMessage,
  addBudgetWarningToResponse
} = require('../../../src/utils/budgetCheck');

const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const cacheService = require('../../../src/services/cache');

jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('../../../src/services/cache');

describe('budgetCheck', () => {
  let originalEnv;
  let mockCloudWatchClient;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    mockCloudWatchClient = {
      send: jest.fn()
    };
    CloudWatchClient.mockImplementation(() => mockCloudWatchClient);
    
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue();
    
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('isBudgetCritical', () => {
    it('should return true when cached usage exceeds critical threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.96,
        timestamp: new Date().toISOString()
      });

      const result = await isBudgetCritical();

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith('system:budget-status');
    });

    it('should return false when cached usage is below critical threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.80,
        timestamp: new Date().toISOString()
      });

      const result = await isBudgetCritical();

      expect(result).toBe(false);
    });

    it('should check actual usage in production when no cache', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.get.mockResolvedValue(null);
      
      // Mock getBudgetUsage by mocking CloudWatch response
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 980000 }]
      });

      const result = await isBudgetCritical();

      expect(result).toBe(true); // 980000 / 1000000 = 0.98 > 0.95
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return true when TEST_BUDGET_CRITICAL is set', async () => {
      process.env.TEST_BUDGET_CRITICAL = 'true';
      cacheService.get.mockResolvedValue(null);

      const result = await isBudgetCritical();

      expect(result).toBe(true);
    });

    it('should return false by default', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await isBudgetCritical();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const result = await isBudgetCritical();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Failed to check budget status: Cache error');
    });
  });

  describe('isBudgetWarning', () => {
    it('should return true when cached usage exceeds warning threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.90,
        timestamp: new Date().toISOString()
      });

      const result = await isBudgetWarning();

      expect(result).toBe(true);
    });

    it('should return false when cached usage is below warning threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.70,
        timestamp: new Date().toISOString()
      });

      const result = await isBudgetWarning();

      expect(result).toBe(false);
    });

    it('should check actual usage in production when no cache', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.get.mockResolvedValue(null);
      
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 900000 }]
      });

      const result = await isBudgetWarning();

      expect(result).toBe(true); // 900000 / 1000000 = 0.9 > 0.85
    });

    it('should return true when TEST_BUDGET_WARNING is set', async () => {
      process.env.TEST_BUDGET_WARNING = 'true';
      cacheService.get.mockResolvedValue(null);

      const result = await isBudgetWarning();

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const result = await isBudgetWarning();

      expect(result).toBe(false);
    });
  });

  describe('getBudgetUsage', () => {
    it('should calculate usage rate correctly', async () => {
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [
          { Sum: 800000 },
          { Sum: 750000 },
          { Sum: 900000 }
        ]
      });

      const result = await getBudgetUsage();

      expect(result).toBe(0.9); // 900000 / 1000000
      expect(console.info).toHaveBeenCalledWith('Current Lambda budget usage: 90.00%');
    });

    it('should handle empty datapoints', async () => {
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: []
      });

      const result = await getBudgetUsage();

      expect(result).toBe(0);
      expect(console.warn).toHaveBeenCalledWith('No CloudWatch datapoints found for Lambda usage');
    });

    it('should handle missing datapoints', async () => {
      mockCloudWatchClient.send.mockResolvedValue({});

      const result = await getBudgetUsage();

      expect(result).toBe(0);
    });

    it('should use correct CloudWatch parameters', async () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-function';
      
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 500000 }]
      });

      await getBudgetUsage();

      expect(CloudWatchClient).toHaveBeenCalledWith({
        region: 'us-east-1'
      });
      
      expect(mockCloudWatchClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MetricName: 'Invocations',
            Namespace: 'AWS/Lambda',
            Period: 2592000,
            Statistics: ['Sum'],
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: 'test-function'
              }
            ]
          })
        })
      );
    });

    it('should use default values when env vars not set', async () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 500000 }]
      });

      await getBudgetUsage();

      expect(CloudWatchClient).toHaveBeenCalledWith({
        region: 'us-west-2'
      });
    });

    it('should handle CloudWatch errors', async () => {
      mockCloudWatchClient.send.mockRejectedValue(new Error('CloudWatch error'));

      await expect(getBudgetUsage()).rejects.toThrow('CloudWatch error');
      expect(console.error).toHaveBeenCalledWith('Error getting CloudWatch metrics: CloudWatch error');
    });

    it('should calculate time periods correctly', async () => {
      const mockDate = new Date('2024-06-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 500000 }]
      });

      await getBudgetUsage();

      const call = mockCloudWatchClient.send.mock.calls[0][0];
      expect(call.input.StartTime).toEqual(new Date('2024-06-01T00:00:00.000Z'));
      expect(call.input.EndTime).toEqual(new Date('2024-06-30T00:00:00.000Z'));

      global.Date.mockRestore();
    });
  });

  describe('getBudgetWarningMessage', () => {
    it('should return critical message when usage exceeds critical threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.98
      });

      const result = await getBudgetWarningMessage();

      expect(result).toBe('CRITICAL: Free tier usage at 98.0%. Cache refresh disabled.');
    });

    it('should return warning message when usage exceeds warning threshold', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.90
      });

      const result = await getBudgetWarningMessage();

      expect(result).toBe('WARNING: Free tier usage at 90.0%. Consider reducing refresh rate.');
    });

    it('should return empty string when usage is below thresholds', async () => {
      cacheService.get.mockResolvedValue({
        usage: 0.70
      });

      const result = await getBudgetWarningMessage();

      expect(result).toBe('');
    });

    it('should use production usage when no cache', async () => {
      process.env.NODE_ENV = 'production';
      cacheService.get.mockResolvedValue(null);
      
      mockCloudWatchClient.send.mockResolvedValue({
        Datapoints: [{ Sum: 980000 }]
      });

      const result = await getBudgetWarningMessage();

      expect(result).toBe('CRITICAL: Free tier usage at 98.0%. Cache refresh disabled.');
    });

    it('should use test values when test env vars are set', async () => {
      process.env.TEST_BUDGET_CRITICAL = 'true';
      cacheService.get.mockResolvedValue(null);

      const result = await getBudgetWarningMessage();

      expect(result).toBe('CRITICAL: Free tier usage at 98.0%. Cache refresh disabled.');
    });

    it('should handle test warning scenario', async () => {
      process.env.TEST_BUDGET_WARNING = 'true';
      cacheService.get.mockResolvedValue(null);

      const result = await getBudgetWarningMessage();

      expect(result).toBe('WARNING: Free tier usage at 88.0%. Consider reducing refresh rate.');
    });

    it('should handle errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const result = await getBudgetWarningMessage();

      expect(result).toBe('WARNING: Unable to determine current budget usage.');
      expect(console.warn).toHaveBeenCalledWith('Failed to get budget warning message: Cache error');
    });
  });

  describe('addBudgetWarningToResponse', () => {
    const mockResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: 'test' })
    };

    it('should add warning to response when critical', async () => {
      cacheService.get.mockResolvedValue({ usage: 0.98 });

      const result = await addBudgetWarningToResponse(mockResponse);

      expect(result.headers['X-Budget-Warning']).toBe('CRITICAL: Free tier usage at 98.0%. Cache refresh disabled.');
      
      const body = JSON.parse(result.body);
      expect(body.budgetWarning).toBe('CRITICAL: Free tier usage at 98.0%. Cache refresh disabled.');
      expect(body.data).toBe('test');
    });

    it('should add warning to response when warning threshold reached', async () => {
      cacheService.get.mockResolvedValue({ usage: 0.90 });

      const result = await addBudgetWarningToResponse(mockResponse);

      expect(result.headers['X-Budget-Warning']).toBe('WARNING: Free tier usage at 90.0%. Consider reducing refresh rate.');
    });

    it('should return original response when no warning', async () => {
      cacheService.get.mockResolvedValue({ usage: 0.70 });

      const result = await addBudgetWarningToResponse(mockResponse);

      expect(result).toEqual(mockResponse);
    });

    it('should handle non-JSON response body', async () => {
      const textResponse = {
        ...mockResponse,
        body: 'plain text response'
      };
      
      cacheService.get.mockResolvedValue({ usage: 0.98 });

      const result = await addBudgetWarningToResponse(textResponse);

      expect(result).toEqual(textResponse);
    });

    it('should handle missing response body', async () => {
      const responseWithoutBody = {
        statusCode: 200,
        headers: {}
      };
      
      cacheService.get.mockResolvedValue({ usage: 0.98 });

      const result = await addBudgetWarningToResponse(responseWithoutBody);

      expect(result).toEqual(responseWithoutBody);
    });

    it('should preserve existing headers', async () => {
      const responseWithHeaders = {
        ...mockResponse,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        }
      };
      
      cacheService.get.mockResolvedValue({ usage: 0.98 });

      const result = await addBudgetWarningToResponse(responseWithHeaders);

      expect(result.headers['X-Custom-Header']).toBe('custom-value');
      expect(result.headers['X-Budget-Warning']).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const result = await addBudgetWarningToResponse(mockResponse);

      expect(result).toEqual(mockResponse);
      expect(console.warn).toHaveBeenCalledWith('Failed to add budget warning to response: Cache error');
    });

    it('should handle invalid JSON in response body', async () => {
      const invalidJsonResponse = {
        ...mockResponse,
        body: '{ invalid json'
      };
      
      cacheService.get.mockResolvedValue({ usage: 0.98 });

      const result = await addBudgetWarningToResponse(invalidJsonResponse);

      expect(result).toEqual(invalidJsonResponse);
    });
  });
});