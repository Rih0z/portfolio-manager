import React, { createContext, useState, useCallback, useEffect } from 'react';
import { fetchTickerData } from '../services/api';

export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
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
  const [additionalBudget, setAdditionalBudget] = useState(300000);
  const [notifications, setNotifications] = useState([]);

  // 通知を追加する関数
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    return id;
  }, []);

  // 通知を削除する関数
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 通貨切替
  const toggleCurrency = useCallback(() => {
    setBaseCurrency(prev => prev === 'JPY' ? 'USD' : 'JPY');
  }, []);

  // 市場データの更新
  const refreshMarketPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      // 全ての保有銘柄の最新価格を取得
      const updatedAssets = await Promise.all(
        currentAssets.map(async (asset) => {
          try {
            const updatedData = await fetchTickerData(asset.ticker);
            return {
              ...asset,
              price: updatedData.price
            };
          } catch (error) {
            console.error(`銘柄 ${asset.ticker} の更新に失敗しました`, error);
            return asset;
          }
        })
      );

      setCurrentAssets(updatedAssets);
      setLastUpdated(new Date().toISOString());
      
      return { success: true, message: '市場データを更新しました' };
    } catch (error) {
      console.error('市場データの更新に失敗しました', error);
      addNotification('市場データの更新に失敗しました', 'error');
      return { success: false, message: '市場データの更新に失敗しました' };
    } finally {
      setIsLoading(false);
    }
  }, [currentAssets, addNotification]);

  // 銘柄追加
  const addTicker = useCallback(async (ticker) => {
    try {
      // 既に存在するか確認
      const exists = [...targetPortfolio, ...currentAssets].some(
        item => item.ticker?.toLowerCase() === ticker.toLowerCase()
      );

      if (exists) {
        return { success: false, message: '既に追加されている銘柄です' };
      }

      // Yahoo Financeから銘柄データ取得
      const tickerData = await fetchTickerData(ticker);

      // 目標配分に追加
      setTargetPortfolio(prev => {
        const newItems = [...prev, {
          ...tickerData,
          targetPercentage: 0
        }];
        return newItems;
      });

      // 保有資産に追加
      setCurrentAssets(prev => {
        const newItems = [...prev, {
          ...tickerData,
          holdings: 0
        }];
        return newItems;
      });

      return { success: true, message: '銘柄を追加しました' };
    } catch (error) {
      console.error('銘柄の追加に失敗しました', error);
      addNotification(`銘柄「${ticker}」の追加に失敗しました`, 'error');
      return { success: false, message: '銘柄の追加に失敗しました' };
    }
  }, [targetPortfolio, currentAssets, addNotification]);

  // 目標配分更新
  const updateTargetAllocation = useCallback((id, percentage) => {
    setTargetPortfolio(prev => 
      prev.map(item => 
        item.id === id ? { ...item, targetPercentage: parseFloat(percentage) } : item
      )
    );
  }, []);

  // 保有数量更新（小数点以下4桁まで対応）
  const updateHoldings = useCallback((id, holdings) => {
    setCurrentAssets(prev => 
      prev.map(item => 
        item.id === id ? { ...item, holdings: parseFloat(parseFloat(holdings).toFixed(4)) || 0 } : item
      )
    );
  }, []);

  // 銘柄削除
  const removeTicker = useCallback((id) => {
    setTargetPortfolio(prev => prev.filter(item => item.id !== id));
    setCurrentAssets(prev => prev.filter(item => item.id !== id));
  }, []);

  // シミュレーション計算
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
    
    const totalWithBudget = totalCurrentAssets + additionalBudget;
    
    // 各銘柄ごとの計算
    return targetPortfolio.map(target => {
      // 現在の資産から対応する銘柄を検索
      const currentAsset = currentAssets.find(asset => asset.id === target.id) || {
        price: target.price,
        holdings: 0,
        currency: target.currency
      };
      
      // 現在評価額計算
      let currentAmount = currentAsset.price * currentAsset.holdings;
      
      // 通貨換算
      if (currentAsset.currency !== baseCurrency) {
        if (baseCurrency === 'JPY' && currentAsset.currency === 'USD') {
          currentAmount *= exchangeRate.rate;
        } else if (baseCurrency === 'USD' && currentAsset.currency === 'JPY') {
          currentAmount /= exchangeRate.rate;
        }
      }
      
      // 目標額
      const targetAmount = totalWithBudget * (target.targetPercentage / 100);
      
      // 不足額
      const additionalAmount = targetAmount - currentAmount;
      
      // 追加必要株数
      let additionalUnits = 0;
      if (additionalAmount > 0) {
        let priceInBaseCurrency = target.price;
        
        // 通貨換算
        if (target.currency !== baseCurrency) {
          if (baseCurrency === 'JPY' && target.currency === 'USD') {
            priceInBaseCurrency *= exchangeRate.rate;
          } else if (baseCurrency === 'USD' && target.currency === 'JPY') {
            priceInBaseCurrency /= exchangeRate.rate;
          }
        }
        // 小数点以下4桁まで対応（Math.floorではなく小数点以下4桁に丸める）
        additionalUnits = parseFloat((additionalAmount / priceInBaseCurrency).toFixed(4));
      }
      
      return {
        ...target,
        currentAmount,
        targetAmount,
        additionalAmount,
        additionalUnits: Math.max(0, additionalUnits),
        purchaseAmount: Math.max(0, additionalAmount),
        remark: additionalUnits <= 0 ? '既に目標配分を達成しています' : '',
      };
    });
  }, [currentAssets, targetPortfolio, additionalBudget, baseCurrency, exchangeRate]);

  // 購入処理（小数点以下4桁まで対応）
  const executePurchase = useCallback((tickerId, units) => {
    setCurrentAssets(prev => 
      prev.map(asset => 
        asset.id === tickerId 
          ? { ...asset, holdings: parseFloat((asset.holdings + parseFloat(units)).toFixed(4)) } 
          : asset
      )
    );
  }, []);

  // 一括購入処理
  const executeBatchPurchase = useCallback((simulationResult) => {
    simulationResult.forEach(result => {
      if (result.additionalUnits > 0) {
        executePurchase(result.id, result.additionalUnits);
      }
    });
  }, [executePurchase]);

  // データのインポート
  const importData = useCallback((data) => {
    if (!data) return { success: false, message: 'データが無効です' };
    
    try {
      // 必須フィールドの検証
      if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
      if (Array.isArray(data.currentAssets)) setCurrentAssets(data.currentAssets);
      if (Array.isArray(data.targetPortfolio)) setTargetPortfolio(data.targetPortfolio);
      
      return { success: true, message: 'データをインポートしました' };
    } catch (error) {
      console.error('データのインポートに失敗しました', error);
      return { success: false, message: 'データのインポートに失敗しました' };
    }
  }, []);

  // データのエクスポート
  const exportData = useCallback(() => {
    return {
      baseCurrency,
      exchangeRate,
      lastUpdated,
      currentAssets,
      targetPortfolio
    };
  }, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio]);

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

  // コンテキスト値
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
    toggleCurrency, 
    refreshMarketPrices, 
    addTicker,
    updateTargetAllocation, 
    updateHoldings, 
    removeTicker,
    setAdditionalBudget, 
    calculateSimulation,
    executePurchase, 
    executeBatchPurchase,
    importData, 
    exportData,
    addNotification,
    removeNotification
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