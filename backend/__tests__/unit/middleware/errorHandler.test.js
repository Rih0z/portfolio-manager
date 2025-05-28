const logger = require('../../../src/utils/logger');
const alertService = require('../../../src/services/alerts');

jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/alerts');

const errorHandler = require('../../../src/utils/errorHandler');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('errorHandler middleware wrapper', () => {
  test('createErrorResponse for validation error', async () => {
    const err = new Error('invalid');
    const response = await errorHandler.createErrorResponse(err, errorHandler.errorTypes.VALIDATION_ERROR);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_PARAMS');
    expect(body.error.message).toBe('invalid');
    expect(logger.error).toHaveBeenCalled();
  });

  test('handleError sends alert for critical error', async () => {
    const err = new Error('boom');
    await errorHandler.handleError(err, errorHandler.errorTypes.CRITICAL_ERROR, { requestId: 'id' });
    expect(logger.critical).toHaveBeenCalled();
    expect(alertService.notifyError).toHaveBeenCalled();
  });
});
