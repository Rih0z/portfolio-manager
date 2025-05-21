/**
 * ファイルパス: __test__/unit/utils/formatters.test.js
 * 
 * フォーマッターユーティリティの単体テスト
 * 通貨、パーセント、日付フォーマット関数のテスト
 * 
 * @author Koki Riho
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import { formatCurrency, formatPercent, formatDate } from '@/utils/formatters';

describe('フォーマッターユーティリティ', () => {
  describe('formatCurrency', () => {
    it('日本円のフォーマット', () => {
      const result = formatCurrency(1000, 'JPY');
      expect(result).toBe('¥1,000');
    });
    
    it('米ドルのフォーマット', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toBe('$1,000.00');
    });
    
    it('小数点以下を含む金額のフォーマット', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toBe('$1,234.56');
    });
    
    it('負の金額のフォーマット', () => {
      const result = formatCurrency(-500, 'JPY');
      expect(result).toBe('-¥500');
    });
    
    it('0の金額のフォーマット', () => {
      const result = formatCurrency(0, 'JPY');
      expect(result).toBe('¥0');
    });
    
    it('通貨指定がない場合はデフォルト通貨でフォーマット', () => {
      // 実装によってデフォルト通貨が異なる可能性があるため、
      // 結果の形式のみ確認
      const result = formatCurrency(1000);
      expect(result).toMatch(/^[¥$]1,000/);
    });
    
    it('数値でない値の場合はエラーメッセージを返す', () => {
      const result = formatCurrency('invalid', 'JPY');
      expect(result).toBe('N/A');
    });
  });
  
  describe('formatPercent', () => {
    it('整数値のパーセント変換', () => {
      const result = formatPercent(75);
      expect(result).toBe('75%');
    });
    
    it('小数値のパーセント変換（指定桁数なし）', () => {
      const result = formatPercent(12.345);
      expect(result).toBe('12.35%'); // デフォルトで小数点以下2桁
    });
    
    it('小数値のパーセント変換（桁数指定あり）', () => {
      const result = formatPercent(12.345, 1);
      expect(result).toBe('12.3%');
    });
    
    it('負の値のパーセント変換', () => {
      const result = formatPercent(-10);
      expect(result).toBe('-10%');
    });
    
    it('0のパーセント変換', () => {
      const result = formatPercent(0);
      expect(result).toBe('0%');
    });
    
    it('数値でない値の場合はエラーメッセージを返す', () => {
      const result = formatPercent('invalid');
      expect(result).toBe('N/A');
    });
  });
  
  describe('formatDate', () => {
    it('ISO形式の日付を日本形式に変換', () => {
      const result = formatDate('2023-07-20T10:00:00Z');
      expect(result).toBe('2023年7月20日');
    });
    
    it('日付オブジェクトを日本形式に変換', () => {
      const date = new Date('2023-07-20T10:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2023年7月20日');
    });
    
    it('タイムスタンプを日本形式に変換', () => {
      const timestamp = 1689840000000; // 2023-07-20
      const result = formatDate(timestamp);
      expect(result).toBe('2023年7月20日');
    });
    
    it('無効な日付の場合はエラーメッセージを返す', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('無効な日付');
    });
    
    it('nullまたはundefinedの場合はエラーメッセージを返す', () => {
      expect(formatDate(null)).toBe('無効な日付');
      expect(formatDate(undefined)).toBe('無効な日付');
    });
    
    it('カスタムフォーマットを指定', () => {
      // カスタムフォーマットをサポートしている場合のテスト
      // (この機能は実装によっては存在しない可能性があります)
      if (formatDate.length > 1) {
        const result = formatDate('2023-07-20T10:00:00Z', 'yyyy/MM/dd');
        expect(result).toBe('2023/07/20');
      }
    });
  });
});
