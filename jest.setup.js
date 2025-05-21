/**
 * ファイルパス: jest.setup.js
 * 
 * Jest テスト開始前の基本環境設定
 * テスト実行に必要な環境変数のデフォルト値とモックの設定
 */

// Jest DOM拡張のインポート
import '@testing-library/jest-dom';

// テスト環境変数の設定
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
  REACT_APP_API_STAGE: 'dev',
  REACT_APP_GOOGLE_CLIENT_ID: 'test-client-id',
  REACT_APP_DEFAULT_EXCHANGE_RATE: '150.0'
};

// グローバルモックの設定
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// ブラウザAPI モック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// 日付のモック - テスト実行日を固定
jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2025-05-21T10:00:00.000Z').getTime());

// テスト開始時のログメッセージ
console.log('------------- テスト環境設定 -------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API_BASE_URL:', process.env.REACT_APP_MARKET_DATA_API_URL);
console.log('現在のテスト日時:', new Date(Date.now()).toISOString());
console.log('-----------------------------------------');
