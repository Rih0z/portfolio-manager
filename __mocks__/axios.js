/**
 * ファイルパス: __mocks__/axios.js
 * 
 * Axiosライブラリのモック実装
 * テスト時にAxiosをモック化してHTTPリクエストをシミュレート
 */

const axios = {
  // 基本的なリクエストメソッド
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),
  
  // Axiosインスタンス作成メソッド
  create: jest.fn(function(config = {}) {
    return {
      ...axios,
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
    };
  }),
  
  // デフォルト設定
  defaults: {
    headers: {
      common: {}
    }
  },
  
  // レスポンスをリセットするヘルパーメソッド
  _reset: function() {
    axios.get.mockClear();
    axios.post.mockClear();
    axios.put.mockClear();
    axios.delete.mockClear();
    axios.patch.mockClear();
    axios.create.mockClear();
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
