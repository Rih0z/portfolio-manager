/**
 * ポートフォリオアクションコンテキスト
 * 
 * Single Responsibility: ポートフォリオのCRUD操作のみ
 */

import React, { createContext, useContext, useCallback } from 'react';
import { PortfolioDataContext } from './PortfolioDataContext';
import { useNotifications } from '../../hooks/portfolio/useNotifications';
import { fetchTickerData, fetchFundInfo, fetchDividendData } from '../../services/api';
import { guessFundType, FUND_TYPES, US_ETF_LIST } from '../../utils/fundUtils';
import { validateAssetTypes } from '../../utils/assetValidation';

export const PortfolioActionsContext = createContext();

export const PortfolioActionsProvider = ({ children }) => {
  const {
    currentAssets,
    setCurrentAssets,
    targetPortfolio,
    setTargetPortfolio,
    setIsLoading,
    saveToLocalStorage
  } = useContext(PortfolioDataContext);
  
  const { addNotification } = useNotifications();
  
  // 銘柄を追加
  const addTicker = useCallback(async (ticker, holdings = 0) => {
    if (!ticker) {
      return { success: false, message: 'ティッカーシンボルを入力してください' };
    }
    
    // 重複チェック
    if (currentAssets.some(asset => asset.ticker === ticker)) {
      addNotification('既に追加されている銘柄です', 'warning');
      return { success: false, message: '既に追加されている銘柄です' };
    }
    
    setIsLoading(true);
    
    try {
      // 銘柄データを取得
      const tickerResult = await fetchTickerData(ticker);
      
      if (!tickerResult.success) {
        addNotification(`銘柄「${ticker}」の情報取得でエラーが発生しました`, 'error');
        return { success: false, message: '銘柄の追加に失敗しました' };
      }
      
      const tickerData = tickerResult.data;
      
      // ファンド情報を取得
      const fundInfoResult = await fetchFundInfo(ticker, tickerData.name);
      
      // 配当情報を取得
      const dividendResult = await fetchDividendData(ticker);
      
      // ファンドタイプを決定
      let fundType;
      const upperTicker = ticker.toUpperCase();
      
      if (US_ETF_LIST.includes(upperTicker)) {
        fundType = FUND_TYPES.ETF_US;
      } else {
        fundType = tickerData.fundType || fundInfoResult.fundType;
        if (!fundType || fundType === 'unknown') {
          fundType = guessFundType(ticker, tickerData.name || '');
        }
      }
      
      const isStock = fundType === FUND_TYPES.STOCK;
      
      // 新しい資産を作成
      const newAsset = {
        id: ticker,
        ticker: ticker,
        name: tickerData.name || ticker,
        price: tickerData.price || 0,
        holdings: holdings,
        currency: tickerData.currency || 'USD',
        lastUpdated: new Date().toISOString(),
        source: tickerData.source || 'API',
        fundType: fundType,
        isStock: isStock,
        isMutualFund: fundType === FUND_TYPES.MUTUAL_FUND,
        annualFee: isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0),
        feeSource: fundInfoResult.feeSource || (isStock ? '個別株' : '推定'),
        feeIsEstimated: fundInfoResult.feeIsEstimated || false,
        hasDividend: dividendResult.data.hasDividend || false,
        dividendYield: dividendResult.data.dividendYield || 0,
        dividendFrequency: dividendResult.data.dividendFrequency || 'unknown',
        dividendIsEstimated: dividendResult.data.isEstimated || false
      };
      
      // 資産を追加
      setCurrentAssets([...currentAssets, newAsset]);
      
      // 目標配分がない場合は0%で追加
      if (!targetPortfolio.find(t => t.ticker === ticker)) {
        setTargetPortfolio([...targetPortfolio, {
          id: ticker,
          ticker: ticker,
          targetPercentage: 0
        }]);
      }
      
      addNotification(`${newAsset.name}を追加しました`, 'success');
      
      // 保存
      setTimeout(() => saveToLocalStorage(), 100);
      
      return { success: true, asset: newAsset };
    } catch (error) {
      console.error('Error adding ticker:', error);
      addNotification(`銘柄の追加中にエラーが発生しました: ${error.message}`, 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [currentAssets, targetPortfolio, setCurrentAssets, setTargetPortfolio, setIsLoading, addNotification, saveToLocalStorage]);
  
  // 保有数を更新
  const updateHolding = useCallback((ticker, newHoldings) => {
    setCurrentAssets(assets => 
      assets.map(asset => 
        asset.ticker === ticker 
          ? { ...asset, holdings: parseFloat(newHoldings) || 0 }
          : asset
      )
    );
    
    setTimeout(() => saveToLocalStorage(), 100);
  }, [setCurrentAssets, saveToLocalStorage]);
  
  // 資産を削除
  const removeAsset = useCallback((ticker) => {
    setCurrentAssets(assets => assets.filter(asset => asset.ticker !== ticker));
    setTargetPortfolio(targets => targets.filter(target => target.ticker !== ticker));
    
    addNotification(`${ticker}を削除しました`, 'info');
    
    setTimeout(() => saveToLocalStorage(), 100);
  }, [setCurrentAssets, setTargetPortfolio, addNotification, saveToLocalStorage]);
  
  // 目標配分を更新
  const updateTargetAllocation = useCallback((ticker, percentage) => {
    setTargetPortfolio(targets => 
      targets.map(target => 
        target.ticker === ticker 
          ? { ...target, targetPercentage: parseFloat(percentage) || 0 }
          : target
      )
    );
    
    setTimeout(() => saveToLocalStorage(), 100);
  }, [setTargetPortfolio, saveToLocalStorage]);
  
  // データをインポート
  const importData = useCallback((data) => {
    if (!data) return { success: false, message: 'データが無効です' };
    
    try {
      // データ検証と正規化
      const { updatedAssets, changes } = validateAssetTypes(data.currentAssets || []);
      
      setCurrentAssets(updatedAssets);
      
      if (data.targetPortfolio) {
        setTargetPortfolio(data.targetPortfolio);
      }
      
      // 変更通知
      if (changes.fundType > 0) {
        addNotification(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
      }
      
      setTimeout(() => saveToLocalStorage(), 100);
      
      return { success: true, message: 'データをインポートしました' };
    } catch (error) {
      console.error('Import error:', error);
      addNotification(`データのインポートに失敗しました: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }, [setCurrentAssets, setTargetPortfolio, addNotification, saveToLocalStorage]);
  
  const value = {
    addTicker,
    updateHolding,
    removeAsset,
    updateTargetAllocation,
    importData
  };
  
  return (
    <PortfolioActionsContext.Provider value={value}>
      {children}
    </PortfolioActionsContext.Provider>
  );
};