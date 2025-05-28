import { guessFundType, estimateAnnualFee, estimateDividendYield } from '@/utils/fundUtils';

describe('fundUtils', () => {
  describe('guessFundType', () => {
    it('returns US ETF for known ETF ticker', () => {
      expect(guessFundType('SPY')).toBe('ETF（米国）');
    });

    it('returns JP ETF for Japanese ticker', () => {
      expect(guessFundType('1306.T', 'TOPIX ETF')).toBe('ETF（日本）');
    });
  });

  describe('estimateAnnualFee', () => {
    it('uses specific fee for known ticker', () => {
      const result = estimateAnnualFee('VOO');
      expect(result).toEqual(expect.objectContaining({ fee: 0.03, isEstimated: false }));
    });
  });

  describe('estimateDividendYield', () => {
    it('returns average yield for US ETF', () => {
      const result = estimateDividendYield('VTI');
      expect(result).toEqual(expect.objectContaining({ yield: 1.5, hasDividend: true }));
    });
  });
});

import { extractFundInfo } from '@/utils/fundUtils';

describe('extractFundInfo', () => {
  it('detects region, currency and dividend info for US ETF', () => {
    const info = extractFundInfo('VOO', 'Vanguard S&P 500 ETF');
    expect(info).toEqual(
      expect.objectContaining({
        region: '米国',
        currency: 'USD',
        hasDividend: true,
        fundType: 'ETF（米国）',
        isStock: false
      })
    );
  });

  it('detects stock with no dividend info for JP stock', () => {
    const info = extractFundInfo('7203.T', 'トヨタ自動車');
    expect(info).toEqual(
      expect.objectContaining({
        region: '日本',
        currency: 'JPY',
        fundType: '個別株',
        isStock: true,
        hasDividend: false
      })
    );
  });

  it('classifies REIT ETF correctly', () => {
    const info = extractFundInfo('VNQ', 'Vanguard Real Estate ETF');
    expect(info).toEqual(
      expect.objectContaining({
        region: '米国',
        fundType: 'REIT（米国）',
        hasDividend: true,
        isStock: false
      })
    );
  });
});
