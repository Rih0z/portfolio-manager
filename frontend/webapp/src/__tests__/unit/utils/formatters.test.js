/**
 * formatters.js のユニットテスト
 * 数値・通貨・日付フォーマット関数のテスト
 */

import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatDateIntl,
  formatDateRelative
} from '../../../utils/formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('JPY通貨を正しくフォーマットする', () => {
      expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
      expect(formatCurrency(1234567, 'JPY')).toBe('¥1,234,567');
      expect(formatCurrency(0, 'JPY')).toBe('¥0');
    });

    it('USD通貨を正しくフォーマットする', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('小数点を含むJPYを正しく処理する', () => {
      expect(formatCurrency(1000.5, 'JPY')).toBe('¥1,001');
      expect(formatCurrency(1000.4, 'JPY')).toBe('¥1,000');
    });

    it('負の値を正しくフォーマットする', () => {
      expect(formatCurrency(-1000, 'JPY')).toBe('-¥1,000');
      expect(formatCurrency(-1000, 'USD')).toBe('-$1,000.00');
    });

    it('デフォルト通貨（JPY）を使用する', () => {
      expect(formatCurrency(1000)).toBe('¥1,000');
    });

    it('無効な値を適切に処理する', () => {
      expect(formatCurrency(null, 'JPY')).toBe('¥0');
      expect(formatCurrency(undefined, 'JPY')).toBe('¥0');
      expect(formatCurrency(NaN, 'JPY')).toBe('¥0');
    });

    it('非常に大きな値を正しくフォーマットする', () => {
      expect(formatCurrency(1000000000, 'JPY')).toBe('¥1,000,000,000');
      expect(formatCurrency(1000000000.99, 'USD')).toBe('$1,000,000,000.99');
    });

    it('非常に小さな値を正しくフォーマットする', () => {
      expect(formatCurrency(0.01, 'USD')).toBe('$0.01');
      expect(formatCurrency(0.99, 'USD')).toBe('$0.99');
      expect(formatCurrency(0.01, 'JPY')).toBe('¥0');
    });

    it('サポートされていない通貨でもエラーが発生しない', () => {
      expect(() => formatCurrency(1000, 'EUR')).not.toThrow();
      expect(formatCurrency(1000, 'EUR')).toContain('1,000');
    });
  });

  describe('formatPercentage', () => {
    it('正の値を正しくフォーマットする', () => {
      expect(formatPercentage(0.1)).toBe('10.0%');
      expect(formatPercentage(0.125)).toBe('12.5%');
      expect(formatPercentage(1)).toBe('100.0%');
      expect(formatPercentage(1.5)).toBe('150.0%');
    });

    it('負の値を正しくフォーマットする', () => {
      expect(formatPercentage(-0.1)).toBe('-10.0%');
      expect(formatPercentage(-0.125)).toBe('-12.5%');
    });

    it('ゼロを正しくフォーマットする', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('小数点桁数を指定できる', () => {
      expect(formatPercentage(0.123456, 2)).toBe('12.35%');
      expect(formatPercentage(0.123456, 0)).toBe('12%');
      expect(formatPercentage(0.123456, 4)).toBe('12.3456%');
    });

    it('デフォルトで小数点1桁を表示する', () => {
      expect(formatPercentage(0.123456)).toBe('12.3%');
    });

    it('無効な値を適切に処理する', () => {
      expect(formatPercentage(null)).toBe('0.0%');
      expect(formatPercentage(undefined)).toBe('0.0%');
      expect(formatPercentage(NaN)).toBe('0.0%');
    });

    it('非常に小さな値を正しくフォーマットする', () => {
      expect(formatPercentage(0.00001)).toBe('0.0%');
      expect(formatPercentage(0.00001, 3)).toBe('0.001%');
    });

    it('非常に大きな値を正しくフォーマットする', () => {
      expect(formatPercentage(100)).toBe('10000.0%');
    });
  });

  describe('formatNumber', () => {
    it('整数を正しくフォーマットする', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(0)).toBe('0');
    });

    it('小数を正しくフォーマットする', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5');
      expect(formatNumber(1234.567)).toBe('1,234.567');
    });

    it('負の値を正しくフォーマットする', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1234.56)).toBe('-1,234.56');
    });

    it('小数点桁数を指定できる', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.567, 0)).toBe('1,235');
      expect(formatNumber(1234.1, 2)).toBe('1,234.10');
    });

    it('無効な値を適切に処理する', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });

    it('文字列の数値を正しく処理する', () => {
      expect(formatNumber('1000')).toBe('1,000');
      expect(formatNumber('1234.56')).toBe('1,234.56');
    });

    it('無効な文字列を適切に処理する', () => {
      expect(formatNumber('abc')).toBe('0');
      expect(formatNumber('')).toBe('0');
    });

    it('非常に大きな値を正しくフォーマットする', () => {
      expect(formatNumber(1000000000)).toBe('1,000,000,000');
      expect(formatNumber(1.23e15)).toBe('1,230,000,000,000,000');
    });

    it('非常に小さな値を正しくフォーマットする', () => {
      expect(formatNumber(0.001)).toBe('0.001');
      expect(formatNumber(0.000001, 6)).toBe('0.000001');
    });
  });

  describe('formatDate', () => {
    it('Dateオブジェクトを正しくフォーマットする', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/2024[-\/]01[-\/]15/);
    });

    it('ISO文字列を正しくフォーマットする', () => {
      const isoString = '2024-01-15T10:30:00Z';
      const result = formatDate(isoString);
      expect(result).toMatch(/2024[-\/]01[-\/]15/);
    });

    it('タイムスタンプを正しくフォーマットする', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/2024[-\/]01[-\/]15/);
    });

    it('フォーマットオプションを適用する', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const result = formatDate(date, options);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('日本語ロケールでフォーマットする', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date, {}, 'ja-JP');
      expect(result).toMatch(/2024[年\/\-].*1[月\/\-].*15/);
    });

    it('無効な日付を適切に処理する', () => {
      expect(formatDate(null)).toBe('Invalid Date');
      expect(formatDate(undefined)).toBe('Invalid Date');
      expect(formatDate('invalid')).toBe('Invalid Date');
    });

    it('空文字列を適切に処理する', () => {
      expect(formatDate('')).toBe('Invalid Date');
    });
  });

  describe('formatDateRelative', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('数分前を正しく表示する', () => {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatDateRelative(fiveMinutesAgo);
      expect(result).toContain('分前');
    });

    it('数時間前を正しく表示する', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const result = formatDateRelative(twoHoursAgo);
      expect(result).toContain('時間前');
    });

    it('数日前を正しく表示する', () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = formatDateRelative(threeDaysAgo);
      expect(result).toContain('日前');
    });

    it('数秒前を正しく表示する', () => {
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      const result = formatDateRelative(thirtySecondsAgo);
      expect(result).toContain('秒前');
    });

    it('未来の日付を正しく表示する', () => {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const result = formatDateRelative(tomorrow);
      expect(result).toContain('後') || expect(result).toContain('in');
    });

    it('ISO文字列を受け付ける', () => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const result = formatDateRelative(oneHourAgo);
      expect(result).toContain('時間前');
    });

    it('無効な日付を適切に処理する', () => {
      expect(formatDateRelative(null)).toBe('Invalid Date');
      expect(formatDateRelative(undefined)).toBe('Invalid Date');
      expect(formatDateRelative('invalid')).toBe('Invalid Date');
    });

    it('カスタムロケールを使用する', () => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const result = formatDateRelative(oneHourAgo, 'en-US');
      expect(result).toContain('ago') || expect(result).toContain('hour');
    });
  });

  describe('エッジケースとパフォーマンス', () => {
    it('Infinityを適切に処理する', () => {
      expect(formatCurrency(Infinity, 'JPY')).toBe('¥0');
      expect(formatPercentage(Infinity)).toBe('0.0%');
      expect(formatNumber(Infinity)).toBe('0');
    });

    it('-Infinityを適切に処理する', () => {
      expect(formatCurrency(-Infinity, 'JPY')).toBe('¥0');
      expect(formatPercentage(-Infinity)).toBe('0.0%');
      expect(formatNumber(-Infinity)).toBe('0');
    });

    it('非数値型を適切に処理する', () => {
      expect(formatCurrency({}, 'JPY')).toBe('¥0');
      expect(formatPercentage([])).toBe('0.0%');
      expect(formatNumber('abc')).toBe('0');
    });

    it('大量のデータを高速で処理できる', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        formatCurrency(Math.random() * 1000000, 'JPY');
        formatPercentage(Math.random());
        formatNumber(Math.random() * 1000000);
        formatDate(new Date());
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    it('同時実行しても競合状態が発生しない', () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          const value = i * 1000;
          return {
            currency: formatCurrency(value, 'JPY'),
            percentage: formatPercentage(value / 100000),
            number: formatNumber(value)
          };
        })
      );
      
      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(100);
        results.forEach((result, i) => {
          expect(result.currency).toContain((i * 1000).toLocaleString());
        });
      });
    });
  });

  describe('ブラウザ互換性', () => {
    it('古いブラウザでもエラーが発生しない', () => {
      // Intl.NumberFormatが利用できない場合をシミュレート
      const originalIntl = global.Intl;
      global.Intl = undefined;
      
      // 基本的な関数は動作する（エラーが発生しない）
      expect(() => formatCurrency(1000, 'JPY')).not.toThrow();
      expect(() => formatPercentage(0.1)).not.toThrow();
      expect(() => formatNumber(1000)).not.toThrow();
      
      global.Intl = originalIntl;
    });

    it('Intl.RelativeTimeFormatが利用できない場合も動作する', () => {
      const originalRelativeTimeFormat = global.Intl?.RelativeTimeFormat;
      if (global.Intl) {
        global.Intl.RelativeTimeFormat = undefined;
      }
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(() => formatDateRelative(oneHourAgo)).not.toThrow();
      
      if (global.Intl) {
        global.Intl.RelativeTimeFormat = originalRelativeTimeFormat;
      }
    });
  });
});