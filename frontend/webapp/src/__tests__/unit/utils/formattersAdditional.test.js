import {
  formatPercent,
  formatDateIntl
} from '../../../utils/formatters';

describe('formattersAdditional - 追加のフォーマット関数テスト', () => {
  describe('formatPercent', () => {
    test('正の値を正しくフォーマットする', () => {
      expect(formatPercent(10)).toBe('10%');
      expect(formatPercent(10.5)).toBe('10.5%');
      expect(formatPercent(10.00)).toBe('10%');
    });

    test('負の値を正しくフォーマットする', () => {
      expect(formatPercent(-10)).toBe('-10%');
      expect(formatPercent(-10.5)).toBe('-10.5%');
    });

    test('小数点桁数を指定できる', () => {
      expect(formatPercent(10.123, 2)).toBe('10.12%');
      expect(formatPercent(10.999, 1)).toBe('11.0%');
      expect(formatPercent(10.5, 3)).toBe('10.500%');
    });

    test('デフォルトで小数点2桁を表示する', () => {
      expect(formatPercent(10.123456)).toBe('10.12%');
    });

    test('.00で終わる場合は整数として表示する', () => {
      expect(formatPercent(10.00, 2)).toBe('10%');
      expect(formatPercent(20.00, 2)).toBe('20%');
    });

    test('無効な値を適切に処理する', () => {
      expect(formatPercent(null)).toBe('N/A');
      expect(formatPercent(undefined)).toBe('N/A');
      expect(formatPercent(NaN)).toBe('N/A');
      expect(formatPercent('abc')).toBe('N/A');
    });

    test('ゼロを正しくフォーマットする', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(0, 2)).toBe('0%');
    });

    test('非常に小さな値を正しくフォーマットする', () => {
      expect(formatPercent(0.01, 2)).toBe('0.01%');
      expect(formatPercent(0.001, 3)).toBe('0.001%');
    });

    test('非常に大きな値を正しくフォーマットする', () => {
      expect(formatPercent(999.99)).toBe('999.99%');
      expect(formatPercent(1000.00)).toBe('1000%');
    });

    test('文字列の数値を処理する', () => {
      expect(formatPercent('10')).toBe('N/A');
      expect(formatPercent('10.5')).toBe('N/A');
    });

    test('配列やオブジェクトを処理する', () => {
      expect(formatPercent([])).toBe('N/A');
      expect(formatPercent({})).toBe('N/A');
    });

    test('Infinityを処理する', () => {
      expect(formatPercent(Infinity)).toBe('N/A');
      expect(formatPercent(-Infinity)).toBe('N/A');
    });

    test('小数点以下が00の場合の特殊処理', () => {
      expect(formatPercent(15.00, 2)).toBe('15%');
      expect(formatPercent(15.10, 2)).toBe('15.10%');
      expect(formatPercent(15.01, 2)).toBe('15.01%');
    });

    test('丸め処理が正しく動作する', () => {
      expect(formatPercent(10.125, 2)).toBe('10.13%');
      expect(formatPercent(10.124, 2)).toBe('10.12%');
      expect(formatPercent(10.999, 2)).toBe('11.00%');
    });
  });

  describe('formatDateIntl', () => {
    test('Dateオブジェクトを正しくフォーマットする', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDateIntl(date);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    test('ISO文字列を正しくフォーマットする', () => {
      const result = formatDateIntl('2024-01-15T10:30:00Z');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    test('タイムスタンプを正しくフォーマットする', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
      const result = formatDateIntl(timestamp);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    test('カスタムオプションを適用する', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const result = formatDateIntl(date, options);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    test('デフォルトオプションとカスタムオプションがマージされる', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const options = { month: 'long' };
      const result = formatDateIntl(date, options);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    test('ロケールを指定できる', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDateIntl(date, {}, 'en-US');
      expect(result).toMatch(/01.*15.*2024|2024.*01.*15/);
    });

    test('無効な日付を適切に処理する', () => {
      expect(formatDateIntl(null)).toBe('Invalid Date');
      expect(formatDateIntl(undefined)).toBe('Invalid Date');
      expect(formatDateIntl('')).toBe('Invalid Date');
      expect(formatDateIntl('invalid')).toBe('Invalid Date');
    });

    test('例外が発生した場合もInvalid Dateを返す', () => {
      // 不正な日付オブジェクトを作成
      const invalidDate = new Date('invalid');
      expect(formatDateIntl(invalidDate)).toBe('Invalid Date');
    });

    test('異なるロケールで異なるフォーマットになる', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const jaResult = formatDateIntl(date, {}, 'ja-JP');
      const usResult = formatDateIntl(date, {}, 'en-US');
      
      // 日本語ロケールでは年/月/日の順
      expect(jaResult).toMatch(/2024.*01.*15/);
      // 英語ロケールでは月/日/年の順の可能性
      expect(usResult).toMatch(/01.*15.*2024|2024.*01.*15/);
    });

    test('時間を含むオプションも動作する', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      const result = formatDateIntl(date, options);
      expect(result).toContain('2024');
    });

    test('falsy値を処理する', () => {
      expect(formatDateIntl(false)).toBe('Invalid Date');
      expect(formatDateIntl(0)).toBe('Invalid Date');
      expect(formatDateIntl(NaN)).toBe('Invalid Date');
    });

    test('デフォルトロケールは日本語', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const defaultResult = formatDateIntl(date);
      const jaResult = formatDateIntl(date, {}, 'ja-JP');
      
      // 両方とも同じフォーマットになるはず
      expect(defaultResult).toMatch(/2024.*01.*15/);
      expect(jaResult).toMatch(/2024.*01.*15/);
    });

    test('エラーをキャッチして適切に処理する', () => {
      // toLocaleDateStringが例外を投げる場合をシミュレート
      const badDate = {
        toLocaleDateString: () => {
          throw new Error('Locale not supported');
        }
      };
      
      // DateコンストラクタをバイパスしてformatDateIntlを呼び出すことはできないので、
      // 代わりに無効な入力でのエラーハンドリングをテスト
      expect(formatDateIntl({ invalid: 'object' })).toBe('Invalid Date');
    });
  });
});