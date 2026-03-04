/**
 * ポートフォリオデータコンテキスト
 * 
 * Single Responsibility: ポートフォリオの基本データ管理のみ
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { LocalStorageProvider } from '../../services/portfolio/storage/LocalStorageProvider';
import { PortfolioCalculationService } from '../../services/portfolio/CalculationService';

export const PortfolioDataContext = createContext();

export const PortfolioDataProvider = ({ children, storageProvider = new LocalStorageProvider() }) => {
  // 基本データ
  const [currentAssets, setCurrentAssets] = useState([]);
  const [targetPortfolio, setTargetPortfolio] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState('JPY');
  const [exchangeRate, setExchangeRate] = useState({
    rate: 150.0,
    source: 'Default',
    lastUpdated: new Date().toISOString()
  });
  const [additionalBudget, setAdditionalBudget] = useState({
    amount: 300000,
    currency: 'JPY'
  });
  const [aiPromptTemplate, setAiPromptTemplate] = useState(null);
  
  // メタデータ
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // 計算値
  const totalAssets = PortfolioCalculationService.calculateTotalAssets(
    currentAssets,
    baseCurrency,
    exchangeRate
  );
  
  const totalAnnualFees = PortfolioCalculationService.calculateAnnualFees(
    currentAssets,
    baseCurrency,
    exchangeRate
  );
  
  const totalAnnualDividends = PortfolioCalculationService.calculateAnnualDividends(
    currentAssets,
    baseCurrency,
    exchangeRate
  );
  
  // ローカルストレージへの保存
  const saveToLocalStorage = useCallback(async () => {
    const data = {
      baseCurrency,
      exchangeRate,
      lastUpdated: new Date().toISOString(),
      currentAssets,
      targetPortfolio,
      additionalBudget,
      aiPromptTemplate
    };
    
    await storageProvider.save('portfolioData', data);
    setLastUpdated(data.lastUpdated);
  }, [baseCurrency, exchangeRate, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate, storageProvider]);
  
  // ローカルストレージからの読み込み
  const loadFromLocalStorage = useCallback(async () => {
    try {
      const data = await storageProvider.load('portfolioData');
      
      if (data) {
        if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
        if (data.currentAssets) setCurrentAssets(data.currentAssets);
        if (data.targetPortfolio) setTargetPortfolio(data.targetPortfolio);
        if (data.additionalBudget) setAdditionalBudget(data.additionalBudget);
        if (data.aiPromptTemplate) setAiPromptTemplate(data.aiPromptTemplate);
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);
        
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return null;
    }
  }, [storageProvider]);
  
  // 初期化
  useEffect(() => {
    if (!initialized) {
      loadFromLocalStorage().then(() => {
        setInitialized(true);
      });
    }
  }, [initialized, loadFromLocalStorage]);
  
  // データ変更時の自動保存
  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => {
        saveToLocalStorage();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [initialized, currentAssets, targetPortfolio, baseCurrency, exchangeRate, additionalBudget, aiPromptTemplate, saveToLocalStorage]);
  
  const value = {
    // データ
    currentAssets,
    setCurrentAssets,
    targetPortfolio,
    setTargetPortfolio,
    baseCurrency,
    setBaseCurrency,
    exchangeRate,
    setExchangeRate,
    additionalBudget,
    setAdditionalBudget,
    aiPromptTemplate,
    setAiPromptTemplate,
    
    // 計算値
    totalAssets,
    totalAnnualFees,
    totalAnnualDividends,
    
    // メタデータ
    lastUpdated,
    isLoading,
    setIsLoading,
    initialized,
    
    // ストレージ操作
    saveToLocalStorage,
    loadFromLocalStorage
  };
  
  return (
    <PortfolioDataContext.Provider value={value}>
      {children}
    </PortfolioDataContext.Provider>
  );
};