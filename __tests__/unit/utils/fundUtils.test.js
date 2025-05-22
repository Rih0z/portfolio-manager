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
