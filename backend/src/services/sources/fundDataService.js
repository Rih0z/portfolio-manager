/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/fundDataService.js
 * 
 * 説明: 
 * モーニングスターのCSVダウンロード機能を用いて投資信託のデータを取得するサービス。
 * APIでは取得できない情報をCSVから抽出します。
 * 一定回数以上失敗した銘柄は一定期間取得を停止します（ブラックリスト機能を活用）。
 * 
 * @author Portfolio Manager Team
 * @updated 2025-05-15
 */
'use strict';

const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { withRetry, isRetryableApiError, sleep } = require('../../utils/retry');
const alertService = require('../alerts');
const blacklist = require('../../utils/scrapingBlacklist');
const cacheService = require('../cache');
const { DATA_TYPES, CACHE_TIMES } = require('../../config/constants');
const {
  getRandomUserAgent,
  recordDataFetchFailure,
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
} = require('../../utils/dataFetchUtils');

// 環境変数からタイムアウト設定を取得
const MUTUAL_FUND_TIMEOUT = parseInt(process.env.MUTUAL_FUND_TIMEOUT || '30000', 10);
const RATE_LIMIT_DELAY = parseInt(process.env.DATA_RATE_LIMIT_DELAY || '500', 10);

/**
 * 投資信託のデータを取得する（モーニングスターCSVデータ）
 * @param {string} code - ファンドコード（7-8桁）
 * @returns {Promise<Object>} 投資信託データ
 */
const getMutualFundData = async (code) => {
  // 投資信託コードの正規化（末尾のTを取り除くが、Cは保持する）
  let fundCode = code.replace(/\.T$/i, '');
  console.log(`Preparing to get mutual fund data for ${fundCode}`);

  // キャッシュキー構築
  const cacheKey = `${DATA_TYPES.MUTUAL_FUND}:${fundCode}`;
  
  // キャッシュをチェック
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached data for ${fundCode}`);
    return cachedData;
  }

  // ブラックリストのチェックとフォールバックデータの準備
  const { isBlacklisted, fallbackData } = await checkBlacklistAndGetFallback(
    fundCode,
    'fund',
    {
      defaultPrice: 10000,
      currencyCode: 'JPY',
      name: `投資信託 ${fundCode}`,
      isStock: false,
      isMutualFund: true,
      priceLabel: '基準価額'
    }
  );

  if (isBlacklisted) {
    console.log(`Fund ${fundCode} is blacklisted. Using fallback data.`);
    
    // 短いTTLでキャッシュに保存（ブラックリスト状態が変わる可能性があるため）
    await cacheService.set(cacheKey, fallbackData, 600); // 10分
    
    return fallbackData;
  }

  try {
    // モーニングスターからCSVデータを取得
    const data = await getMorningstarCsvData(fundCode);
    
    if (data && data.price) {
      console.log(`Successfully fetched fund data from Morningstar for ${fundCode}: ${data.price}`);
      
      // 成功を記録
      await recordDataFetchSuccess(fundCode);
      
      // 完全なデータオブジェクトを構築
      const resultData = {
        ticker: fundCode,
        ...data,
        source: 'Morningstar CSV',
        isStock: false,
        isMutualFund: true
      };
      
      // データをキャッシュに保存
      await cacheService.set(cacheKey, resultData, CACHE_TIMES.MUTUAL_FUND);
      
      return resultData;
    }

    // データ取得に失敗した場合
    console.log(`Failed to get data for mutual fund ${fundCode}, using fallback data`);
    
    // 失敗を記録
    await recordDataFetchFailure(
      fundCode,
      'fund',
      'Morningstar CSV',
      new Error('Data retrieval failed'),
      { alertThreshold: 0.1 }
    );
    
    // 短いTTLでキャッシュに保存（次回すぐに再試行できるように）
    const errorFallback = {
      ...fallbackData,
      source: 'Fallback',
      isBlacklisted: false
    };
    
    await cacheService.set(cacheKey, errorFallback, 300); // 5分
    
    return errorFallback;
  } catch (error) {
    console.error(`Mutual fund data retrieval error for ${fundCode}:`, error);
    
    // 失敗を記録
    await recordDataFetchFailure(fundCode, 'fund', 'Morningstar CSV', error);
    
    throw new Error(`Mutual fund data retrieval failed for ${fundCode}: ${error.message}`);
  }
};

/**
 * モーニングスターからCSVデータを取得して解析する
 * @param {string} fundCode - ファンドコード
 * @returns {Promise<Object>} 整形済みの投資信託データ
 */
const getMorningstarCsvData = async (fundCode) => {
  console.log(`Getting CSV data from Morningstar for ${fundCode}`);
  
  try {
    // モーニングスター用のURLを構築 - fundCodeをそのまま使用
    const url = `https://www.morningstar.co.jp/FundData/DownloadStandardPriceData.do?fnc=${fundCode}`;
    
    // ランダムなユーザーエージェントを使用
    const userAgent = getRandomUserAgent();
    
    // 再試行ロジックを使用してCSVデータ取得
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/csv,application/csv',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        timeout: MUTUAL_FUND_TIMEOUT,
        responseType: 'text'
      }),
      {
        maxRetries: 3,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    // CSV解析
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      encoding: 'shift_jis'
    });
    
    if (!records || records.length === 0) {
      throw new Error('No data found in CSV');
    }
    
    // 最新の価格データを取得（通常は配列の最後の要素）
    const latestData = records[records.length - 1];
    
    // 前日のデータを取得（存在する場合）
    const previousData = records.length > 1 ? records[records.length - 2] : null;
    
    // 基準価額を取得
    const price = parseFloat(latestData['基準価額'] || latestData['NAV'] || '0');
    
    if (isNaN(price) || price === 0) {
      throw new Error('Invalid price data in CSV');
    }
    
    // 前日比を計算
    let change = 0;
    let changePercent = 0;
    
    if (previousData) {
      const previousPrice = parseFloat(previousData['基準価額'] || previousData['NAV'] || '0');
      
      if (!isNaN(previousPrice) && previousPrice > 0) {
        change = price - previousPrice;
        changePercent = (change / previousPrice) * 100;
      }
    }
    
    // ファンド名の取得（ヘッダー情報から）
    const name = fundCode; // CSVからファンド名が取得できない場合はコードを使用
    
    // 日付の取得
    const dateStr = latestData['日付'] || latestData['Date'] || new Date().toISOString().split('T')[0];
    const dateParts = dateStr.split('/');
    
    // 日本時間正午の日付を作成
    const dateObj = new Date();
    if (dateParts.length === 3) {
      dateObj.setFullYear(parseInt(dateParts[0], 10));
      dateObj.setMonth(parseInt(dateParts[1], 10) - 1);
      dateObj.setDate(parseInt(dateParts[2], 10));
    }
    dateObj.setHours(12, 0, 0, 0);
    
    return {
      price,
      change,
      changePercent,
      name: name || `投資信託 ${fundCode}`,
      currency: 'JPY',
      lastUpdated: dateObj.toISOString(),
      priceLabel: '基準価額',
      dataDate: dateStr,
      csvRecords: records.length
    };
  } catch (error) {
    console.error(`Error getting Morningstar CSV data for ${fundCode}:`, error.message);
    throw new Error(`Morningstar CSV retrieval failed: ${error.message}`);
  }
};

/**
 * 複数の投資信託のデータを並列で取得する（キャッシュとブラックリスト対応版）
 * @param {Array<string>} codes - ファンドコードの配列
 * @returns {Promise<Object>} - ファンドコードをキーとするデータのオブジェクト
 */
const getMutualFundsParallel = async (codes) => {
  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    throw new Error('Invalid fund codes array');
  }
  
  console.log(`Preparing to get data for ${codes.length} mutual funds in parallel`);
  
  // ブラックリスト確認と非ブラックリスト銘柄の抽出
  const checkedCodes = await Promise.all(
    codes.map(async (code) => {
      const isInBlacklist = await blacklist.isBlacklisted(code, 'fund');
      return { code, isBlacklisted: isInBlacklist };
    })
  );
  
  // ブラックリスト銘柄を分離
  const blacklistedCodes = checkedCodes.filter(item => item.isBlacklisted).map(item => item.code);
  const processingCodes = checkedCodes.filter(item => !item.isBlacklisted).map(item => item.code);
  
  console.log(`${blacklistedCodes.length} codes are blacklisted and will use fallback data.`);
  console.log(`Proceeding with data retrieval for ${processingCodes.length} codes.`);
  
  // 結果オブジェクト初期化
  const results = {};
  
  // ブラックリスト銘柄にはデフォルト値を設定
  for (const code of blacklistedCodes) {
    results[code] = {
      ticker: code,
      price: 10000, // フォールバック基準価額
      change: 0,
      changePercent: 0,
      name: `投資信託 ${code}`,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: 'Blacklisted Fallback',
      isStock: false,
      isMutualFund: true,
      priceLabel: '基準価額',
      isBlacklisted: true
    };
  }
  
  // 取得対象がない場合は早期リターン
  if (processingCodes.length === 0) {
    return results;
  }
  
  // キャッシュチェック
  const codeWithCacheStatus = await Promise.all(
    processingCodes.map(async (code) => {
      const cacheKey = `${DATA_TYPES.MUTUAL_FUND}:${code}`;
      const cachedData = await cacheService.get(cacheKey);
      return { 
        code, 
        hasCachedData: !!cachedData,
        cachedData
      };
    })
  );
  
  // キャッシュがある銘柄を処理
  for (const item of codeWithCacheStatus) {
    if (item.hasCachedData) {
      results[item.code] = item.cachedData;
      console.log(`Using cached data for ${item.code}`);
    }
  }
  
  // キャッシュがない銘柄を抽出
  const codesToRetrieve = codeWithCacheStatus
    .filter(item => !item.hasCachedData)
    .map(item => item.code);
  
  console.log(`Retrieving fresh data for ${codesToRetrieve.length} funds`);
  
  let errorCount = 0;
  
  // 各コードにインデックスを割り当て、遅延を計算
  const indexedCodes = codesToRetrieve.map((code, index) => ({ code, index }));
  
  // 並列処理（制御付き）
  await Promise.allSettled(
    indexedCodes.map(async ({ code, index }) => {
      try {
        // APIレート制限を回避するために各リクエストを少し遅延させる
        const delay = index * RATE_LIMIT_DELAY;
        if (delay > 0) {
          await sleep(delay);
        }
        
        // データを取得
        const fundData = await getMutualFundData(code);
        results[code] = fundData;
      } catch (error) {
        console.error(`Error getting data for fund ${code}:`, error.message);
        errorCount++;
        
        // エラーでも最低限の情報を返す
        results[code] = {
          ticker: code,
          price: null,
          change: null,
          changePercent: null,
          name: `投資信託 ${code}`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Error',
          isStock: false,
          isMutualFund: true,
          error: error.message
        };
      }
    })
  );
  
  // エラー率が高すぎる場合はアラート
  if (errorCount > codesToRetrieve.length / 3) { // 1/3以上失敗
    await alertService.notifyError(
      'High Error Rate in Mutual Fund Data Retrieval',
      new Error(`${errorCount} out of ${codesToRetrieve.length} funds failed to retrieve data`),
      { errorRate: errorCount / codesToRetrieve.length }
    );
  }
  
  return results;
};

module.exports = {
  getMutualFundData,
  getMutualFundsParallel
};
