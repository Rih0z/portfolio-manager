/**
 * ポートフォリオ互換性コンテキスト
 * 
 * 既存コードとの互換性を保つため、
 * 新しい分離されたコンテキストを統合して提供
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { PortfolioDataContext } from './PortfolioDataContext';
import { PortfolioActionsContext } from './PortfolioActionsContext';
import { useNotifications } from '../../hooks/portfolio/useNotifications';
import { SimulationService } from '../../services/portfolio/SimulationService';
import { GoogleDriveProvider } from '../../services/portfolio/storage/GoogleDriveProvider';
import { fetchExchangeRate, fetchMultipleStocks } from '../../services/marketDataService';

export const PortfolioContext = createContext();

/**
 * 互換性レイヤー
 * 既存のPortfolioContextと同じインターフェースを提供
 */
export const PortfolioCompatibilityProvider = ({ children }) => {
  const dataContext = useContext(PortfolioDataContext);
  const actionsContext = useContext(PortfolioActionsContext);
  const { notifications, addNotification, removeNotification } = useNotifications();
  
  const [dataSource, setDataSource] = useState('local');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [includeCurrentHoldings, setIncludeCurrentHoldings] = useState(true);
  
  const cloudProvider = new GoogleDriveProvider();
  
  // 市場データの更新
  const refreshMarketData = useCallback(async () => {
    if (!dataContext.currentAssets || dataContext.currentAssets.length === 0) {
      return { success: true, message: '更新する銘柄がありません' };
    }
    
    dataContext.setIsLoading(true);
    
    try {
      const tickers = dataContext.currentAssets.map(asset => asset.ticker);
      const result = await fetchMultipleStocks(tickers, true);
      
      if (result.success) {
        const updatedAssets = dataContext.currentAssets.map(asset => {
          const newData = result.data[asset.ticker];
          if (newData) {
            return {
              ...asset,
              price: newData.price,
              lastUpdated: new Date().toISOString(),
              source: newData.source
            };
          }
          return asset;
        });
        
        dataContext.setCurrentAssets(updatedAssets);
        addNotification('市場データを更新しました', 'success');
        
        setTimeout(() => dataContext.saveToLocalStorage(), 100);
        
        return { success: true };
      } else {
        throw new Error(result.message || '市場データの更新に失敗しました');
      }
    } catch (error) {
      console.error('Market data refresh error:', error);
      addNotification('市場データの更新に失敗しました', 'error');
      return { success: false, message: error.message };
    } finally {
      dataContext.setIsLoading(false);
    }
  }, [dataContext, addNotification]);
  
  // 為替レートの更新
  const updateExchangeRate = useCallback(async (forceUpdate = false) => {
    try {
      const result = await fetchExchangeRate('USD', 'JPY', forceUpdate);
      
      if (result.success) {
        dataContext.setExchangeRate({
          rate: result.rate,
          source: result.source,
          lastUpdated: result.lastUpdated
        });
        
        if (result.isDefault || result.isStale) {
          const warning = result.isDefault 
            ? 'デフォルトの為替レート（150円/ドル）を使用しています' 
            : '為替レートが古い可能性があります';
          addNotification(warning, 'warning');
        }
      }
    } catch (error) {
      console.error('Exchange rate update error:', error);
      addNotification('為替レートの更新に失敗しました', 'error');
    }
  }, [dataContext, addNotification]);
  
  // シミュレーション実行
  const runSimulation = useCallback(() => {
    const result = SimulationService.runSimulation({
      currentAssets: dataContext.currentAssets,
      targetPortfolio: dataContext.targetPortfolio,
      additionalBudget: dataContext.additionalBudget,
      baseCurrency: dataContext.baseCurrency,
      exchangeRate: dataContext.exchangeRate,
      includeCurrentHoldings
    });
    
    setSimulationResult(result);
    return result;
  }, [dataContext, includeCurrentHoldings]);
  
  // 購入実行
  const executePurchase = useCallback(() => {
    if (!simulationResult || !simulationResult.purchases) {
      addNotification('シミュレーション結果がありません', 'error');
      return;
    }
    
    const updatedAssets = SimulationService.executePurchases(
      simulationResult.purchases,
      dataContext.currentAssets
    );
    
    dataContext.setCurrentAssets(updatedAssets);
    addNotification('購入を実行しました', 'success');
    
    setTimeout(() => dataContext.saveToLocalStorage(), 100);
  }, [simulationResult, dataContext, addNotification]);
  
  // Google Drive保存
  const saveToGoogleDrive = useCallback(async (userData = null) => {
    const user = userData || currentUser;
    
    const data = {
      baseCurrency: dataContext.baseCurrency,
      exchangeRate: dataContext.exchangeRate,
      lastUpdated: dataContext.lastUpdated,
      currentAssets: dataContext.currentAssets,
      targetPortfolio: dataContext.targetPortfolio,
      additionalBudget: dataContext.additionalBudget,
      aiPromptTemplate: dataContext.aiPromptTemplate
    };
    
    const result = await cloudProvider.save(data, user);
    
    if (result.success) {
      setLastSyncTime(new Date().toISOString());
      setDataSource('cloud');
      addNotification(result.message, 'success');
    } else {
      addNotification(result.message, 'error');
    }
    
    return result;
  }, [dataContext, currentUser, cloudProvider, addNotification]);
  
  // Google Driveから読み込み
  const loadFromGoogleDrive = useCallback(async (userData = null) => {
    const user = userData || currentUser;
    
    const result = await cloudProvider.load(user);
    
    if (result.success && result.data) {
      const imported = actionsContext.importData(result.data);
      if (imported.success) {
        setLastSyncTime(new Date().toISOString());
        setDataSource('cloud');
        addNotification('クラウドからデータを読み込みました', 'success');
      }
    } else {
      addNotification(result.message, result.suggestSaving ? 'info' : 'error');
    }
    
    return result;
  }, [currentUser, cloudProvider, actionsContext, addNotification]);
  
  // 認証状態変更ハンドラ
  const handleAuthStateChange = useCallback((isAuthenticated, user) => {
    if (isAuthenticated && user) {
      setDataSource('cloud');
      setCurrentUser(user);
    } else {
      setDataSource('local');
      setCurrentUser(null);
    }
  }, []);
  
  // データのエクスポート
  const exportData = useCallback(() => {
    return {
      baseCurrency: dataContext.baseCurrency,
      exchangeRate: dataContext.exchangeRate,
      lastUpdated: dataContext.lastUpdated,
      currentAssets: dataContext.currentAssets,
      targetPortfolio: dataContext.targetPortfolio,
      additionalBudget: dataContext.additionalBudget,
      aiPromptTemplate: dataContext.aiPromptTemplate
    };
  }, [dataContext]);
  
  // 統合された値オブジェクト
  const value = {
    // データコンテキストから
    ...dataContext,
    
    // アクションコンテキストから
    ...actionsContext,
    
    // 通知
    notifications,
    addNotification,
    removeNotification,
    
    // クラウド同期
    dataSource,
    lastSyncTime,
    currentUser,
    saveToGoogleDrive,
    loadFromGoogleDrive,
    handleAuthStateChange,
    
    // シミュレーション
    simulationResult,
    includeCurrentHoldings,
    setIncludeCurrentHoldings,
    runSimulation,
    executePurchase,
    
    // その他のアクション
    refreshMarketData,
    updateExchangeRate,
    exportData
  };
  
  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

/**
 * 新しいプロバイダー構造での互換性レイヤー
 */
export const PortfolioCompatibilityWrapper = ({ children }) => {
  return (
    <PortfolioCompatibilityProvider>
      {children}
    </PortfolioCompatibilityProvider>
  );
};