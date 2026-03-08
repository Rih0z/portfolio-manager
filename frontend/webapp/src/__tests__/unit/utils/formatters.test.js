import { vi } from "vitest";
/**
 * formatters.js のユニットテスト
 * 数値・通貨・日付フォーマット関数のテスト
 */

import {
  formatCurrency,
  formatPercent,
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
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
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

    it.skip('未来の日付を正しく表示する', () => {
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

  describe('formatPercent', () => {
    it('正の値を正しくフォーマットする', () => {
      expect(formatPercent(10)).toBe('10%');
      expect(formatPercent(12.5)).toBe('12.50%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('負の値を正しくフォーマットする', () => {
      expect(formatPercent(-10)).toBe('-10%');
      expect(formatPercent(-12.5)).toBe('-12.50%');
    });

    it('ゼロを正しくフォーマットする', () => {
      expect(formatPercent(0)).toBe('0%');
    });

    it('.00で終わる値の末尾ゼロを除去する', () => {
      // value.toFixed(2) が '.00' で終わる場合、整数部分のみ表示
      expect(formatPercent(5)).toBe('5%');
      expect(formatPercent(100)).toBe('100%');
      expect(formatPercent(-3)).toBe('-3%');
    });

    it('.00で終わらない小数値はそのまま表示する', () => {
      // toFixed(2)の結果が'.00'で終わらないので、そのまま返される
      expect(formatPercent(5.25)).toBe('5.25%');
      expect(formatPercent(10.10)).toBe('10.10%'); // 10.1.toFixed(2) = "10.10"
      expect(formatPercent(0.01)).toBe('0.01%');
    });

    it('小数点桁数を指定できる', () => {
      expect(formatPercent(12.345, 1)).toBe('12.3%');
      expect(formatPercent(12.345, 0)).toBe('12%');
      expect(formatPercent(12.345, 3)).toBe('12.345%');
      expect(formatPercent(12.345, 4)).toBe('12.3450%');
    });

    it('fractionDigits=0の場合は整数表示する', () => {
      expect(formatPercent(12.6, 0)).toBe('13%');
      expect(formatPercent(0, 0)).toBe('0%');
    });

    it('NaNの場合はN/Aを返す', () => {
      expect(formatPercent(NaN)).toBe('N/A');
    });

    it('非数値型の場合はN/Aを返す', () => {
      expect(formatPercent('abc')).toBe('N/A');
      expect(formatPercent(undefined)).toBe('N/A');
      expect(formatPercent(null)).toBe('N/A');
    });

    it('デフォルトで小数点2桁を使用する', () => {
      expect(formatPercent(12.345)).toBe('12.35%');
      expect(formatPercent(12.3)).toBe('12.30%'); // 12.3.toFixed(2) = "12.30"
    });
  });

  describe('formatDate with formatStr', () => {
    it('yyyy/MM/ddフォーマットで日付を返す', () => {
      const date = new Date(2024, 0, 15); // 2024-01-15 ローカル
      expect(formatDate(date, 'yyyy/MM/dd')).toBe('2024/01/15');
    });

    it('yyyy/MM/ddフォーマットで月・日を0埋めする', () => {
      const date = new Date(2024, 2, 5); // 2024-03-05 ローカル
      expect(formatDate(date, 'yyyy/MM/dd')).toBe('2024/03/05');
    });

    it('yyyy/MM/ddフォーマットで文字列日付を処理する', () => {
      const result = formatDate('2024-12-25T00:00:00', 'yyyy/MM/dd');
      expect(result).toBe('2024/12/25');
    });

    it('yyyy/MM/ddフォーマットでタイムスタンプを処理する', () => {
      const timestamp = new Date(2024, 5, 1).getTime(); // 2024-06-01 ローカル
      expect(formatDate(timestamp, 'yyyy/MM/dd')).toBe('2024/06/01');
    });

    it('formatStrなしの場合はデフォルトのISO風フォーマットを返す', () => {
      const date = new Date(2024, 0, 15);
      expect(formatDate(date)).toBe('2024-01-15');
    });
  });

  describe('formatDateIntl', () => {
    it('デフォルトオプションとja-JPロケールでフォーマットする', () => {
      const result = formatDateIntl(new Date('2024-01-15T00:00:00'));
      // ja-JPロケールでyear:numeric, month:2-digit, day:2-digitのデフォルト
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    it('カスタムオプションを適用する', () => {
      const result = formatDateIntl(new Date('2024-01-15T00:00:00'), {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }, 'ja-JP');
      expect(result).toContain('2024');
    });

    it('en-USロケールでフォーマットする', () => {
      const result = formatDateIntl(new Date('2024-01-15T00:00:00'), {}, 'en-US');
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('文字列日付を受け付ける', () => {
      const result = formatDateIntl('2024-06-20T00:00:00');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/06/);
      expect(result).toMatch(/20/);
    });

    it('タイムスタンプを受け付ける', () => {
      const timestamp = new Date('2024-01-15T00:00:00').getTime();
      const result = formatDateIntl(timestamp);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    it('nullの場合はInvalid Dateを返す', () => {
      expect(formatDateIntl(null)).toBe('Invalid Date');
    });

    it('undefinedの場合はInvalid Dateを返す', () => {
      expect(formatDateIntl(undefined)).toBe('Invalid Date');
    });

    it('無効な文字列の場合はInvalid Dateを返す', () => {
      expect(formatDateIntl('not-a-date')).toBe('Invalid Date');
    });

    it('空文字列の場合はInvalid Dateを返す', () => {
      expect(formatDateIntl('')).toBe('Invalid Date');
    });

    it('カスタムオプションがデフォルトオプションをオーバーライドする', () => {
      const result = formatDateIntl(new Date('2024-01-15T00:00:00'), {
        month: 'short'
      }, 'en-US');
      // month: 'short' がデフォルトの month: '2-digit' をオーバーライド
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('toLocaleDateStringが例外をスローした場合はInvalid Dateを返す', () => {
      // 無効なオプションを渡してtoLocaleDateStringの例外をトリガー
      const result = formatDateIntl(new Date('2024-01-15T00:00:00'), {
        timeZone: 'Invalid/Timezone'
      });
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDateRelative 追加テスト', () => {
    const now = new Date('2024-01-15T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('未来の日付（秒単位）を正しく表示する', () => {
      const thirtySecondsLater = new Date(now.getTime() + 30 * 1000);
      const result = formatDateRelative(thirtySecondsLater);
      // diffMs が負数なので、rtf.format に正数が渡される → 「後」が含まれる
      expect(result).toMatch(/秒後|後/);
    });

    it('未来の日付（分単位）を正しく表示する', () => {
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
      const result = formatDateRelative(fiveMinutesLater);
      expect(result).toMatch(/分後|後/);
    });

    it('未来の日付（時間単位）を正しく表示する', () => {
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const result = formatDateRelative(twoHoursLater);
      expect(result).toMatch(/時間後|後/);
    });

    it('未来の日付（日単位）を正しく表示する', () => {
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const result = formatDateRelative(threeDaysLater);
      expect(result).toMatch(/日後|後/);
    });

    it('en-USロケールで秒単位を表示する', () => {
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
      const result = formatDateRelative(tenSecondsAgo, 'en-US');
      expect(result).toMatch(/second|ago/);
    });

    it('en-USロケールで分単位を表示する', () => {
      const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
      const result = formatDateRelative(threeMinutesAgo, 'en-US');
      expect(result).toMatch(/minute|ago/);
    });

    it('en-USロケールで日単位を表示する', () => {
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const result = formatDateRelative(twoDaysAgo, 'en-US');
      expect(result).toMatch(/day|ago/);
    });

    it('タイムスタンプ（数値）を受け付ける', () => {
      const fiveMinutesAgoMs = now.getTime() - 5 * 60 * 1000;
      const result = formatDateRelative(fiveMinutesAgoMs);
      expect(result).toContain('分前');
    });

    it('ちょうど1分の境界値を正しく処理する', () => {
      // 59999ms → 秒として扱われる
      const justUnder1Min = new Date(now.getTime() - 59999);
      const resultUnder = formatDateRelative(justUnder1Min);
      expect(resultUnder).toMatch(/秒前/);

      // 60000ms → 分として扱われる
      const exactly1Min = new Date(now.getTime() - 60000);
      const resultExact = formatDateRelative(exactly1Min);
      expect(resultExact).toMatch(/分前/);
    });

    it('ちょうど1時間の境界値を正しく処理する', () => {
      // 3599999ms → 分として扱われる
      const justUnder1Hr = new Date(now.getTime() - 3599999);
      const resultUnder = formatDateRelative(justUnder1Hr);
      expect(resultUnder).toMatch(/分前/);

      // 3600000ms → 時間として扱われる
      const exactly1Hr = new Date(now.getTime() - 3600000);
      const resultExact = formatDateRelative(exactly1Hr);
      expect(resultExact).toMatch(/時間前/);
    });

    it('ちょうど1日の境界値を正しく処理する', () => {
      // 86399999ms → 時間として扱われる
      const justUnder1Day = new Date(now.getTime() - 86399999);
      const resultUnder = formatDateRelative(justUnder1Day);
      expect(resultUnder).toMatch(/時間前/);

      // 86400000ms → 日として扱われる（numeric: 'auto'により「昨日」と表示される場合がある）
      const exactly1Day = new Date(now.getTime() - 86400000);
      const resultExact = formatDateRelative(exactly1Day);
      expect(resultExact).toMatch(/日前|昨日/);
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
    it.skip('古いブラウザでもエラーが発生しない', () => {
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