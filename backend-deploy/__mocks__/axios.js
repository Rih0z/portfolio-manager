/**
 * Axios モック
 * @file __mocks__/axios.js
 */

module.exports = {
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  post: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  put: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  delete: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  create: jest.fn().mockReturnThis(),
  defaults: {
    headers: {
      common: {}
    }
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};