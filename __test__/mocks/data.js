/**
 * ファイルパス: __test__/mocks/data.js
 * 
 * テスト用のモックデータ定義
 * API応答のモックやコンポーネントテスト用のデータを提供
 * 
 * @file __test__/mocks/data.js
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// 市場データのモック
export const mockMarketData = {
  // 米国株
  'AAPL': {
    ticker: 'AAPL',
    price: 174.79,
    name: 'Apple Inc.',
    currency: 'USD',
    isStock: true,
    isMutualFund: false,
    dividendYield: 0.5,
    hasDividend: true,
    dividendFrequency: 'quarterly',
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    exchangeMarket: 'NASDAQ',
    region: '米国',
    priceLabel: '株価'
  },
  'MSFT': {
    ticker: 'MSFT',
    price: 335.25,
    name: 'Microsoft Corporation',
    currency: 'USD',
    isStock: true,
    isMutualFund: false,
    dividendYield: 0.8,
    hasDividend: true,
    dividendFrequency: 'quarterly',
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    exchangeMarket: 'NASDAQ',
    region: '米国',
    priceLabel: '株価'
  },
  'GOOGL': {
    ticker: 'GOOGL',
    price: 2815.12,
    name: 'Alphabet Inc.',
    currency: 'USD',
    isStock: true,
    isMutualFund: false,
    dividendYield: 0,
    hasDividend: false,
    dividendFrequency: 'none',
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    exchangeMarket: 'NASDAQ',
    region: '米国',
    priceLabel: '株価'
  },
  
  // 日本株
  '7203.T': {
    ticker: '7203.T',
    price: 2100,
    name: 'トヨタ自動車',
    currency: 'JPY',
    isStock: true,
    isMutualFund: false,
    dividendYield: 2.5,
    hasDividend: true,
    dividendFrequency: 'semi-annual',
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    exchangeMarket: '東証',
    region: '日本',
    priceLabel: '株価'
  },
  '9432.T': {
    ticker: '9432.T',
    price: 4200,
    name: 'NTT',
    currency: 'JPY',
    isStock: true,
    isMutualFund: false,
    dividendYield: 3.2,
    hasDividend: true,
    dividendFrequency: 'semi-annual',
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    exchangeMarket: '東証',
    region: '日本',
    priceLabel: '株価'
  },
  
  // 投資信託
  '2931082C.T': {
    ticker: '2931082C.T',
    price: 10567,
    name: 'ひふみプラス',
    currency: 'JPY',
    isStock: false,
    isMutualFund: true,
    annualFee: 1.0505,
    dividendYield: 0,
    hasDividend: false,
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    fundType: '国内株式',
    region: '日本',
    priceLabel: '基準価額'
  },
  '2521133C.T': {
    ticker: '2521133C.T',
    price: 15624,
    name: 'eMAXIS Slim 米国株式（S&P500）',
    currency: 'JPY',
    isStock: false,
    isMutualFund: true,
    annualFee: 0.0968,
    dividendYield: 0,
    hasDividend: false,
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z',
    fundType: 'インデックス',
    region: '米国',
    priceLabel: '基準価額'
  }
};

// 為替レートのモック
export const mockExchangeRate = {
  base: 'USD',
  target: 'JPY',
  rate: 150.0,
  source: 'Market Data API',
  lastUpdated: '2025-05-12T14:23:45.678Z'
};

// ユーザープロファイルのモック
export const mockUserProfile = {
  id: '109476395873295845628',
  email: 'test@example.com',
  name: 'テストユーザー',
  picture: 'https://lh3.googleusercontent.com/a-/dummy-profile-picture'
};

// テーブルコンポーネント用のモックデータ
export const mockTableData = {
  columns: [
    { key: 'ticker', label: '銘柄コード', sortable: true },
    { key: 'name', label: '銘柄名', sortable: true },
    { key: 'price', label: '価格', sortable: true },
    { key: 'holdings', label: '保有数', sortable: true },
    { key: 'value', label: '評価額', sortable: true },
    { key: 'actions', label: '操作', sortable: false }
  ],
  data: [
    { id: '1', ticker: 'AAPL', name: 'Apple Inc.', price: 174.79, holdings: 10, value: 1747.9 },
    { id: '2', ticker: 'MSFT', name: 'Microsoft Corporation', price: 335.25, holdings: 5, value: 1676.25 },
    { id: '3', ticker: '7203.T', name: 'トヨタ自動車', price: 2100, holdings: 100, value: 210000 }
  ]
};

// チャートコンポーネント用のモックデータ
export const mockChartData = {
  pieChart: [
    { name: 'Apple Inc.', value: 1747.9, percentage: 35 },
    { name: 'Microsoft Corporation', value: 1676.25, percentage: 33 },
    { name: 'トヨタ自動車', value: 210000 / 150, percentage: 28 }, // 円をドルに換算
    { name: 'その他', value: 200, percentage: 4 }
  ],
  barChart: [
    { name: 'Apple Inc.', current: 35, target: 25, diff: 10 },
    { name: 'Microsoft Corporation', current: 33, target: 30, diff: 3 },
    { name: 'トヨタ自動車', current: 28, target: 40, diff: -12 },
    { name: 'その他', current: 4, target: 5, diff: -1 }
  ]
};

// シミュレーション結果のモックデータ
export const mockSimulationResults = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    currentAllocation: 35,
    targetAllocation: 25,
    diff: 10,
    currentValue: 1747.9,
    purchaseAmount: 0,
    purchaseShares: 0,
    price: 174.79,
    currency: 'USD',
    isMutualFund: false,
    source: 'Market Data API'
  },
  {
    ticker: '7203.T',
    name: 'トヨタ自動車',
    currentAllocation: 28,
    targetAllocation: 40,
    diff: -12,
    currentValue: 210000 / 150,
    purchaseAmount: 60000,
    purchaseShares: 28.57,
    price: 2100,
    currency: 'JPY',
    isMutualFund: false,
    source: 'Market Data API'
  },
  {
    ticker: '2521133C.T',
    name: 'eMAXIS Slim 米国株式（S&P500）',
    currentAllocation: 0,
    targetAllocation: 10,
    diff: -10,
    currentValue: 0,
    purchaseAmount: 50000,
    purchaseShares: 3.2,
    price: 15624,
    currency: 'JPY',
    isMutualFund: true,
    source: 'Market Data API'
  }
];

// ポートフォリオコンテキスト用のモックデータ
export const mockPortfolioContextData = {
  baseCurrency: 'JPY',
  exchangeRate: {
    rate: 150.0,
    source: 'Market Data API',
    lastUpdated: '2025-05-12T14:23:45.678Z'
  },
  currentAssets: [
    {
      id: '1',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 174.79,
      currency: 'USD',
      holdings: 10,
      annualFee: 0,
      isStock: true,
      isMutualFund: false,
      feeSource: '個別株',
      feeIsEstimated: false,
      dividendYield: 0.5,
      hasDividend: true,
      dividendFrequency: 'quarterly',
      dividendIsEstimated: false,
      source: 'Market Data API'
    },
    {
      id: '2',
      ticker: '7203.T',
      name: 'トヨタ自動車',
      price: 2100,
      currency: 'JPY',
      holdings: 100,
      annualFee: 0,
      isStock: true,
      isMutualFund: false,
      feeSource: '個別株',
      feeIsEstimated: false,
      dividendYield: 2.5,
      hasDividend: true,
      dividendFrequency: 'semi-annual',
      dividendIsEstimated: false,
      source: 'Market Data API'
    }
  ],
  targetPortfolio: [
    { id: '1', ticker: 'AAPL', targetPercentage: 30 },
    { id: '2', ticker: '7203.T', targetPercentage: 70 }
  ],
  additionalBudget: {
    amount: 100000,
    currency: 'JPY'
  },
  aiPromptTemplate: '# ポートフォリオ分析\n\n総資産: {totalAssets}{baseCurrency}\n毎月の投資予定額: {monthlyBudget}{budgetCurrency}\n\n## 現在のポートフォリオ配分\n{currentAllocation}\n\n## 目標ポートフォリオ配分\n{targetAllocation}\n\n以下の観点から分析してください:\n1. 各銘柄の評価と見通し\n2. ポートフォリオ全体のバランス\n3. リスク分散の状況\n4. 今後の投資戦略提案'
};

// 認証コンテキスト用のモックデータ
export const mockAuthContextData = {
  isAuthenticated: true,
  user: mockUserProfile,
  loading: false,
  error: null
};

// 通知用のモックデータ
export const mockNotifications = [
  { id: 1, message: 'データを更新しました', type: 'success' },
  { id: 2, message: '銘柄「AAPL」を追加しました', type: 'info' },
  { id: 3, message: 'API接続エラーが発生しました', type: 'error' }
];
