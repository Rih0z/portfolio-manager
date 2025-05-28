/**
 * ファイルパス: __tests__/unit/services/sources/fundDataService.test.js
 * 
 * 投資信託データ取得機能のユニットテスト
 * 投資信託データソースアダプターの機能をテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-15
 * @updated 2025-05-21 インポートパス修正: mutualFundData → fundDataService
 * @updated 2025-05-23 CSV形式での取得に対応するよう修正
 */

const fundDataService = require('../../../../src/services/sources/fundDataService');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { withRetry } = require('../../../../src/utils/retry');
const blacklist = require('../../../../src/utils/scrapingBlacklist');
const cacheService = require('../../../../src/services/cache');
const dataFetchUtils = require('../../../../src/utils/dataFetchUtils');
const alertService = require('../../../../src/services/alerts');

// 依存モジュールをモック化
jest.mock('axios');
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn()
}));
jest.mock('../../../../src/utils/retry');
jest.mock('../../../../src/utils/scrapingBlacklist');
jest.mock('../../../../src/services/cache');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/utils/dataFetchUtils');

describe('Fund Data Service', () => {
  // テスト用データ
  const testFundCode = '0131103C';
  const mockCsvContent = `日付,基準価額
2025-05-10,12345
2025-05-11,12468`;
  
  const mockParsedCsvData = [
    {
      '日付': '2025-05-10',
      '基準価額': '12345'
    },
    {
      '日付': '2025-05-11',
      '基準価額': '12468'
    }
  ];
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // axiosのモック
    axios.get.mockResolvedValue({
      status: 200,
      data: mockCsvContent
    });
    
    // CSV解析のモック
    parse.mockReturnValue(mockParsedCsvData);
    
    // withRetryのモック
    withRetry.mockImplementation((fn) => fn());
    
    // ブラックリストのモック
    blacklist.isBlacklisted.mockResolvedValue(false);
    blacklist.recordFailure.mockResolvedValue({ success: true });
    blacklist.recordSuccess.mockResolvedValue(true);
    
    // キャッシュのモック
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(undefined);
    
    // アラートのモック
    alertService.notifyError.mockResolvedValue({ success: true });
    
    // dataFetchUtilsのモック
    dataFetchUtils.getRandomUserAgent.mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    dataFetchUtils.recordDataFetchFailure.mockResolvedValue(undefined);
    dataFetchUtils.recordDataFetchSuccess.mockResolvedValue(undefined);
    dataFetchUtils.checkBlacklistAndGetFallback.mockImplementation(async (code, market, fallbackConfig) => {
      const isInBlacklist = await blacklist.isBlacklisted(code, market);
      return {
        isBlacklisted: isInBlacklist,
        fallbackData: {
          ticker: `${code}C`,
          price: fallbackConfig.defaultPrice || 10000,
          change: 0,
          changePercent: 0,
          name: fallbackConfig.name || `投資信託 ${code}`,
          currency: fallbackConfig.currencyCode || 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Blacklisted Fallback',
          isStock: false,
          isMutualFund: true,
          isBlacklisted: isInBlacklist
        }
      };
    });
  });

  describe('getMutualFundData', () => {
    test('単一ファンドコードのデータを取得する', async () => {
      // テスト対象の関数を実行
      const result = await fundDataService.getMutualFundData(testFundCode);
      
      // axios.getが正しく呼び出されたか検証
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(testFundCode),
        expect.any(Object)
      );
      
      // parse関数が呼び出されたか検証
      expect(parse).toHaveBeenCalledWith(
        mockCsvContent,
        expect.objectContaining({
          columns: true,
          skip_empty_lines: true
        })
      );
      
      // ブラックリストチェックが行われたか検証
      expect(blacklist.isBlacklisted).toHaveBeenCalled();
      
      // 結果の検証
      expect(result).toEqual(expect.objectContaining({
        ticker: expect.stringContaining(testFundCode),
        price: expect.any(Number),
        isMutualFund: true,
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: expect.stringContaining('Morningstar')
      }));
    });
    
    test('複数ファンドコードのデータを取得する', async () => {
      // 複数のファンドコード
      const fundCodes = ['0131103C', '2931113C'];
      
      // キャッシュのモック - 2つ目のコードにはキャッシュがあると想定
      cacheService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ticker: '2931113C',
          price: 5678,
          change: -45,
          changePercent: -0.78,
          name: 'テスト投資信託2',
          currency: 'JPY',
          isMutualFund: true,
          source: 'Cache'
        });
      
      // テスト対象の関数を実行
      const result = await fundDataService.getMutualFundsParallel(fundCodes);
      
      // 結果の検証
      expect(result).toHaveProperty('0131103C');
      expect(result).toHaveProperty('2931113C');
      
      // キャッシュされたデータを検証
      expect(result['2931113C'].price).toBe(5678);
      expect(result['2931113C'].change).toBe(-45);
      expect(result['2931113C'].changePercent).toBe(-0.78);
    });
    
    test('ブラックリストに登録されているファンドの場合、スクレイピングをスキップする', async () => {
      // ブラックリストにあるとモック
      blacklist.isBlacklisted.mockResolvedValue(true);
      
      // テスト対象の関数を実行
      const result = await fundDataService.getMutualFundData(testFundCode);
      
      // ブラックリストチェックが行われたか検証
      expect(blacklist.isBlacklisted).toHaveBeenCalled();
      
      // axiosが呼び出されなかったことを検証
      expect(axios.get).not.toHaveBeenCalled();
      
      // ブラックリスト結果の検証
      expect(result).toHaveProperty('isBlacklisted', true);
      expect(result).toHaveProperty('ticker', expect.stringContaining(testFundCode));
    });
    
    test('スクレイピングでエラーが発生した場合、エラーオブジェクトを返す', async () => {
      // axiosがエラーをスローするようにモック
      axios.get.mockRejectedValue(new Error('CSV retrieval failed'));
      
      // dataFetchUtils.recordDataFetchFailure が呼び出されるように設定
      dataFetchUtils.recordDataFetchFailure.mockResolvedValue(undefined);
      
      // テスト対象の関数を例外をキャッチして実行
      let error;
      try {
        await fundDataService.getMutualFundData(testFundCode);
      } catch (e) {
        error = e;
      }
      
      // エラーメッセージの検証
      expect(error).toBeDefined();
      expect(error.message).toContain('failed');
      
      // recordDataFetchFailure が呼び出されたことを検証
      expect(dataFetchUtils.recordDataFetchFailure).toHaveBeenCalled();
    });
  });

  describe('データ処理機能', () => {
    test('基準価額から数値が正しく抽出される', async () => {
      // getMutualFundData を実行して内部処理をテスト
      const result = await fundDataService.getMutualFundData(testFundCode);
      
      // CSV の最新データ（12468）が使われていることを確認
      expect(result.price).toBe(12468);
    });
    
    test('日付から最終更新日が正しく抽出される', async () => {
      // CSVデータに日付を含めて解析
      parse.mockReturnValue([
        {
          '日付': '2025-05-10',
          '基準価額': '12345'
        },
        {
          '日付': '2025-05-11',
          '基準価額': '12468'
        }
      ]);
      
      // getMutualFundData を実行して内部処理をテスト
      const result = await fundDataService.getMutualFundData(testFundCode);
      
      // lastUpdated フィールドが存在することを確認
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('dataDate', '2025-05-11');
    });
    
    test('前日比の変化額が正しく計算される', async () => {
      // CSVデータに日付を含めて解析
      parse.mockReturnValue([
        {
          '日付': '2025-05-10',
          '基準価額': '12345'
        },
        {
          '日付': '2025-05-11',
          '基準価額': '12468'
        }
      ]);
      
      // getMutualFundData を実行して内部処理をテスト
      const result = await fundDataService.getMutualFundData(testFundCode);
      
      // 変化額のチェック（12468 - 12345 = 123）
      expect(result.change).toBe(123);
      
      // 変化率のチェック（約 0.9963%）
      // 浮動小数点計算の誤差を考慮して近似値をチェック
      expect(result.changePercent).toBeCloseTo(123 / 12345 * 100, 2);
    });
  });
});
