/**
 * ファイルパス: __mocks__/axios.js
 *
 * Axiosライブラリのモック実装
 * テスト時にAxiosをモック化してHTTPリクエストをシミュレート
 */

// モックインスタンスを生成
const createMock = () => {
  const createInstance = (config = {}) => ({
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    defaults: {
      ...config,
      headers: {
        common: {},
        ...config.headers,
      },
    },
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
        clear: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
        clear: jest.fn(),
      },
    },
  });

  const mock = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    create: jest.fn((config = {}) => createInstance(config)),
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
