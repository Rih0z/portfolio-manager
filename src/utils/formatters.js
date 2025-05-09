/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/formatters.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-10 10:30:15 
 * 
 * 更新履歴: 
 * - 2025-03-10 10:30:15 Koki Riho 初回作成
 * - 2025-03-25 14:40:20 Koki Riho パーセント表示の小数点桁数を調整
 * 
 * 説明: 
 * 数値や日付のフォーマット関数を提供するユーティリティ。
 * 通貨表示、パーセント表示、日付表示のフォーマット機能を実装。
 */

/**
 * 数値を通貨形式にフォーマットする
 * @param {number} amount - フォーマットする金額
 * @param {string} currency - 通貨コード（'JPY'または'USD'）
 * @returns {string} フォーマットされた通貨文字列
 */
export const formatCurrency = (amount, currency = 'JPY') => {
    if (typeof amount !== 'number') return '-';
    
    const formatter = new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    });
    
    return formatter.format(amount);
  };
  
  /**
   * 数値をパーセント形式にフォーマットする
   * @param {number} value - フォーマットする値
   * @param {number} fractionDigits - 小数点以下の桁数
   * @returns {string} フォーマットされたパーセント文字列
   */
  export const formatPercent = (value, fractionDigits = 2) => {
    if (typeof value !== 'number') return '-';
    
    return `${value.toFixed(fractionDigits)}%`;
  };
  
  /**
   * 日付をフォーマットする
   * @param {string|Date} date - フォーマットする日付
   * @returns {string} フォーマットされた日付文字列
   */
  export const formatDate = (date) => {
    if (!date) return '-';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
