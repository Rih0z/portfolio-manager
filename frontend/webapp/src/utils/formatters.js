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
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'N/A';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
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
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';

  const formatted = value.toFixed(fractionDigits);
  return `${formatted.endsWith('.00') ? parseInt(formatted, 10) : formatted}%`;
};

  
  /**
   * 日付をフォーマットする
   * @param {string|Date} date - フォーマットする日付
   * @returns {string} フォーマットされた日付文字列
   */
export const formatDate = (date, formatStr) => {
  if (date === null || date === undefined) return '無効な日付';

  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  if (Number.isNaN(d?.getTime())) return '無効な日付';

  if (formatStr === 'yyyy/MM/dd') {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
};

/**
 * パーセンテージをフォーマットする
 * @param {number} value - フォーマットする値（0.1 = 10%）
 * @param {number} decimals - 小数点以下の桁数
 * @returns {string} フォーマットされたパーセンテージ文字列
 */
export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value === null || value === undefined) {
    return '0.0%';
  }
  
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * 数値をカンマ区切りでフォーマットする
 * @param {number} value - フォーマットする数値
 * @param {number} decimals - 小数点以下の桁数
 * @returns {string} フォーマットされた数値文字列
 */
export const formatNumber = (value, decimals) => {
  const num = Number(value);
  if (Number.isNaN(num) || value === null || value === undefined) {
    return '0';
  }
  
  if (decimals !== undefined) {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  return num.toLocaleString('en-US');
};

/**
 * 日付をIntl.DateTimeFormatでフォーマットする
 * @param {Date|string|number} date - フォーマットする日付
 * @param {object} options - フォーマットオプション
 * @param {string} locale - ロケール
 * @returns {string} フォーマットされた日付文字列
 */
export const formatDateIntl = (date, options = {}, locale = 'ja-JP') => {
  if (!date) return 'Invalid Date';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    return d.toLocaleDateString(locale, { ...defaultOptions, ...options });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * 相対時間をフォーマットする
 * @param {Date|string|number} date - フォーマットする日付
 * @param {string} locale - ロケール
 * @returns {string} フォーマットされた相対時間文字列
 */
export const formatDateRelative = (date, locale = 'ja-JP') => {
  if (!date) return 'Invalid Date';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (Math.abs(diffMs) < 60000) { // 1分未満
      return rtf.format(-Math.round(diffMs / 1000), 'second');
    } else if (Math.abs(diffMs) < 3600000) { // 1時間未満
      return rtf.format(-Math.round(diffMs / 60000), 'minute');
    } else if (Math.abs(diffMs) < 86400000) { // 1日未満
      return rtf.format(-Math.round(diffMs / 3600000), 'hour');
    } else {
      return rtf.format(-Math.round(diffMs / 86400000), 'day');
    }
  } catch (error) {
    return 'Invalid Date';
  }
};
