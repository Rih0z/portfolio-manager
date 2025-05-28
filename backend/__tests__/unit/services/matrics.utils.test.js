process.env.NODE_ENV = 'test';
const metricsService = require('../../../src/services/matrics');

describe('Metrics Service Utility Functions', () => {
  test('slugify normalizes names correctly', () => {
    const input = 'US Market Data (Primary)';
    expect(metricsService.slugify(input)).toBe('us-market-data-primary');
  });

  test('normalizePriorityKeys converts keys to canonical names', () => {
    const input = { 'jp-stock': ['a'], other: ['b'] };
    const result = metricsService.normalizePriorityKeys(input);
    expect(result).toEqual({ JP_STOCK: ['a'], other: ['b'] });
  });
});
