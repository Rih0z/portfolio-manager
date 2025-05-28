/**
 * 日本取引所グループ (JPX) のCSVデータを利用した株価取得サービス
 * 無料で利用可能、20分遅延データ
 */
'use strict';

const axios = require('axios');
const { parse } = require('csv-parse/sync');
// iconvは必要な場合のみ使用
let iconv;
try {
  iconv = require('iconv-lite');
} catch (error) {
  console.warn('iconv-lite not installed, JPX CSV may have encoding issues');
}
const logger = require('../../utils/logger');
const cacheService = require('../cache');
const { DATA_TYPES } = require('../../config/constants');

/**
 * JPXの統計データCSVを取得・パース
 * @param {string} date - 日付 (YYYYMMDD形式)
 * @returns {Promise<Array>} パースされたデータ
 */
const fetchJPXDailyData = async (date) => {
  // JPXの日次統計データURL
  // 例: https://www.jpx.co.jp/markets/statistics-equities/daily/[date]/stocks_[date].csv
  const url = `https://www.jpx.co.jp/markets/statistics-equities/daily/${date}/stocks_${date}.csv`;
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-API/1.0)'
      }
    });

    // Shift-JISからUTF-8に変換（iconvが利用可能な場合）
    let utf8Data;
    if (iconv) {
      utf8Data = iconv.decode(Buffer.from(response.data), 'Shift_JIS');
    } else {
      // iconvがない場合は直接使用（文字化けの可能性あり）
      utf8Data = response.data.toString();
    }
    
    // CSVをパース
    const records = parse(utf8Data, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      delimiter: ','
    });

    return records;
  } catch (error) {
    logger.error(`Failed to fetch JPX data for ${date}:`, error.message);
    throw error;
  }
};

/**
 * 銘柄コードから特定の株価データを取得
 * @param {string} code - 銘柄コード（4桁）
 * @returns {Promise<Object>} 株価データ
 */
const getJPXStockData = async (code) => {
  const cacheKey = `${DATA_TYPES.JP_STOCK}:jpx:${code}`;
  
  // キャッシュチェック
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 今日の日付（JPXは前営業日のデータを提供）
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 土日の場合は金曜日のデータを取得
    if (yesterday.getDay() === 0) { // 日曜日
      yesterday.setDate(yesterday.getDate() - 2);
    } else if (yesterday.getDay() === 6) { // 土曜日
      yesterday.setDate(yesterday.getDate() - 1);
    }
    
    const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    
    // CSVデータを取得
    const data = await fetchJPXDailyData(dateStr);
    
    // 該当銘柄を検索
    const stockData = data.find(row => {
      return row['コード'] === code || row['Code'] === code;
    });
    
    if (!stockData) {
      throw new Error(`Stock ${code} not found in JPX data`);
    }
    
    // 統一フォーマットに変換
    const formattedData = {
      ticker: code,
      price: parseFloat(stockData['終値'] || stockData['Close']) || 0,
      change: parseFloat(stockData['前日比'] || stockData['Change']) || 0,
      changePercent: parseFloat(stockData['前日比%'] || stockData['Change%']) || 0,
      name: stockData['銘柄名'] || stockData['Name'] || code,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: 'JPX CSV Data',
      isStock: true,
      isMutualFund: false,
      volume: parseInt(stockData['出来高'] || stockData['Volume']) || 0,
      previousClose: parseFloat(stockData['前日終値'] || stockData['Previous Close']) || 0,
      dayHigh: parseFloat(stockData['高値'] || stockData['High']) || 0,
      dayLow: parseFloat(stockData['安値'] || stockData['Low']) || 0,
      open: parseFloat(stockData['始値'] || stockData['Open']) || 0
    };
    
    // キャッシュに保存（1時間）
    await cacheService.set(cacheKey, formattedData, 3600);
    
    return formattedData;
  } catch (error) {
    logger.error(`JPX data error for ${code}:`, error.message);
    throw error;
  }
};

/**
 * 複数銘柄の一括取得
 * @param {Array<string>} codes - 銘柄コードの配列
 * @returns {Promise<Object>} 銘柄データのオブジェクト
 */
const getBatchJPXData = async (codes) => {
  try {
    // 日付を計算
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (yesterday.getDay() === 0) {
      yesterday.setDate(yesterday.getDate() - 2);
    } else if (yesterday.getDay() === 6) {
      yesterday.setDate(yesterday.getDate() - 1);
    }
    
    const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 一度だけCSVを取得
    const allData = await fetchJPXDailyData(dateStr);
    
    const results = {};
    
    for (const code of codes) {
      const stockData = allData.find(row => {
        return row['コード'] === code || row['Code'] === code;
      });
      
      if (stockData) {
        results[code] = {
          ticker: code,
          price: parseFloat(stockData['終値'] || stockData['Close']) || 0,
          change: parseFloat(stockData['前日比'] || stockData['Change']) || 0,
          changePercent: parseFloat(stockData['前日比%'] || stockData['Change%']) || 0,
          name: stockData['銘柄名'] || stockData['Name'] || code,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'JPX CSV Data',
          isStock: true,
          isMutualFund: false,
          volume: parseInt(stockData['出来高'] || stockData['Volume']) || 0
        };
      } else {
        results[code] = null;
      }
    }
    
    return results;
  } catch (error) {
    logger.error('JPX batch data error:', error.message);
    throw error;
  }
};

/**
 * TOPIX指数データの取得
 * @returns {Promise<Object>} TOPIX指数データ
 */
const getTOPIXData = async () => {
  const cacheKey = 'index:topix';
  
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // JPXの指数データページから取得
    const url = 'https://www.jpx.co.jp/markets/indices/topix/index.html';
    // 実際の実装では、ページをスクレイピングまたは別のCSVから取得
    
    const data = {
      name: 'TOPIX',
      value: 0, // 実際の値を取得
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString(),
      source: 'JPX'
    };
    
    await cacheService.set(cacheKey, data, 3600);
    return data;
  } catch (error) {
    logger.error('TOPIX data error:', error.message);
    throw error;
  }
};

module.exports = {
  getJPXStockData,
  getBatchJPXData,
  getTOPIXData,
  fetchJPXDailyData
};