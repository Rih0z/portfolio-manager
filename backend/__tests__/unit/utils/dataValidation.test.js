const dataValidation = require('../../../src/utils/dataValidation');
const cacheService = require('../../../src/services/cache');
const alertService = require('../../../src/services/alerts');
const constants = require('../../../src/config/constants');

jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/alerts');

describe('dataValidation utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePriceChange', () => {
    test('returns valid when change below threshold', () => {
      const newData = { price: 110 };
      const prevData = { price: 108 };
      const result = dataValidation.validatePriceChange(newData, prevData);
      expect(result.isValid).toBe(true);
    });

    test('detects abnormal change and sets MEDIUM severity', () => {
      const newData = { price: 100 };
      const prevData = { price: 70 };
      const result = dataValidation.validatePriceChange(newData, prevData);
      expect(result.isValid).toBe(false);
      expect(result.severity).toBe('MEDIUM');
      expect(result.issue).toHaveProperty('type', 'PRICE_CHANGE');
    });

    test('detects high severity change', () => {
      const newData = { price: 200 };
      const prevData = { price: 100 };
      const result = dataValidation.validatePriceChange(newData, prevData);
      expect(result.isValid).toBe(false);
      expect(result.severity).toBe('HIGH');
    });
  });

  describe('validateMultiSourceData', () => {
    test('returns valid when prices consistent', () => {
      const dataArray = [{ price: 100 }, { price: 102 }, { price: 98 }];
      const result = dataValidation.validateMultiSourceData('AAA', dataArray);
      expect(result.isValid).toBe(true);
    });

    test('detects inconsistency and recommends median', () => {
      const dataArray = [{ price: 100 }, { price: 80 }, { price: 90 }];
      const result = dataValidation.validateMultiSourceData('AAA', dataArray);
      expect(result.isValid).toBe(false);
      expect(result.recommended.price).toBe(90);
      expect(result.issues[0]).toHaveProperty('type', 'SOURCE_DIFFERENCE');
    });
  });

  describe('validateData', () => {
    test('uses cache when previous data not provided', async () => {
      cacheService.get.mockResolvedValue({ data: { price: 100 } });
      const newData = { price: 130 };
      const result = await dataValidation.validateData('AAA', 'us-stock', newData);
      expect(cacheService.get).toHaveBeenCalled();
      expect(result.isValid).toBe(false);
    });
  });

  describe('notifyDataValidationIssue', () => {
    test('calls alert only on HIGH severity', async () => {
      const validationResult = { isValid: false, severity: 'HIGH', issues: [] };
      await dataValidation.notifyDataValidationIssue('AAA', 'us-stock', validationResult);
      expect(alertService.throttledAlert).toHaveBeenCalled();
    });

    test('does not call alert on LOW severity', async () => {
      const validationResult = { isValid: false, severity: 'LOW', issues: [] };
      await dataValidation.notifyDataValidationIssue('AAA', 'us-stock', validationResult);
      expect(alertService.throttledAlert).not.toHaveBeenCalled();
    });
  });
});
