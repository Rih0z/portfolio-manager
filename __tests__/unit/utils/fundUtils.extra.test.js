import { guessFundType, estimateAnnualFee, estimateDividendYield, FUND_TYPES, FUND_TYPE_FEES } from '@/utils/fundUtils';

describe('fundUtils additional cases', () => {
  test('guessFundType handles various categories', () => {
    expect(guessFundType('VNQ', 'Real Estate ETF')).toBe(FUND_TYPES.REIT_US);
    expect(guessFundType('BND', 'Total Bond ETF')).toBe(FUND_TYPES.BOND);
    expect(guessFundType('GBTC', 'Bitcoin Trust')).toBe(FUND_TYPES.CRYPTO);
    expect(guessFundType('XYZ')).toBe(FUND_TYPES.STOCK);
  });

  test('estimateAnnualFee returns defaults for empty ticker', () => {
    const res = estimateAnnualFee('');
    expect(res).toEqual({
      fee: FUND_TYPE_FEES[FUND_TYPES.UNKNOWN],
      fundType: FUND_TYPES.UNKNOWN,
      source: 'ファンドタイプからの推定',
      isEstimated: true
    });
  });

  test('estimateAnnualFee for stock ticker is zero', () => {
    const res = estimateAnnualFee('AAPL', 'Apple Inc.');
    expect(res).toEqual({
      fee: 0,
      fundType: FUND_TYPES.STOCK,
      source: '個別株',
      isEstimated: false
    });
  });

  test('estimateDividendYield handles special tickers', () => {
    const gld = estimateDividendYield('GLD');
    expect(gld).toEqual({
      yield: 0,
      isEstimated: false,
      hasDividend: false,
      dividendFrequency: 'quarterly'
    });

    const bnd = estimateDividendYield('BND');
    expect(bnd).toEqual({
      yield: 2.8,
      isEstimated: false,
      hasDividend: true,
      dividendFrequency: 'quarterly'
    });
  });
});
