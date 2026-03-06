/**
 * Vitest セットアップファイル
 * jest.setup.js + src/setupTests.js を統合・移行
 */
import { vi, beforeAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills
Object.assign(global, { TextEncoder, TextDecoder });

// テスト環境変数の設定
process.env.NODE_ENV = 'test';
process.env.VITE_MARKET_DATA_API_URL = process.env.VITE_MARKET_DATA_API_URL || 'https://api.example.com';
process.env.VITE_API_STAGE = process.env.VITE_API_STAGE || 'test';
process.env.VITE_GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'test-client-id';
process.env.VITE_DEFAULT_EXCHANGE_RATE = process.env.VITE_DEFAULT_EXCHANGE_RATE || '150.0';

// userEvent v13 polyfill
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const userEventModule = require('@testing-library/user-event');
  const target = userEventModule.default || userEventModule;
  if (target && typeof target.setup !== 'function') {
    target.setup = () => target;
    if (userEventModule.default && userEventModule.default.setup !== target.setup) {
      userEventModule.default.setup = target.setup;
    }
  }
} catch {
  // user-event not available
}

// react-helmet-async グローバルモック（SEOHead を使用するコンポーネント全般向け）
vi.mock('react-helmet-async', () => {
  const React = require('react');
  return {
    Helmet: () => null,
    HelmetProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

// グローバルモックの設定
(global as any).fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
);

// localStorage モック
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};
(global as any).localStorage = localStorageMock;

// sessionStorage モック
const sessionStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};
(global as any).sessionStorage = sessionStorageMock;

// ブラウザAPI モック
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

(global as any).IntersectionObserver = vi.fn().mockImplementation((_callback: any, options: any) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: options?.root || null,
  rootMargin: options?.rootMargin || '0px',
  thresholds: options?.threshold || [0],
}));

(global as any).MutationObserver = class {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
};

// Media Query モック
(window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// URL モック
const OriginalURL = global.URL;
(global as any).URL = class MockURL extends OriginalURL {
  constructor(url: string, base?: string) {
    super(url, base);
  }
  static createObjectURL(_blob: Blob) {
    return 'blob:mock-url';
  }
  static revokeObjectURL(_url: string) {
    // no-op
  }
};

// File API モック
(global as any).File = vi.fn().mockImplementation((bits: any[], name: string, options: any) => ({
  name,
  size: bits.reduce((acc: number, bit: any) => acc + (bit.length || bit.byteLength || 0), 0),
  type: options?.type || '',
  lastModified: Date.now(),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  stream: () => new ReadableStream(),
}));

(global as any).FileReader = vi.fn().mockImplementation(() => ({
  readAsText: vi.fn(function (this: any, _file: any) {
    setTimeout(() => {
      this.onload?.({ target: { result: 'mock file content' } });
    }, 0);
  }),
  readAsDataURL: vi.fn(function (this: any, _file: any) {
    setTimeout(() => {
      this.onload?.({ target: { result: 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=' } });
    }, 0);
  }),
  readAsArrayBuffer: vi.fn(function (this: any, _file: any) {
    setTimeout(() => {
      this.onload?.({ target: { result: new ArrayBuffer(0) } });
    }, 0);
  }),
  abort: vi.fn(),
  onload: null,
  onerror: null,
  onabort: null,
  readyState: 0,
  result: null,
  error: null,
}));

// Console モック — エラーと警告は通す
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: vi.fn(),
  info: vi.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
  debug: vi.fn(),
} as any;

// グローバルテストヘルパー
(global as any).testHelpers = {
  resetAllMocks: () => {
    vi.clearAllMocks();
  },
};

// テスト実行時のエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
