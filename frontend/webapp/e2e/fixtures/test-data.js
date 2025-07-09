/**
 * Test data fixtures for E2E tests
 */

export const testPortfolioData = {
  holdings: [
    {
      tickerLocal: '9984',
      tickerUS: '9984.T',
      name: 'ソフトバンクグループ',
      quantity: 100,
      purchasePrice: 5000,
      currentPrice: 6000,
      marketValue: 600000,
      unrealizedGain: 100000,
      unrealizedGainPercent: 20,
      currency: 'JPY'
    },
    {
      tickerLocal: '7203',
      tickerUS: '7203.T',
      name: 'トヨタ自動車',
      quantity: 200,
      purchasePrice: 2000,
      currentPrice: 2500,
      marketValue: 500000,
      unrealizedGain: 100000,
      unrealizedGainPercent: 25,
      currency: 'JPY'
    },
    {
      tickerLocal: 'AAPL',
      tickerUS: 'AAPL',
      name: 'Apple Inc.',
      quantity: 50,
      purchasePrice: 150,
      currentPrice: 180,
      marketValue: 9000,
      unrealizedGain: 1500,
      unrealizedGainPercent: 20,
      currency: 'USD'
    }
  ],
  totals: {
    totalValue: 1109000,
    totalGain: 201500,
    totalGainPercent: 22.2
  }
};

export const testImportData = {
  csv: `tickerLocal,name,quantity,purchasePrice,currency
9984,ソフトバンクグループ,100,5000,JPY
7203,トヨタ自動車,200,2000,JPY
AAPL,Apple Inc.,50,150,USD`,
  
  json: JSON.stringify({
    holdings: [
      {
        tickerLocal: '9984',
        name: 'ソフトバンクグループ',
        quantity: 100,
        purchasePrice: 5000,
        currency: 'JPY'
      },
      {
        tickerLocal: '7203',
        name: 'トヨタ自動車',
        quantity: 200,
        purchasePrice: 2000,
        currency: 'JPY'
      },
      {
        tickerLocal: 'AAPL',
        name: 'Apple Inc.',
        quantity: 50,
        purchasePrice: 150,
        currency: 'USD'
      }
    ]
  }, null, 2)
};

export const testSettings = {
  defaultCurrency: 'JPY',
  exchangeRate: 150,
  marketDataSource: 'yahoo',
  displayLanguage: 'ja',
  theme: 'light',
  refreshInterval: 300 // 5 minutes
};

export const testAIPrompts = {
  riskAnalysis: 'ポートフォリオのリスクを分析してください。',
  optimizationSuggestion: 'ポートフォリオの最適化案を提案してください。',
  marketTrends: '現在の市場トレンドを考慮したアドバイスをください。'
};

export const testMarketData = {
  indices: [
    { symbol: '^N225', name: '日経平均', value: 33000, change: 1.2 },
    { symbol: '^DJI', name: 'ダウ平均', value: 35000, change: 0.8 },
    { symbol: '^GSPC', name: 'S&P500', value: 4500, change: 0.9 }
  ],
  exchangeRates: [
    { pair: 'USD/JPY', rate: 150, change: 0.3 },
    { pair: 'EUR/JPY', rate: 160, change: -0.2 }
  ]
};