import reportWebVitals from '@/reportWebVitals';

jest.mock('web-vitals', () => ({
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
}));

const webVitals = require('web-vitals');

describe('reportWebVitals utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls web-vitals functions when callback provided', async () => {
    const cb = jest.fn();
    await reportWebVitals(cb);
    expect(webVitals.getCLS).toHaveBeenCalledWith(cb);
    expect(webVitals.getFID).toHaveBeenCalledWith(cb);
    expect(webVitals.getFCP).toHaveBeenCalledWith(cb);
    expect(webVitals.getLCP).toHaveBeenCalledWith(cb);
    expect(webVitals.getTTFB).toHaveBeenCalledWith(cb);
  });

  it('does nothing when callback is missing', () => {
    reportWebVitals();
    expect(webVitals.getCLS).not.toHaveBeenCalled();
  });
});
