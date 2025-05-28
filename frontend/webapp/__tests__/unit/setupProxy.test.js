import { createProxyMiddleware } from 'http-proxy-middleware';

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => 'mw')
}));

const loadModule = () => require('@/setupProxy');

describe('setupProxy', () => {
  const originalEnv = process.env;
  let app;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, REACT_APP_API_STAGE: 'test', REACT_APP_LOCAL_API_URL: 'http://localhost:5000' };
    app = { use: jest.fn() };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('registers proxy middleware and sets env var', () => {
    const setupProxy = loadModule();
    setupProxy(app);

    expect(createProxyMiddleware).toHaveBeenCalledWith(expect.objectContaining({ target: 'http://localhost:5000' }));
    expect(app.use).toHaveBeenCalledWith('/test', 'mw');
    expect(process.env.REACT_APP_USE_PROXY).toBe('true');
  });
});
