/**
 * ファイルパス: __tests__/unit/function/preWarmCache.test.js
 *
 * preWarmCache Lambda関数のユニットテスト
 * キャッシュの予熱処理が正常に実行されるか、エラーハンドリングが行われるかを検証します。
 */

const preWarmCache = require('../../../src/function/preWarmCache');

// 依存モジュールをモック化
const enhancedMarketDataService = require('../../../src/services/sources/enhancedMarketDataService');
const cache = require('../../../src/services/cache');
const alerts = require('../../../src/services/alerts');
const logger = require('../../../src/utils/logger');
const scrapingBlacklist = require('../../../src/utils/scrapingBlacklist');

jest.mock('../../../src/services/sources/enhancedMarketDataService');
jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/alerts');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/scrapingBlacklist');

// テスト用のシンボルリスト（モジュール内定数と同じ内容）
const US_STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'BRK-B', 'JPM', 'JNJ'];
const JP_STOCK_SYMBOLS = ['7203', '9984', '6758', '8306', '9432', '6861', '7974', '6501', '8035', '9433'];
const FUND_SYMBOLS = ['2931113C', '0131103C', '0231303C', '0131423C', '2931333C'];
const RATE_SYMBOLS = ['USD-JPY', 'EUR-USD', 'EUR-JPY', 'GBP-USD', 'USD-CNY'];

beforeEach(() => {
  jest.clearAllMocks();
  cache.cleanup.mockResolvedValue({ count: 0 });
  scrapingBlacklist.cleanupBlacklist.mockResolvedValue({ count: 0 });
  enhancedMarketDataService.getUsStocksData.mockResolvedValue({});
  enhancedMarketDataService.getJpStocksData.mockResolvedValue({});
  enhancedMarketDataService.getMutualFundsData.mockResolvedValue({});
  enhancedMarketDataService.getExchangeRateData.mockResolvedValue({});
});

describe('preWarmCache handler', () => {
  test('すべての予熱処理が成功した場合に成功レスポンスを返す', async () => {
    const result = await preWarmCache.handler({});

    expect(cache.cleanup).toHaveBeenCalled();
    expect(scrapingBlacklist.cleanupBlacklist).toHaveBeenCalled();
    expect(enhancedMarketDataService.getUsStocksData).toHaveBeenCalledWith(US_STOCK_SYMBOLS, true);
    expect(enhancedMarketDataService.getJpStocksData).toHaveBeenCalledWith(JP_STOCK_SYMBOLS, true);
    expect(enhancedMarketDataService.getMutualFundsData).toHaveBeenCalledWith(FUND_SYMBOLS, true);
    // 為替レートはシンボルを個別に処理
    RATE_SYMBOLS.forEach(pair => {
      const [base, target] = pair.split('-');
      expect(enhancedMarketDataService.getExchangeRateData).toHaveBeenCalledWith(base, target, true);
    });
    expect(alerts.sendAlert).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cache pre-warming completed successfully'
      })
    });
  });

  test('予熱処理中にエラーが発生した場合はアラートを送信し500を返す', async () => {
    enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('failure'));

    const result = await preWarmCache.handler({});

    expect(alerts.sendAlert).toHaveBeenCalled();
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Cache pre-warming failed');
  });
});
