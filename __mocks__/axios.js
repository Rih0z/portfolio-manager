/**
 * ファイルパス: __mocks__/axios.js
 * 
 * Axiosライブラリのモック実装
 * テスト時にAxiosをモック化してHTTPリクエストをシミュレート
 */

// 個別インスタンスを生成するヘルパー
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
      ...config.headers
    }
  },
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn()
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn()
    }
  }
});

const axios = {
  // 基本的なリクエストメソッド
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),

  // Axiosインスタンス作成メソッド
  create: jest.fn(function(config = {}) {
    return createInstance(config);
  }),
  
  // デフォルト設定
  defaults: {
    headers: {
      common: {}
    }
  },
  
  // レスポンスをリセットするヘルパーメソッド
  _reset: function() {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
    axios.patch.mockReset();
    axios.create.mockReset();
  }
};

// テスト中にAxiosで直接オブジェクトを渡して呼ぶケースのためにメソッドを関数にも割り当て
axios.get.mockImplementation((url, config) => {
  if (typeof url === 'object') {
    return Promise.resolve({ data: {} });
  }
  return Promise.resolve({ data: {} });
});

module.exports = axios;
module.exports.default = axios;
module.exports.__esModule = true;
