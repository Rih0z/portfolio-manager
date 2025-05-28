// PortfolioContext.js のファイルヘッダー
/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/context/PortfolioContext.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 10:00:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオ管理のためのReact Contextを提供するコンポーネント。
 * 保有資産、目標配分、市場データの取得、シミュレーション計算、
 * ローカルストレージとGoogleドライブの同期機能などを提供します。
 * マルチ通貨対応、AIプロンプト生成機能も含まれています。
 */
import React, { createContext, useState, useCallback, useEffect } from 'react';
import { 
  fetchTickerData, 
  fetchExchangeRate, 
  fetchFundInfo,
  fetchDividendData,
  loadFromGoogleDrive as apiLoadFromGoogleDrive,
  saveToGoogleDrive as apiSaveToGoogleDrive,
  initGoogleDriveAPI
} from '../services/api';
import { fetchMultipleStocks } from '../services/marketDataService';
import { 
  FUND_TYPES, 
  guessFundType, 
  estimateAnnualFee, 
  estimateDividendYield,
  US_ETF_LIST, 
  TICKER_SPECIFIC_FEES, 
  TICKER_SPECIFIC_DIVIDENDS 
} from '../utils/fundUtils';
import { requestManager, debouncedRefreshMarketData, requestDeduplicator } from '../utils/requestThrottle';
import { shouldUpdateExchangeRate } from '../utils/exchangeRateDebounce';

// 改善された暗号化関数
const encryptData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // エンコード前にURIエンコードを適用して特殊文字を処理
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.error('データの暗号化に失敗しました', error);
    return null;
  }
};

// 改善された復号化関数
const decryptData = (encryptedData) => {
  try {
    // Base64デコード後にURIデコードを適用
    const jsonString = decodeURIComponent(atob(encryptedData));
    const data = JSON.parse(jsonString);
    
    // 基本的なデータ構造の検証
    if (!data || typeof data !== 'object') {
      throw new Error('無効なデータ形式です');
    }
    
    return data;
  } catch (error) {
    console.error('データの復号化に失敗しました', error.message);
    // 可能であれば古いフォーマットを試行
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch (fallbackError) {
      console.error('フォールバック復号化も失敗しました', fallbackError);
      return null;
    }
  }
};

// コンテキストの作成
export const PortfolioContext = createContext();

// プロバイダーコンポーネント - 明示的にエクスポート
export const PortfolioProvider = ({ children }) => {
  // 初期化完了フラグ
  const [initialized, setInitialized] = useState(false);
  
  // 状態管理
  const [baseCurrency, setBaseCurrency] = useState('JPY');
  const [exchangeRate, setExchangeRate] = useState({
    rate: 150.0,
    source: 'Default',
    lastUpdated: new Date().toISOString()
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [targetPortfolio, setTargetPortfolio] = useState([]);
  // aiPromptTemplate状態を追加
  const [aiPromptTemplate, setAiPromptTemplate] = useState(null);
  // additionalBudgetをオブジェクトに変更（金額と通貨を持つ）
  const [additionalBudget, setAdditionalBudget] = useState({
    amount: 300000,
    currency: 'JPY'
  });
  const [notifications, setNotifications] = useState([]);
  
  // データソース管理のための状態
  const [dataSource, setDataSource] = useState('local');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 通知を追加する関数（タイムアウト付き）
  const addNotification = useCallback((message, type = 'info') => {
    // より一意性の高いIDを生成（タイムスタンプ + ランダム値）
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications(prev => [...prev, { id, message, type }]);
  
    // 情報・成功・警告通知は自動消去（5秒後）
    if (type !== 'error') {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  
    return id;
  }, []);

  // 通知を削除する関数
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // AI分析プロンプトテンプレート更新関数
  const updateAiPromptTemplate = useCallback((template) => {
    setAiPromptTemplate(template);
    
    // 設定後に自動保存
    setTimeout(() => saveToLocalStorage(), 100);
  }, []);

  // ローカルストレージにデータを保存
  const saveToLocalStorage = useCallback(() => {
    if (!initialized) return false; // 初期化前は保存しない
    
    try {
      const portfolioData = {
        baseCurrency,
        exchangeRate,
        lastUpdated,
        currentAssets,
        targetPortfolio,
        additionalBudget,
        aiPromptTemplate, // 追加
        version: '1.0.0', // データバージョン管理
        timestamp: new Date().toISOString()
      };
      
      // データの暗号化
      const encryptedData = encryptData(portfolioData);
      if (!encryptedData) {
        throw new Error('データの暗号化に失敗しました');
      }
      
      // ローカルストレージに保存
      localStorage.setItem('portfolioData', encryptedData);
      console.log('ローカルストレージにデータを保存しました', portfolioData);
      
      return true;
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗しました', error);
      addNotification('データの保存に失敗しました', 'error');
      return false;
    }
  }, [initialized, baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate, addNotification]);

  // ローカルストレージからデータを読み込み（改善版）
  const loadFromLocalStorage = useCallback(() => {
    try {
      console.log('ローカルストレージからのデータ読み込みを試行...');
      const encryptedData = localStorage.getItem('portfolioData');
      
      if (!encryptedData) {
        console.log('ローカルストレージにデータがありません');
        return null;
      }
      
      console.log('暗号化されたデータを取得しました');
      const decryptedData = decryptData(encryptedData);
      
      if (!decryptedData) {
        console.log('データの復号化に失敗しました');
        return null;
      }
      
      // 基本的なデータ構造の検証
      const requiredFields = ['baseCurrency', 'currentAssets', 'targetPortfolio'];
      const missingFields = requiredFields.filter(field => !(field in decryptedData));
      
      if (missingFields.length > 0) {
        console.warn(`復号化されたデータに必須フィールドがありません: ${missingFields.join(', ')}`);
        return null;
      }
      
      console.log('ローカルストレージからデータを正常に読み込みました', decryptedData);
      return decryptedData;
    } catch (error) {
      console.error('ローカルストレージからの読み込みに失敗しました', error);
      return null;
    }
  }, []);

  // ローカルストレージをクリア（修復のため）
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem('portfolioData');
      addNotification('ローカルストレージをクリアしました', 'info');
      return true;
    } catch (error) {
      console.error('ローカルストレージのクリアに失敗しました', error);
      return false;
    }
  }, [addNotification]);

  // 通貨切替
  const toggleCurrency = useCallback(() => {
    setBaseCurrency(prev => {
      const newCurrency = prev === 'JPY' ? 'USD' : 'JPY';
      // 通貨切替後、自動保存
      setTimeout(() => saveToLocalStorage(), 0);
      return newCurrency;
    });
  }, [saveToLocalStorage]);

  // 保有銘柄のタイプを検証して修正する関数（新規追加）
  const validateAssetTypes = useCallback((assets) => {
    if (!Array.isArray(assets) || assets.length === 0) {
      return { updatedAssets: [], changes: { fundType: 0, fees: 0, dividends: 0 } };
    }

    console.log('保有銘柄の情報を検証しています...');
    let fundTypeChanges = 0;
    let feeChanges = 0;
    let dividendChanges = 0;
    const fundTypeChangeDetails = [];
    const feeChangeDetails = [];

    // 全銘柄を検証
    const validatedAssets = assets.map(asset => {
      if (!asset.ticker) return asset;
      
      const ticker = asset.ticker.toUpperCase();
      const name = asset.name || '';

      // 特別なケース：VXUSや他の米国ETFが個別株として誤って登録されていないか確認
      const isInETFList = US_ETF_LIST.includes(ticker);
      
      // 正しい銘柄タイプを取得
      const correctFundType = guessFundType(ticker, name);
      const correctIsStock = correctFundType === FUND_TYPES.STOCK;
      
      // 銘柄タイプに誤りがあるか確認
      const fundTypeIsWrong = asset.fundType !== correctFundType || asset.isStock !== correctIsStock;
      
      // 手数料情報を取得
      let correctFee;
      let feeSource;
      let feeIsEstimated;
      
      if (correctIsStock) {
        // 個別株は常に手数料0%
        correctFee = 0;
        feeSource = '個別株';
        feeIsEstimated = false;
      } else if (TICKER_SPECIFIC_FEES[ticker]) {
        // 特定銘柄リストにある場合
        correctFee = TICKER_SPECIFIC_FEES[ticker];
        feeSource = 'ティッカー固有の情報';
        feeIsEstimated = false;
      } else {
        // タイプから推定
        const feeInfo = estimateAnnualFee(ticker, name);
        correctFee = feeInfo.fee;
        feeSource = feeInfo.source;
        feeIsEstimated = feeInfo.isEstimated;
      }
      
      // 手数料に誤りがあるか確認
      const feeIsWrong = 
        Math.abs(asset.annualFee - correctFee) > 0.001 || // 手数料率が異なる
        asset.feeSource !== feeSource || // 情報源が異なる
        asset.feeIsEstimated !== feeIsEstimated; // 推定状態が異なる
      
      // 配当情報を取得
      const dividendInfo = estimateDividendYield(ticker, name);
      const correctDividendYield = dividendInfo.yield;
      const correctHasDividend = dividendInfo.hasDividend;
      const correctDividendFrequency = dividendInfo.dividendFrequency;
      const correctDividendIsEstimated = dividendInfo.isEstimated;
      
      // 配当情報に誤りがあるか確認
      const dividendIsWrong = 
        Math.abs(asset.dividendYield - correctDividendYield) > 0.001 || // 配当利回りが異なる
        asset.hasDividend !== correctHasDividend || // 配当の有無が異なる
        asset.dividendFrequency !== correctDividendFrequency || // 配当頻度が異なる
        asset.dividendIsEstimated !== correctDividendIsEstimated; // 推定状態が異なる
      
      // 変更があれば統計とログを更新
      if (fundTypeIsWrong) {
        fundTypeChanges++;
        fundTypeChangeDetails.push({
          ticker: ticker,
          name: asset.name,
          oldType: asset.fundType,
          newType: correctFundType
        });
        console.log(`銘柄 ${ticker} (${asset.name}) のタイプを修正: ${asset.fundType} -> ${correctFundType}`);
      }
      
      if (feeIsWrong) {
        feeChanges++;
        feeChangeDetails.push({
          ticker: ticker,
          name: asset.name,
          oldFee: asset.annualFee,
          newFee: correctFee
        });
        console.log(`銘柄 ${ticker} (${asset.name}) の手数料率を修正: ${asset.annualFee}% -> ${correctFee}%`);
      }
      
      if (dividendIsWrong) {
        dividendChanges++;
        console.log(`銘柄 ${ticker} (${asset.name}) の配当情報を修正: 利回り ${asset.dividendYield}% -> ${correctDividendYield}%, 配当${asset.hasDividend ? 'あり' : 'なし'} -> ${correctHasDividend ? 'あり' : 'なし'}`);
      }
      
      // 修正した情報で銘柄を更新
      if (fundTypeIsWrong || feeIsWrong || dividendIsWrong) {
        return {
          ...asset,
          fundType: correctFundType,
          isStock: correctIsStock,
          annualFee: correctFee,
          feeSource: feeSource,
          feeIsEstimated: feeIsEstimated,
          dividendYield: correctDividendYield,
          hasDividend: correctHasDividend,
          dividendFrequency: correctDividendFrequency,
          dividendIsEstimated: correctDividendIsEstimated,
        };
      }
      
      // 変更がなければそのまま返す
      return asset;
    });

    // 変更の統計
    const changes = {
      fundType: fundTypeChanges,
      fees: feeChanges,
      dividends: dividendChanges,
      fundTypeDetails: fundTypeChangeDetails,
      feeDetails: feeChangeDetails
    };

    return { updatedAssets: validatedAssets, changes };
  }, []);

  // 市場データの更新（レート制限付き）
  const refreshMarketPricesInternal = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Refreshing market prices for all assets...');
      
      let feeChangesCount = 0;
      const feeChangeDetails = [];
      let dividendChangesCount = 0;
      let fundTypeChangesCount = 0; // 銘柄タイプの変更カウンター
      const fundTypeChangeDetails = []; // 銘柄タイプの変更詳細
      
      // エラーの統計
      let errorCount = 0;
      let rateLimit = false;
      const errorDetails = [];
      let fallbackCount = 0;
      const fallbackDetails = [];
      
      // Yahoo Financeの利用統計
      let yahooFinanceTriedCount = 0;
      let yahooFinanceSuccessCount = 0;
      const yahooFinanceDetails = [];
      
      // 全銘柄のティッカーを取得
      const tickers = currentAssets.map(asset => asset.ticker);
      console.log(`Fetching batch data for ${tickers.length} tickers:`, tickers);
      
      // 一括でデータを取得
      const batchData = await fetchMultipleStocks(tickers);
      console.log('Batch data response:', batchData);
      
      const updatedAssets = await Promise.all(
        currentAssets.map(async (asset) => {
          try {
            // バッチデータから該当する銘柄のデータを取得
            const stockData = batchData.data?.[asset.ticker];
            
            if (!stockData) {
              console.error(`No data found for ${asset.ticker} in batch response`);
              errorCount++;
              errorDetails.push({
                ticker: asset.ticker,
                name: asset.name,
                message: 'バッチレスポンスにデータが含まれていません',
                errorType: 'NO_DATA'
              });
              return asset; // 既存のデータを維持
            }
            
            // 成功したデータの処理
            const updatedData = {
              success: true,
              data: stockData
            };
            
            console.log(`Updated data for ${asset.ticker}:`, updatedData);
            
            // ソースごとの統計を記録
            if (stockData.source === 'Yahoo Finance') {
              yahooFinanceSuccessCount++;
              yahooFinanceDetails.push({
                ticker: asset.ticker,
                name: asset.name || asset.ticker,
                success: true
              });
            } else if (stockData.source === 'Fallback') {
              fallbackCount++;
              fallbackDetails.push({
                ticker: asset.ticker,
                name: asset.name || asset.ticker,
                price: stockData.price
              });
            }
            
            // 銘柄タイプの変更を確認
            const newFundType = updatedData.data.fundType || asset.fundType;
            const hasFundTypeChanged = asset.fundType !== newFundType;
            
            // 銘柄タイプ変更の記録
            if (hasFundTypeChanged) {
              fundTypeChangesCount++;
              fundTypeChangeDetails.push({
                ticker: asset.ticker,
                name: asset.name,
                oldType: asset.fundType,
                newType: newFundType
              });
            }
            
            // 新しい銘柄タイプに基づいて個別株かどうかを判定
            const isStock = newFundType === FUND_TYPES.STOCK;
            
            // 手数料情報の変更を確認（個別株でなく、かつ手数料が変わった場合）
            const newFee = isStock ? 0 : updatedData.data.annualFee;
            const hasFeeChanged = asset.annualFee !== newFee;
            
            // 手数料変更を記録
            if (hasFeeChanged) {
              feeChangesCount++;
              feeChangeDetails.push({
                ticker: asset.ticker,
                name: asset.name,
                oldFee: asset.annualFee,
                newFee: newFee
              });
            }
            
            // 配当情報はバッチデータから取得（利用可能な場合）
            const dividendData = {
              data: {
                dividendYield: stockData.dividendYield || asset.dividendYield || 0,
                hasDividend: stockData.hasDividend !== undefined ? stockData.hasDividend : asset.hasDividend,
                dividendFrequency: stockData.dividendFrequency || asset.dividendFrequency || 'Annual',
                dividendIsEstimated: stockData.dividendIsEstimated || false
              }
            };
            
            // 配当情報の変更を確認
            const hasDividendChanged = 
              asset.dividendYield !== dividendData.data.dividendYield ||
              asset.hasDividend !== dividendData.data.hasDividend;
            
            if (hasDividendChanged) {
              dividendChangesCount++;
            }
            
            // 更新されたアセット情報を返す
            return {
              ...asset,
              price: updatedData.data.price,
              source: updatedData.data.source,
              lastUpdated: updatedData.data.lastUpdated,
              // 銘柄タイプを更新
              fundType: newFundType,
              isStock: isStock,
              // 手数料情報を更新（個別株は常に0%）
              annualFee: isStock ? 0 : newFee,
              feeSource: isStock ? '個別株' : updatedData.data.feeSource,
              feeIsEstimated: isStock ? false : updatedData.data.feeIsEstimated,
              region: updatedData.data.region || asset.region,
              // 配当情報を更新
              dividendYield: dividendData.data.dividendYield,
              hasDividend: dividendData.data.hasDividend,
              dividendFrequency: dividendData.data.dividendFrequency,
              dividendIsEstimated: dividendData.data.dividendIsEstimated
            };
          } catch (error) {
            console.error(`銘柄 ${asset.ticker} の更新に失敗しました`, error);
            errorCount++;
            errorDetails.push({
              ticker: asset.ticker,
              name: asset.name,
              message: `内部エラー: ${error.message}`,
              errorType: 'INTERNAL'
            });
            return asset; // エラーの場合は既存のデータを維持
          }
        })
      );

      // 更新したデータをさらに検証（VXUSなど特殊ケースの対応）
      const { updatedAssets: validatedAssets, changes } = validateAssetTypes(updatedAssets);
      
      // 追加の変更があれば統計に加算
      fundTypeChangesCount += changes.fundType;
      feeChangesCount += changes.fees;
      dividendChangesCount += changes.dividends;
      
      // 変更があった銘柄の詳細も追加
      if (changes.fundTypeDetails && changes.fundTypeDetails.length > 0) {
        fundTypeChangeDetails.push(...changes.fundTypeDetails);
      }
      if (changes.feeDetails && changes.feeDetails.length > 0) {
        feeChangeDetails.push(...changes.feeDetails);
      }

      setCurrentAssets(validatedAssets);
      setLastUpdated(new Date().toISOString());
      
      // データソースの統計を計算
      const sourceCounts = validatedAssets.reduce((acc, asset) => {
        acc[asset.source] = (acc[asset.source] || 0) + 1;
        return acc;
      }, {});
      
      // 通知メッセージを作成
      let message = '市場データを更新しました';
      if (sourceCounts['Alpha Vantage']) {
        message += ` (Alpha Vantage: ${sourceCounts['Alpha Vantage']}件`;
      }
      if (sourceCounts['Yahoo Finance']) {
        message += `, Yahoo Finance: ${sourceCounts['Yahoo Finance']}件`;
      }
      if (sourceCounts['Fallback']) {
        message += `, フォールバック: ${sourceCounts['Fallback']}件`;
      }
      message += ')';
      
      // Yahoo Financeの利用状況に関する通知
      if (yahooFinanceTriedCount > 0) {
        const yahooMessage = `Alpha Vantageでの取得に失敗した${yahooFinanceTriedCount}銘柄について、Yahoo Financeを使用しました（成功: ${yahooFinanceSuccessCount}件）`;
        addNotification(yahooMessage, 'info');
      }
      
      // エラーがあった場合は通知
      if (errorCount > 0) {
        const errorMessage = rateLimit 
          ? `APIリクエスト制限のため、${errorCount}銘柄のデータが正しく更新できませんでした` 
          : `${errorCount}銘柄のデータ更新でエラーが発生しました`;
        
        addNotification(errorMessage, 'error');
        
        // 最大3件までエラー詳細を表示
        errorDetails.slice(0, 3).forEach(error => {
          addNotification(
            `「${error.name || error.ticker}」: ${error.message}`,
            'warning'
          );
        });
      }
      
      // フォールバックデータを使用している場合は通知
      if (fallbackCount > 0) {
        addNotification(
          `${fallbackCount}銘柄の株価情報は最新データを取得できず、前回保存した価格データを使用しています。実際の市場価格と異なる可能性があります。`,
          'warning'
        );
        
        // 最大3件までフォールバック詳細を表示
        fallbackDetails.slice(0, 3).forEach(detail => {
          addNotification(
            `「${detail.name}」(${detail.ticker}): 表示価格 ${detail.price}は最新の市場データではなく、最後に取得できた価格です。投資判断には注意してください。`,
            'info'
          );
        });
      }
      
      addNotification(message, 'success');
      
      // 銘柄タイプの変更があった場合は通知
      if (fundTypeChangesCount > 0) {
        let typeMessage = `${fundTypeChangesCount}件の銘柄でタイプ情報が更新されました`;
        addNotification(typeMessage, 'info');
        
        // 詳細な変更内容も表示（最大3件まで）
        fundTypeChangeDetails.slice(0, 3).forEach(detail => {
          addNotification(
            `「${detail.name || detail.ticker}」のタイプが「${detail.oldType}」から「${detail.newType}」に変更されました`,
            'info'
          );
        });
      }
      
      // 手数料変更があった場合は別途通知
      if (feeChangesCount > 0) {
        let feeMessage = `${feeChangesCount}件のファンドで手数料情報が更新されました`;
        addNotification(feeMessage, 'info');
        
        // 詳細な変更内容も表示（最大3件まで）
        feeChangeDetails.slice(0, 3).forEach(detail => {
          const oldFeeStr = detail.oldFee != null ? detail.oldFee.toFixed(2) : '不明';
          const newFeeStr = detail.newFee != null ? detail.newFee.toFixed(2) : '不明';
          addNotification(
            `「${detail.name || detail.ticker}」の手数料が${oldFeeStr}%から${newFeeStr}%に変更されました`,
            'info'
          );
        });
      }
      
      // 配当情報の変更があった場合の通知
      if (dividendChangesCount > 0) {
        addNotification(`${dividendChangesCount}件の銘柄で配当情報が更新されました`, 'info');
      }
      
      // データを自動保存
      saveToLocalStorage();
      
      return { success: true, message };
    } catch (error) {
      console.error('市場データの更新に失敗しました', error);
      addNotification(`市場データの更新に失敗しました: ${error.message}`, 'error');
      return { success: false, message: '市場データの更新に失敗しました' };
    } finally {
      setIsLoading(false);
    }
  }, [currentAssets, addNotification, saveToLocalStorage, validateAssetTypes]);
  
  // デバウンスされたマーケットデータ更新関数
  const refreshMarketPrices = useCallback(async () => {
    return debouncedRefreshMarketData(refreshMarketPricesInternal);
  }, [refreshMarketPricesInternal]);

  // 銘柄追加（銘柄タイプ、手数料、配当情報の設定を含む）
  const addTicker = useCallback(async (ticker) => {
    try {
      // 既に存在するか確認
      const exists = [...targetPortfolio, ...currentAssets].some(
        item => item.ticker?.toLowerCase() === ticker.toLowerCase()
      );

      if (exists) {
        addNotification('既に追加されている銘柄です', 'warning');
        return { success: false, message: '既に追加されている銘柄です' };
      }

      setIsLoading(true);

      // Alpha Vantageから銘柄データ取得（レート制限付き）
      const tickerResult = await requestManager.request(
        'alphaVantage',
        () => fetchTickerData(ticker),
        { priority: 1 }
      );
      console.log('Fetched ticker data:', tickerResult);
      
      // APIエラーの処理
      if (!tickerResult.success) {
        // エラータイプに応じたメッセージを表示
        if (tickerResult.errorType === 'RATE_LIMIT') {
          addNotification('APIリクエスト制限に達しました。しばらく待ってから再試行してください。', 'error');
        } else {
          addNotification(`銘柄「${ticker}」の情報取得でエラーが発生しました: ${tickerResult.message}`, 'warning');
        }
        
        // フォールバックデータがある場合は続行、ない場合は中断
        if (!tickerResult.data) {
          addNotification(`銘柄「${ticker}」を追加できませんでした`, 'error');
          return { success: false, message: '銘柄の追加に失敗しました' };
        }
        
        // フォールバックデータを使用する旨を明確に通知
        addNotification(`銘柄「${ticker}」は最新の株価情報を取得できませんでした。保存済みのバックアップデータを使用して追加します。表示価格は実際の市場価格と異なる可能性があります。`, 'warning');
      }
      
      // 成功したけどフォールバックデータを使用している場合
      if (tickerResult.data && tickerResult.data.source === 'Fallback') {
        addNotification(`銘柄「${ticker}」の株価情報 (${tickerResult.data.price}) は最新の市場価格ではなく、バックアップデータから取得した推定値です。投資判断には注意してください。`, 'warning');
      }
      
      // 銘柄データ
      const tickerData = tickerResult.data;

      // ファンド情報を取得（手数料率など）
      const fundInfoResult = await requestManager.request(
        'default',
        () => fetchFundInfo(ticker, tickerData.name)
      );
      console.log('Fetched fund info:', fundInfoResult);
      
      // 配当情報を取得
      const dividendResult = await requestManager.request(
        'default',
        () => fetchDividendData(ticker)
      );
      console.log('Fetched dividend info:', dividendResult);

      // 銘柄タイプを確認してisStockフラグを設定
      // 特別な処理: VXUSなどのETFリストで明示的に指定されている銘柄の確認
      let fundType;
      const upperTicker = ticker.toUpperCase();
      
      if (US_ETF_LIST.includes(upperTicker)) {
        // 明示的にリストにある場合はETF_USとして扱う
        fundType = FUND_TYPES.ETF_US;
      } else {
        fundType = tickerData.fundType || fundInfoResult.fundType || 'unknown';
      }
      
      const isStock = fundType === FUND_TYPES.STOCK;
      
      // 自動取得した情報のメッセージを作成
      let infoMessage = '';
      if (fundInfoResult.success) {
        // 個別株かどうかでメッセージを変える
        if (isStock) {
          infoMessage = `${fundType || '個別株'} として判定しました（手数料は固定で0%）`;
        } else {
          infoMessage = `${fundType} ファンドとして判定し、年間手数料率${isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0)}%を${fundInfoResult.feeIsEstimated ? '推定' : '設定'}しました`;
        }
        
        // 配当情報があれば追加
        if (dividendResult.data.hasDividend) {
          infoMessage += `、配当利回り${dividendResult.data.dividendYield.toFixed(2)}%${dividendResult.data.dividendIsEstimated ? '（推定）' : ''}`;
        }
      }

      // 目標配分に追加
      setTargetPortfolio(prev => {
        const newItems = [...prev, {
          id: tickerData.id,
          name: tickerData.name,
          ticker: tickerData.ticker,
          targetPercentage: 0
        }];
        return newItems;
      });

      // 保有資産に追加（ファンド情報を含む）
      setCurrentAssets(prev => {
        const newItems = [...prev, {
          ...tickerData,
          // 保有数量は0から始める
          holdings: 0,
          // 銘柄タイプを設定
          fundType: fundType,
          isStock: isStock,
          // 手数料情報（個別株は常に0%）
          annualFee: isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0),
          feeSource: isStock ? '個別株' : (tickerData.feeSource || fundInfoResult.feeSource || 'Estimated'),
          feeIsEstimated: isStock ? false : (tickerData.feeIsEstimated || fundInfoResult.feeIsEstimated || true),
          region: tickerData.region || fundInfoResult.region || 'unknown',
          // 配当情報
          dividendYield: dividendResult.data.dividendYield,
          hasDividend: dividendResult.data.hasDividend,
          dividendFrequency: dividendResult.data.dividendFrequency,
          dividendIsEstimated: dividendResult.data.dividendIsEstimated
        }];
        return newItems;
      });

      // 手数料・配当情報の通知を追加
      if (infoMessage) {
        addNotification(infoMessage, 'info');
      }
      
      // データソースの通知（フォールバック値の場合）
      if (tickerData.source === 'Fallback') {
        addNotification(`「${ticker}」のデータはバックアップ値を使用しています。最新の価格情報ではないため、正確な市場価格を反映していない可能性があります。実際の取引前に最新価格を確認してください。`, 'warning');
      }
      
      // 追加成功の通知
      addNotification(`銘柄「${tickerData.name || ticker}」を追加しました`, 'success');
      
      // データを自動保存
      setTimeout(() => saveToLocalStorage(), 100);

      return { success: true, message: '銘柄を追加しました' };
    } catch (error) {
      console.error('銘柄の追加に失敗しました', error);
      addNotification(`銘柄「${ticker}」の追加に失敗しました: ${error.message}`, 'error');
      return { success: false, message: '銘柄の追加に失敗しました' };
    } finally {
      setIsLoading(false);
    }
  }, [targetPortfolio, currentAssets, addNotification, saveToLocalStorage]);

  // 目標配分更新
  const updateTargetAllocation = useCallback((id, percentage) => {
    setTargetPortfolio(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, targetPercentage: parseFloat(percentage) } : item
      );
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);

  // 保有数量更新（小数点以下4桁まで対応）
  const updateHoldings = useCallback((id, holdings) => {
    setCurrentAssets(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, holdings: parseFloat(parseFloat(holdings).toFixed(4)) || 0 } : item
      );
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);

  // 手数料率の更新（手数料情報が不正確な場合にユーザーが修正可能に）
  const updateAnnualFee = useCallback((id, fee) => {
    setCurrentAssets(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          // 個別株の場合は手数料を0に固定（変更不可）
          if (item.isStock || item.fundType === FUND_TYPES.STOCK) {
            return {
              ...item,
              annualFee: 0,
              feeSource: '個別株',
              feeIsEstimated: false
            };
          } else {
            // その他のファンドの場合はユーザー指定の値を使用
            return {
              ...item,
              annualFee: parseFloat(parseFloat(fee).toFixed(2)) || 0,
              feeSource: 'ユーザー設定',
              feeIsEstimated: false
            };
          }
        }
        return item;
      });
      
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);
  
  // 配当情報の更新
  const updateDividendInfo = useCallback((id, dividendYield, hasDividend = true, frequency = 'quarterly') => {
    setCurrentAssets(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            dividendYield: parseFloat(parseFloat(dividendYield).toFixed(2)) || 0,
            hasDividend: hasDividend,
            dividendFrequency: frequency,
            dividendIsEstimated: false
          };
        }
        return item;
      });
      
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);

  // 銘柄削除
  const removeTicker = useCallback((id) => {
    setTargetPortfolio(prev => prev.filter(item => item.id !== id));
    setCurrentAssets(prev => {
      const updated = prev.filter(item => item.id !== id);
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);

  // 通貨変換関数（新規追加）
  const convertCurrency = useCallback((amount, fromCurrency, toCurrency, exchangeRate) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // 円→ドル
    if (fromCurrency === 'JPY' && toCurrency === 'USD') {
      return amount / exchangeRate.rate;
    }
    
    // ドル→円
    if (fromCurrency === 'USD' && toCurrency === 'JPY') {
      return amount * exchangeRate.rate;
    }
    
    throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
  }, []);

  // 購入株数の計算（新規追加）
  const calculatePurchaseShares = useCallback((purchaseAmount, price) => {
    if (price <= 0 || purchaseAmount <= 0) {
      return 0;
    }
    return Math.floor((purchaseAmount / price) * 100) / 100;
  }, []);

  // シミュレーション計算（マルチ通貨対応版）
  const calculateSimulation = useCallback(() => {
    // 総資産額計算
    const totalCurrentAssets = currentAssets.reduce((sum, asset) => {
      let assetValue = asset.price * asset.holdings;
      
      // 通貨換算（資産の通貨が基準通貨と異なる場合）
      if (asset.currency !== baseCurrency) {
        if (baseCurrency === 'JPY' && asset.currency === 'USD') {
          assetValue *= exchangeRate.rate;
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
          assetValue /= exchangeRate.rate;
        }
      }
      
      return sum + assetValue;
    }, 0);
    
    // 予算通貨の取得
    const budgetCurrency = additionalBudget.currency;
    const budgetAmount = additionalBudget.amount;
    
    // 予算を基準通貨に変換
    let budgetInBaseCurrency = budgetAmount;
    if (budgetCurrency !== baseCurrency) {
      budgetInBaseCurrency = convertCurrency(budgetAmount, budgetCurrency, baseCurrency, exchangeRate);
    }
    
    const totalWithBudget = totalCurrentAssets + budgetInBaseCurrency;
    
    // 各銘柄ごとの計算
    const results = targetPortfolio.map(target => {
      // 現在の資産から対応する銘柄を検索
      const asset = currentAssets.find(asset => asset.ticker === target.ticker);
      if (!asset) return null; // 見つからない場合はnullを返す
      
      // 現在評価額計算
      let currentValue = asset.price * asset.holdings;
      
      // 通貨換算（基準通貨に合わせる）
      if (asset.currency !== baseCurrency) {
        currentValue = convertCurrency(currentValue, asset.currency, baseCurrency, exchangeRate);
      }
      
      // 目標額
      const targetAllocation = target.targetPercentage || 0;
      const currentAllocation = (currentValue / totalCurrentAssets) * 100 || 0;
      const diff = targetAllocation - currentAllocation;
      
      // 配分差分が正の場合（増やす必要がある場合）のみ購入
      if (diff > 0) {
        // 理想的な購入額を計算（基準通貨建て）
        const idealPurchaseInBaseCurrency = (diff / 100) * totalWithBudget;
        
        // 銘柄の通貨に変換した購入額
        let purchaseAmount = idealPurchaseInBaseCurrency;
        if (baseCurrency !== asset.currency) {
          purchaseAmount = convertCurrency(idealPurchaseInBaseCurrency, baseCurrency, asset.currency, exchangeRate);
        }
        
        // 予算通貨から銘柄通貨への変換（表示用）
        let purchaseAmountFromBudget = budgetAmount;
        if (budgetCurrency !== asset.currency) {
          purchaseAmountFromBudget = convertCurrency(budgetAmount, budgetCurrency, asset.currency, exchangeRate);
        }
        
        // 購入可能株数を計算
        const purchaseShares = calculatePurchaseShares(purchaseAmount, asset.price);
        
        return {
          id: asset.id,
          ticker: asset.ticker,
          name: asset.name,
          currentAllocation,
          targetAllocation,
          diff,
          currentValue,
          purchaseAmount,
          price: asset.price,
          purchaseShares,
          currency: asset.currency,
          isMutualFund: asset.isMutualFund,
          source: asset.source
        };
      }
      return null;
    }).filter(Boolean); // nullをフィルタリング
    
    // 購入金額が大きい順にソート
    return results.sort((a, b) => {
      // まず通貨を基準通貨に変換して比較
      const aAmountInBaseCurrency = a.currency !== baseCurrency
        ? convertCurrency(a.purchaseAmount, a.currency, baseCurrency, exchangeRate)
        : a.purchaseAmount;
        
      const bAmountInBaseCurrency = b.currency !== baseCurrency
        ? convertCurrency(b.purchaseAmount, b.currency, baseCurrency, exchangeRate)
        : b.purchaseAmount;
        
      return bAmountInBaseCurrency - aAmountInBaseCurrency;
    });
  }, [currentAssets, targetPortfolio, additionalBudget, baseCurrency, exchangeRate, convertCurrency, calculatePurchaseShares]);

  // 購入処理（小数点以下4桁まで対応）
  const executePurchase = useCallback((tickerId, units) => {
    setCurrentAssets(prev => {
      const updated = prev.map(asset => 
        asset.id === tickerId 
          ? { ...asset, holdings: parseFloat((asset.holdings + parseFloat(units)).toFixed(4)) } 
          : asset
      );
      // 変更後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      return updated;
    });
  }, [saveToLocalStorage]);

  // 一括購入処理
  const executeBatchPurchase = useCallback((simulationResult) => {
    simulationResult.forEach(result => {
      if (result.purchaseShares > 0) {
        executePurchase(result.id, result.purchaseShares);
      }
    });
    // 一括購入後に自動保存
    saveToLocalStorage();
  }, [executePurchase, saveToLocalStorage]);

  // データのインポート（手数料情報と配当情報の整合性を確保）
  const importData = useCallback((data) => {
    if (!data) return { success: false, message: 'データが無効です' };
    
    try {
      // 基本的なデータ構造の検証
      const requiredFields = ['baseCurrency', 'currentAssets', 'targetPortfolio'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length > 0) {
        throw new Error(`必須フィールドがありません: ${missingFields.join(', ')}`);
      }
      
      // 必須フィールドの検証
      if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
      
      // アセットデータのインポート（銘柄タイプの検証を含む）
      if (Array.isArray(data.currentAssets)) {
        // 銘柄タイプを検証して修正
        const { updatedAssets: validatedAssets, changes } = validateAssetTypes(data.currentAssets);
        
        // 検証結果をセット
        setCurrentAssets(validatedAssets);
        
        // 変更があった場合は通知を表示
        if (changes.fundType > 0) {
          addNotification(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
        }
        if (changes.fees > 0) {
          addNotification(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
        }
        if (changes.dividends > 0) {
          addNotification(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');
        }
      }
      
      if (Array.isArray(data.targetPortfolio)) setTargetPortfolio(data.targetPortfolio);
      
      // additionalBudgetが存在する場合は設定
      if (data.additionalBudget !== undefined) {
        // 古い形式（数値）からオブジェクト形式への変換対応
        if (typeof data.additionalBudget === 'number') {
          setAdditionalBudget({
            amount: data.additionalBudget,
            currency: data.baseCurrency || 'JPY' // 基本通貨または'JPY'をデフォルトとする
          });
        } else if (typeof data.additionalBudget === 'object' && data.additionalBudget !== null) {
          // 既にオブジェクト形式なら直接セット
          setAdditionalBudget(data.additionalBudget);
        }
      }
      
      // AIプロンプトテンプレートがあれば設定
      if (data.aiPromptTemplate) {
        setAiPromptTemplate(data.aiPromptTemplate);
      }
      
      // インポート後に自動保存
      setTimeout(() => saveToLocalStorage(), 100);
      
      return { success: true, message: 'データをインポートしました' };
    } catch (error) {
      console.error('データのインポートに失敗しました', error);
      addNotification(`データのインポートに失敗しました: ${error.message}`, 'error');
      return { success: false, message: `データのインポートに失敗しました: ${error.message}` };
    }
  }, [saveToLocalStorage, addNotification, validateAssetTypes]);

  // データのエクスポート
  const exportData = useCallback(() => {
    return {
      baseCurrency,
      exchangeRate,
      lastUpdated,
      currentAssets,
      targetPortfolio,
      additionalBudget,
      aiPromptTemplate  // 追加
    };
  }, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate]);

  // 為替レートの更新（キャッシュ機能付き）
  const updateExchangeRate = useCallback(async () => {
    // デバウンスチェック
    if (!shouldUpdateExchangeRate()) {
      return;
    }
    
    try {
      // 現在の基準通貨をコピー（クロージャー内で使用）
      const currentBaseCurrency = baseCurrency;
      
      // キャッシュ確認（24時間以内のデータがあれば再利用）
      const cacheKey = `exchangeRate_${currentBaseCurrency}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) { // 24時間
          console.log(`為替レートキャッシュを使用 (キャッシュ年齢: ${Math.round(cacheAge / 1000 / 60)}分)`);
          setExchangeRate(cachedData.data);
          return;
        }
      }
      
      if (currentBaseCurrency === 'JPY') {
        const result = await requestManager.request(
          'exchangeRate',
          () => fetchExchangeRate('USD', 'JPY')
        );
        if (result.success) {
          const rateData = {
            rate: result.rate,
            source: result.source,
            lastUpdated: result.lastUpdated
          };
          setExchangeRate(rateData);
          // キャッシュに保存
          localStorage.setItem(cacheKey, JSON.stringify({
            data: rateData,
            timestamp: new Date().toISOString()
          }));
        }
      } else {
        const result = await requestManager.request(
          'exchangeRate',
          () => fetchExchangeRate('JPY', 'USD')
        );
        if (result.success) {
          const rateData = {
            rate: result.rate,
            source: result.source,
            lastUpdated: result.lastUpdated
          };
          setExchangeRate(rateData);
          // キャッシュに保存
          localStorage.setItem(cacheKey, JSON.stringify({
            data: rateData,
            timestamp: new Date().toISOString()
          }));
        }
      }
      
      // 為替レート更新後に自動保存（保存後に再度updateExchangeRateが呼ばれるのを防ぐ）
      // setTimeout(() => saveToLocalStorage(), 100);
    } catch (error) {
      console.error('為替レートの更新に失敗しました', error);
      // 更新失敗時は既存のレートを維持
    }
  }, []); // 依存配列を空にして再作成を防ぐ

  // Google認証状態の変更を処理
  const handleAuthStateChange = useCallback((isAuthenticated, user) => {
    // 認証状態変更時の処理
    if (isAuthenticated && user) {
      // ログイン時にクラウドデータを優先
      setDataSource('cloud');
    } else {
      // ログアウト時にローカルデータを使用
      setDataSource('local');
    }
  }, []);

  // Googleドライブにデータを保存（修正版）
  const saveToGoogleDrive = useCallback(async (userData) => {
    if (!userData) {
      addNotification('Googleアカウントにログインしていないため、クラウド保存できません', 'warning');
      return { success: false, message: 'ログインしていません' };
    }
    
    try {
      // Google Drive APIの初期化を確認
      await initGoogleDriveAPI();
      
      // 保存するデータを準備
      const portfolioData = {
        baseCurrency,
        exchangeRate,
        lastUpdated,
        currentAssets,
        targetPortfolio,
        additionalBudget,
        aiPromptTemplate, // 追加
        version: '1.0.0',
        timestamp: new Date().toISOString()
      };
      
      // 実際のGoogleドライブAPI呼び出し
      console.log('Googleドライブに保存:', portfolioData);
      const result = await apiSaveToGoogleDrive(portfolioData, userData);
      
      if (result.success) {
        // 同期時間を更新
        setLastSyncTime(new Date().toISOString());
        setDataSource('cloud');
        
        addNotification('データをクラウドに保存しました', 'success');
        return { success: true, message: 'データを保存しました' };
      } else {
        addNotification(`クラウド保存に失敗しました: ${result.message}`, 'error');
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Googleドライブへの保存に失敗しました', error);
      addNotification('クラウドへの保存に失敗しました', 'error');
      return { success: false, message: 'クラウド保存に失敗しました' };
    }
  }, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate, addNotification]);

  // Googleドライブからデータを読み込み（修正版）
  const loadFromGoogleDrive = useCallback(async (userData) => {
    if (!userData) {
      addNotification('Googleアカウントにログインしていないため、クラウドから読み込めません', 'warning');
      return { success: false, message: 'ログインしていません' };
    }
    
    try {
      // Google Drive APIの初期化を確認
      await initGoogleDriveAPI();
      
      // 実際のGoogleドライブAPI呼び出し
      console.log('Googleドライブから読み込み中');
      const result = await apiLoadFromGoogleDrive(userData);
      
      // API呼び出し結果を確認
      if (result.success && result.data) {
        const cloudData = result.data;
        
        // 基本的なデータ構造の検証
        const requiredFields = ['baseCurrency', 'currentAssets', 'targetPortfolio'];
        const missingFields = requiredFields.filter(field => !(field in cloudData));
        
        if (missingFields.length > 0) {
          console.warn(`クラウドデータに必須フィールドがありません: ${missingFields.join(', ')}`);
          addNotification('クラウドデータの形式が不正です', 'warning');
          return { success: false, message: 'クラウドデータの形式が不正です' };
        }
        
        // 各状態を更新
        if (cloudData.baseCurrency) setBaseCurrency(cloudData.baseCurrency);
        if (cloudData.exchangeRate) setExchangeRate(cloudData.exchangeRate);
        if (cloudData.lastUpdated) setLastUpdated(cloudData.lastUpdated);
        
        // additionalBudgetを適切にインポート
        if (cloudData.additionalBudget !== undefined) {
          // 古い形式（数値）からオブジェクト形式への変換対応
          if (typeof cloudData.additionalBudget === 'number') {
            setAdditionalBudget({
              amount: cloudData.additionalBudget,
              currency: cloudData.baseCurrency || 'JPY' // 基本通貨または'JPY'をデフォルトとする
            });
          } else if (typeof cloudData.additionalBudget === 'object' && cloudData.additionalBudget !== null) {
            // 既にオブジェクト形式なら直接セット
            setAdditionalBudget(cloudData.additionalBudget);
          }
        }
        
        // AIプロンプトテンプレートがあれば設定
        if (cloudData.aiPromptTemplate) {
          setAiPromptTemplate(cloudData.aiPromptTemplate);
        }
        
        // アセットデータのインポート（銘柄タイプ検証・修正付き）
        if (Array.isArray(cloudData.currentAssets)) {
          // 銘柄タイプの検証と修正
          const { updatedAssets: validatedAssets, changes } = validateAssetTypes(cloudData.currentAssets);
          setCurrentAssets(validatedAssets);
          
          // 変更があった場合は通知
          if (changes.fundType > 0) {
            addNotification(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
          }
          if (changes.fees > 0) {
            addNotification(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
          }
          if (changes.dividends > 0) {
            addNotification(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');
          }
        }
        
        if (Array.isArray(cloudData.targetPortfolio)) setTargetPortfolio(cloudData.targetPortfolio);
        
        setLastSyncTime(new Date().toISOString());
        setDataSource('cloud');
        addNotification('クラウドからデータを読み込みました', 'success');
        
        // ローカルストレージにも同期保存
        setTimeout(() => saveToLocalStorage(), 100);
        
        return { success: true, message: 'クラウドからデータを読み込みました' };
      } else {
        // 初回利用などでデータがない場合は、現在のデータをクラウドに保存するオプションを提案
        const message = result.message || 'クラウドにデータがありません';
        addNotification(`${message}。現在のデータをクラウドに保存しますか？`, 'info');
        
        // 自動的に現在のデータを保存する場合はここでsaveToGoogleDriveを呼び出す
        // あるいは、ユーザーに選択させる場合はUIで対応
        
        return { success: false, message: message, suggestSaving: true };
      }
    } catch (error) {
      console.error('Googleドライブからの読み込みに失敗しました', error);
      addNotification(`クラウドからの読み込みに失敗しました: ${error.message}`, 'error');
      return { success: false, message: `クラウド読み込みに失敗しました: ${error.message}` };
    }
  }, [addNotification, saveToLocalStorage, validateAssetTypes]);

  // データの初期化処理（ローカルストレージからデータを読み込み、銘柄情報を検証）
  const initializeData = useCallback(() => {
    try {
      if (initialized) return;
      console.log('データの初期化を開始...');
      const localData = loadFromLocalStorage();
      
      if (localData) {
        console.log('ローカルストレージからデータを読み込みました:', localData);
        
        // 各状態を更新
        if (localData.baseCurrency) {
          console.log('基準通貨を設定:', localData.baseCurrency);
          setBaseCurrency(localData.baseCurrency);
        }
        
        if (localData.exchangeRate) {
          console.log('為替レートを設定:', localData.exchangeRate);
          setExchangeRate(localData.exchangeRate);
        }
        
        if (localData.lastUpdated) {
          console.log('最終更新日時を設定:', localData.lastUpdated);
          setLastUpdated(localData.lastUpdated);
        }
        
        // additionalBudgetを適切にインポート
        if (localData.additionalBudget !== undefined) {
          console.log('追加予算を設定:', localData.additionalBudget);
          // 古い形式（数値）からオブジェクト形式への変換対応
          if (typeof localData.additionalBudget === 'number') {
            setAdditionalBudget({
              amount: localData.additionalBudget,
              currency: localData.baseCurrency || 'JPY' // 基本通貨または'JPY'をデフォルトとする
            });
          } else if (typeof localData.additionalBudget === 'object' && localData.additionalBudget !== null) {
            // 既にオブジェクト形式なら直接セット
            setAdditionalBudget(localData.additionalBudget);
          }
        }
        
        // AIプロンプトテンプレートがあれば設定
        if (localData.aiPromptTemplate) {
          console.log('AIプロンプトテンプレートを設定');
          setAiPromptTemplate(localData.aiPromptTemplate);
        }
        
        // アセットデータのインポートと検証
        if (Array.isArray(localData.currentAssets)) {
          console.log('保有資産データを設定:', localData.currentAssets.length, '件');
          
          // 銘柄タイプ、手数料、配当情報を検証して修正
          const { updatedAssets: validatedAssets, changes } = validateAssetTypes(localData.currentAssets);
          
          // 検証・修正済みのデータを設定
          setCurrentAssets(validatedAssets);
          
          // 変更があった場合は通知を表示
          if (changes.fundType > 0) {
            addNotification(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
            
            // 詳細な変更内容も表示（最大3件まで）
            changes.fundTypeDetails.slice(0, 3).forEach(detail => {
              addNotification(
                `「${detail.name || detail.ticker}」のタイプが「${detail.oldType}」から「${detail.newType}」に変更されました`,
                'info'
              );
            });
          }
          
          if (changes.fees > 0) {
            addNotification(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
          }
          
          if (changes.dividends > 0) {
            addNotification(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');
          }
          
          // データが修正された場合は自動保存
          if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
            setTimeout(() => {
              console.log('修正したデータを自動保存します');
              saveToLocalStorage();
            }, 500);
          }
        }
        
        if (Array.isArray(localData.targetPortfolio)) {
          console.log('目標配分データを設定:', localData.targetPortfolio.length, '件');
          setTargetPortfolio(localData.targetPortfolio);
        }
        
        addNotification('前回のデータを読み込みました', 'info');
      } else {
        console.log('ローカルストレージにデータがありませんでした。初期状態を使用します。');
      }
      
      // 初期化完了をマーク
      setInitialized(true);
    } catch (error) {
      console.error('データの初期化中にエラーが発生しました:', error);
      addNotification(`データの初期化中にエラーが発生しました: ${error.message}`, 'error');
      setInitialized(true); // エラーが発生しても初期化完了とマークする
    }
  }, [loadFromLocalStorage, addNotification, validateAssetTypes, saveToLocalStorage]);

  // コンポーネントマウント時にローカルストレージからデータを読み込む
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // 通貨切替時に為替レートを更新（初期化後のみ実行）
  useEffect(() => {
    if (initialized && baseCurrency) {
      updateExchangeRate();
    }
  }, [baseCurrency, initialized]); // updateExchangeRateを依存配列から削除

  // 総資産額の計算
  const totalAssets = currentAssets.reduce((sum, asset) => {
    let assetValue = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= exchangeRate.rate;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate;
      }
    }
    
    return sum + assetValue;
  }, 0);

  // 年間手数料の計算
  const annualFees = currentAssets.reduce((sum, asset) => {
    // 個別株は手数料がかからない
    if (asset.isStock || asset.fundType === FUND_TYPES.STOCK) {
      return sum;
    }
    
    let assetValue = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= exchangeRate.rate;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate;
      }
    }
    
    return sum + (assetValue * (asset.annualFee || 0) / 100);
  }, 0);

  // 年間配当金の計算（新規）
  const annualDividends = currentAssets.reduce((sum, asset) => {
    // 配当がない場合はスキップ
    if (!asset.hasDividend) {
      return sum;
    }
    
    let assetValue = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= exchangeRate.rate;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate;
      }
    }
    
    return sum + (assetValue * (asset.dividendYield || 0) / 100);
  }, 0);

  // 追加予算設定（通貨指定に対応）
  const setAdditionalBudgetWithCurrency = useCallback((amount, currency) => {
    setAdditionalBudget({
      amount: parseFloat(amount) || 0,
      currency: currency || 'JPY'
    });
    
    // 予算変更後に自動保存
    setTimeout(() => saveToLocalStorage(), 100);
  }, [saveToLocalStorage]);

  // コンテキスト値 (データ保存・同期関連の関数を追加)
  const contextValue = {
    baseCurrency, 
    exchangeRate, 
    lastUpdated, 
    isLoading,
    currentAssets, 
    targetPortfolio, 
    additionalBudget,
    totalAssets, 
    annualFees,
    annualDividends, // 年間配当金を追加
    dataSource,
    lastSyncTime,
    aiPromptTemplate,           // 追加
    updateAiPromptTemplate,     // 追加
    toggleCurrency, 
    refreshMarketPrices, 
    addTicker,
    updateTargetAllocation, 
    updateHoldings,
    updateAnnualFee, // 手数料率更新関数を追加
    updateDividendInfo, // 配当情報更新関数を追加
    removeTicker,
    setAdditionalBudget: setAdditionalBudgetWithCurrency, // 通貨対応版に置き換え
    calculateSimulation,
    executePurchase, 
    executeBatchPurchase,
    importData, 
    exportData,
    addNotification,
    removeNotification,
    convertCurrency, // 通貨変換関数を追加
    calculatePurchaseShares, // 購入株数計算関数を追加
    // データ保存・同期関連
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    saveToGoogleDrive,
    loadFromGoogleDrive,
    handleAuthStateChange,
    initializeData,
    validateAssetTypes // 銘柄タイプ検証関数を追加
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
      
      {/* 通知表示 */}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`p-3 rounded-md shadow-md text-sm ${
              notification.type === 'error' ? 'bg-red-100 text-red-700' :
              notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              notification.type === 'success' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <span>{notification.message}</span>
              <button 
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </PortfolioContext.Provider>
  );
};

// 明示的にデフォルトエクスポートも追加
export default PortfolioContext;

// テスト用にユーティリティ関数を明示的にエクスポート
export { encryptData, decryptData };
