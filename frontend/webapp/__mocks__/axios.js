/**
 * ファイルパス: __mocks__/axios.js
 *
 * Axiosライブラリのモック実装
 * テスト時にAxiosをモック化してHTTPリクエストをシミュレート
 */
import { vi } from 'vitest';

// モックインスタンスを生成
const createMock = () => {
  const createInstance = (config = {}) => ({
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    defaults: {
      ...config,
      headers: {
        common: {},
        ...config.headers,
      },
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
        clear: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
        clear: vi.fn(),
      },
    },
  });

  const mock = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn((config = {}) => createInstance(config)),
    defaults: {
      headers: {
        common: {},
      },
    },
    _reset: function () {
      mock.get.mockReset();
      mock.post.mockReset();
      mock.put.mockReset();
      mock.delete.mockReset();
      mock.patch.mockReset();
      mock.create.mockReset();
    },
  };

  mock.get.mockImplementation((url) => {
    if (typeof url === 'object') {
      return Promise.resolve({ data: {} });
    }
    return Promise.resolve({ data: {} });
  });

  return mock;
};

// グローバルに保持してモジュールリセット後も同じインスタンスを共有
const axios = global.__AXIOS_MOCK__ || createMock();
if (!global.__AXIOS_MOCK__) {
  global.__AXIOS_MOCK__ = axios;
}

// CommonJSとESモジュールの両方に対応
module.exports = axios;
module.exports.default = axios;
module.exports.__esModule = true;

// ESモジュールのnamed export対応
module.exports.axios = axios;
