/**
 * ファイルパス: jest.setup.js
 * 
 * Jest テスト開始前の基本環境設定（修正版）
 * テスト実行に必要な環境変数のデフォルト値とモックの設定
 * カバレッジ率の正確なビジュアル化に対応
 * 
 * @updated 2025-05-22 - カバレッジビジュアル化対応
 */

// デバッグログ関数
const debugLog = (message, data = null) => {
  if (process.env.DEBUG === 'true' || process.env.VERBOSE_COVERAGE === 'true') {
    console.log(`[JEST-SETUP] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
};

// テスト環境変数の設定
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  REACT_APP_MARKET_DATA_API_URL: process.env.REACT_APP_MARKET_DATA_API_URL || 'https://api.example.com',
  REACT_APP_API_STAGE: process.env.REACT_APP_API_STAGE || 'test',
  REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'test-client-id',
  REACT_APP_DEFAULT_EXCHANGE_RATE: process.env.REACT_APP_DEFAULT_EXCHANGE_RATE || '150.0',
  
  // カバレッジ関連の環境変数を強制設定
  JEST_COVERAGE: process.env.JEST_COVERAGE || 'true',
  COLLECT_COVERAGE: process.env.COLLECT_COVERAGE || 'true',
  FORCE_COLLECT_COVERAGE: process.env.FORCE_COLLECT_COVERAGE || 'true',
  ENABLE_COVERAGE: process.env.ENABLE_COVERAGE || 'true',
  
  // カバレッジ目標段階
  COVERAGE_TARGET: process.env.COVERAGE_TARGET || 'initial'
};

debugLog('テスト環境変数を設定', {
  NODE_ENV: process.env.NODE_ENV,
  COVERAGE_TARGET: process.env.COVERAGE_TARGET,
  JEST_COVERAGE: process.env.JEST_COVERAGE,
  COLLECT_COVERAGE: process.env.COLLECT_COVERAGE
});

// グローバルモックの設定
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      success: true,
      data: {}
    }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
);

// localStorage モック
const localStorageMock = {
  getItem: jest.fn((key) => {
    debugLog(`localStorage.getItem called with key: ${key}`);
    return null;
  }),
  setItem: jest.fn((key, value) => {
    debugLog(`localStorage.setItem called`, { key, value });
  }),
  removeItem: jest.fn((key) => {
    debugLog(`localStorage.removeItem called with key: ${key}`);
  }),
  clear: jest.fn(() => {
    debugLog('localStorage.clear called');
  }),
  key: jest.fn(),
  length: 0
};

global.localStorage = localStorageMock;

// sessionStorage モック
const sessionStorageMock = {  
  getItem: jest.fn((key) => {
    debugLog(`sessionStorage.getItem called with key: ${key}`);
    return null;
  }),
  setItem: jest.fn((key, value) => {
    debugLog(`sessionStorage.setItem called`, { key, value });
  }),
  removeItem: jest.fn((key) => {
    debugLog(`sessionStorage.removeItem called with key: ${key}`);
  }),
  clear: jest.fn(() => {
    debugLog('sessionStorage.clear called');
  }),
  key: jest.fn(),
  length: 0
};

global.sessionStorage = sessionStorageMock;

// ブラウザAPI モック
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    debugLog('ResizeObserver.observe called', { element: element?.tagName });
  }),
  unobserve: jest.fn((element) => {
    debugLog('ResizeObserver.unobserve called', { element: element?.tagName });
  }),
  disconnect: jest.fn(() => {
    debugLog('ResizeObserver.disconnect called');
  }),
}));

global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => ({
  observe: jest.fn((element) => {
    debugLog('IntersectionObserver.observe called', { element: element?.tagName });
  }),
  unobserve: jest.fn((element) => {
    debugLog('IntersectionObserver.unobserve called', { element: element?.tagName });
  }),
  disconnect: jest.fn(() => {
    debugLog('IntersectionObserver.disconnect called');
  }),
  root: options?.root || null,
  rootMargin: options?.rootMargin || '0px',
  thresholds: options?.threshold || [0]
}));

global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((target, options) => {
    debugLog('MutationObserver.observe called', { target: target?.tagName, options });
  }),
  disconnect: jest.fn(() => {
    debugLog('MutationObserver.disconnect called');
  }),
  takeRecords: jest.fn(() => {
    debugLog('MutationObserver.takeRecords called');
    return [];
  }),
}));

// Media Query モック
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn((event, handler) => {
    debugLog('matchMedia.addEventListener called', { event, query });
  }),
  removeEventListener: jest.fn((event, handler) => {
    debugLog('matchMedia.removeEventListener called', { event, query });
  }),
  dispatchEvent: jest.fn((event) => {
    debugLog('matchMedia.dispatchEvent called', { event: event.type, query });
  }),
}));

// URL モック - コンストラクタ機能を保持しつつ createObjectURL などを上書き
const OriginalURL = global.URL;
global.URL = class MockURL extends OriginalURL {
  constructor(url, base) {
    super(url, base);
  }
  static createObjectURL(blob) {
    debugLog('URL.createObjectURL called', { type: blob?.type, size: blob?.size });
    return 'blob:mock-url';
  }
  static revokeObjectURL(url) {
    debugLog('URL.revokeObjectURL called', { url });
  }
};

// File API モック
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name: name,
  size: bits.reduce((acc, bit) => acc + (bit.length || bit.byteLength || 0), 0),
  type: options?.type || '',
  lastModified: Date.now(),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  stream: () => new ReadableStream()
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(function(file) {
    debugLog('FileReader.readAsText called', { fileName: file?.name });
    setTimeout(() => {
      this.onload && this.onload({ target: { result: 'mock file content' } });
    }, 0);
  }),
  readAsDataURL: jest.fn(function(file) {
    debugLog('FileReader.readAsDataURL called', { fileName: file?.name });
    setTimeout(() => {
      this.onload && this.onload({ target: { result: 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=' } });
    }, 0);
  }),
  readAsArrayBuffer: jest.fn(function(file) {
    debugLog('FileReader.readAsArrayBuffer called', { fileName: file?.name });
    setTimeout(() => {
      this.onload && this.onload({ target: { result: new ArrayBuffer(0) } });
    }, 0);
  }),
  abort: jest.fn(),
  onload: null,
  onerror: null,
  onabort: null,
  readyState: 0,
  result: null,
  error: null
}));

// Console モック（カバレッジ計算のためのログを除外）
const originalConsole = { ...console };

// テスト中の不要なログを抑制（ただしエラーとカバレッジ関連は保持）
global.console = {
  ...originalConsole,
  log: jest.fn((...args) => {
    // カバレッジ関連のログとデバッグログは表示
    const message = args.join(' ');
    if (message.includes('coverage') || 
        message.includes('Coverage') ||
        message.includes('[DEBUG]') ||
        message.includes('[JEST-SETUP]') ||
        process.env.DEBUG === 'true') {
      originalConsole.log(...args);
    }
  }),
  info: jest.fn((...args) => {
    const message = args.join(' ');
    if (message.includes('coverage') || 
        message.includes('Coverage') ||
        process.env.DEBUG === 'true') {
      originalConsole.info(...args);
    }
  }),
  warn: originalConsole.warn, // 警告は常に表示
  error: originalConsole.error, // エラーは常に表示
  debug: jest.fn((...args) => {
    if (process.env.DEBUG === 'true') {
      originalConsole.debug(...args);
    }
  })
};

// 日付のモック - テスト実行日を固定（テストの再現性のため）
const mockDate = new Date('2025-05-22T10:00:00.000Z');
jest.spyOn(global.Date, 'now').mockImplementation(() => mockDate.getTime());

// Promise.resolve と Promise.reject のモック強化
const originalPromise = global.Promise;
global.Promise = class extends originalPromise {
  static resolve(value) {
    debugLog('Promise.resolve called', { hasValue: value !== undefined });
    return originalPromise.resolve(value);
  }
  
  static reject(reason) {
    debugLog('Promise.reject called', { reason: reason?.message || reason });
    return originalPromise.reject(reason);
  }
};

// setTimeout/setInterval のモック設定（非同期テスト用）
jest.useFakeTimers();

// カバレッジ設定の検証
function validateCoverageSetup() {
  const requiredVars = [
    'JEST_COVERAGE',
    'COLLECT_COVERAGE', 
    'COVERAGE_TARGET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠ 不足しているカバレッジ環境変数: ${missing.join(', ')}`);
    
    // 不足している変数をデフォルト値で設定
    missing.forEach(varName => {
      switch(varName) {
        case 'JEST_COVERAGE':
        case 'COLLECT_COVERAGE':
          process.env[varName] = 'true';
          break;
        case 'COVERAGE_TARGET':
          process.env[varName] = 'initial';
          break;
      }
    });
    
    debugLog('不足していたカバレッジ環境変数を設定', missing);
  }
}

// Jest設定の検証
function validateJestSetup() {
  // Jest環境の確認
  if (typeof jest === 'undefined') {
    throw new Error('Jest environment is not properly set up');
  }
  
  // expect関数はsetupFiles段階では利用できないため、チェックを削除
  // setupFilesAfterEnv段階で利用可能になる
  
  debugLog('Jest環境の検証完了');
}

// テスト実行時のエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // テスト環境では例外を投げない（テストの継続実行のため）
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // テスト環境では例外を投げない（テストの継続実行のため）
});

// セットアップの実行
try {
  validateCoverageSetup();
  validateJestSetup();
  
  debugLog('Jest setup completed successfully', {
    nodeEnv: process.env.NODE_ENV,
    coverageTarget: process.env.COVERAGE_TARGET,
    jestCoverage: process.env.JEST_COVERAGE,
    timestamp: new Date().toISOString()
  });
  
} catch (error) {
  console.error('Jest setup failed:', error.message);
  // セットアップ失敗時は詳細ログを出力するが、プロセスは継続
  if (process.env.DEBUG === 'true') {
    console.error(error.stack);
  }
}

// テスト開始時のログメッセージ
console.log('------------- テスト環境設定 -------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API_BASE_URL:', process.env.REACT_APP_MARKET_DATA_API_URL);
console.log('カバレッジ目標:', process.env.COVERAGE_TARGET);
console.log('カバレッジ有効:', process.env.JEST_COVERAGE);
console.log('現在のテスト日時:', mockDate.toISOString());
console.log('-----------------------------------------');

// グローバルテストヘルパー関数
global.testHelpers = {
  // テスト用のPromiseヘルパー
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  },
  
  // モックのリセット
  resetAllMocks: () => {
    jest.clearAllMocks();
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    debugLog('All mocks reset');
  },
  
  // カバレッジ情報の取得ヘルパー
  getCoverageInfo: () => {
    return {
      target: process.env.COVERAGE_TARGET,
      enabled: process.env.JEST_COVERAGE === 'true',
      collectEnabled: process.env.COLLECT_COVERAGE === 'true'
    };
  }
};

// テストファイル毎のセットアップ完了通知
debugLog('Jest setup file loaded successfully');
