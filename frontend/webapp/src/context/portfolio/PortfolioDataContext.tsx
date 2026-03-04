/**
 * ポートフォリオデータコンテキスト
 *
 * Single Responsibility: ポートフォリオの基本データ管理のみ
 */

import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { LocalStorageProvider } from '../../services/portfolio/storage/LocalStorageProvider';
import { PortfolioCalculationService } from '../../services/portfolio/CalculationService';
import type { Asset, TargetAllocation, ExchangeRate, AdditionalBudget } from '../../types/portfolio.types';

interface PortfolioDataContextValue {
  // データ
  currentAssets: any[];
  setCurrentAssets: React.Dispatch<React.SetStateAction<any[]>>;
  targetPortfolio: any[];
  setTargetPortfolio: React.Dispatch<React.SetStateAction<any[]>>;
  baseCurrency: string;
  setBaseCurrency: React.Dispatch<React.SetStateAction<string>>;
  exchangeRate: any;
  setExchangeRate: React.Dispatch<React.SetStateAction<any>>;
  additionalBudget: any;
  setAdditionalBudget: React.Dispatch<React.SetStateAction<any>>;
  aiPromptTemplate: any;
  setAiPromptTemplate: React.Dispatch<React.SetStateAction<any>>;

  // 計算値
  totalAssets: number;
  totalAnnualFees: number;
  totalAnnualDividends: number;

  // メタデータ
  lastUpdated: string | null;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  initialized: boolean;

  // ストレージ操作
  saveToLocalStorage: () => Promise<void>;
  loadFromLocalStorage: () => Promise<any | null>;
}

export const PortfolioDataContext = createContext<PortfolioDataContextValue | undefined>(undefined);

interface PortfolioDataProviderProps {
  children: ReactNode;
  storageProvider?: any;
}

export const PortfolioDataProvider: React.FC<PortfolioDataProviderProps> = ({ children, storageProvider = new LocalStorageProvider() }) => {
  // 基本データ
  const [currentAssets, setCurrentAssets] = useState<any[]>([]);
  const [targetPortfolio, setTargetPortfolio] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>('JPY');
  const [exchangeRate, setExchangeRate] = useState<any>({
    rate: 150.0,
    source: 'Default',
    lastUpdated: new Date().toISOString()
  });
  const [additionalBudget, setAdditionalBudget] = useState<any>({
    amount: 300000,
    currency: 'JPY'
  });
  const [aiPromptTemplate, setAiPromptTemplate] = useState<any>(null);

  // メタデータ
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

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
  const saveToLocalStorage = useCallback(async (): Promise<void> => {
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
  const loadFromLocalStorage = useCallback(async (): Promise<any | null> => {
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

  const value: PortfolioDataContextValue = {
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
