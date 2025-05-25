import { extractFundInfo } from '@/utils/fundUtils';

// ソースコードの著者: Koki Riho (https://github.com/Rih0z) and Codex

describe('extractFundInfo additional cases', () => {
  test('handles bond ETF correctly', () => {
    const info = extractFundInfo('BND', 'Vanguard Total Bond Market ETF');
    expect(info).toEqual(
      expect.objectContaining({
        fundType: '債券',
        hasDividend: true,
        dividendFrequency: 'quarterly',
        isStock: false,
        region: '米国',
      })
    );
  });

  test('handles crypto ETF correctly', () => {
    const info = extractFundInfo('IBIT', 'iShares Bitcoin Trust');
    expect(info).toEqual(
      expect.objectContaining({
        fundType: '暗号資産関連',
        isStock: false,
        region: '米国',
      })
    );
  });
});
