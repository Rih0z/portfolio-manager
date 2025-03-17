import React, { createContext, useState, useCallback, useEffect } from 'react';
import { fetchTickerData, fetchExchangeRate, fetchFundInfo } from '../services/api';

// 暗号化/復号化のためのシンプルな関数
// 注: 本番環境では、より堅牢な暗号化を検討してください
const encryptData = (data, key = 'portfolio-manager-secret') => {
  try {
    // シンプルな文字列化と組み合わせた基本的な暗号化
    const jsonString = JSON.stringify(data);
    return btoa(jsonString); // Base64エンコード（簡易的な暗号化）
  } catch (error) {
    console.error('データの暗号化に失敗しました', error);
    return null;
  }
};

const decryptData = (encryptedData, key = 'portfolio-manager-secret') => {
  try {
    // 復号化処理
    const jsonString = atob(encryptedData); // Base64デコード
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('データの復号化に失敗しました', error);
    return null;
  }
};

// 保存するデータ構造の定義
const createDataStructure = (state) => {
  return {
    baseCurrency: state.baseCurrency,
    exchangeRate: state.exchangeRate,
    lastUpdated: state.lastUpdated,
    currentAssets: state.currentAssets,
    targetPortfolio: state.targetPortfolio,
    additionalBudget: state.additionalBudget,
    version: '1.0.0', // データバージョン管理
    timestamp: new Date().toISOString()
  };
};

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
  
  // 新規: データ保存関連の状態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [dataSource, setDataSource] = useState('local'); // 'local' or 'cloud'

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

  // ローカルストレージにデータを保存
  const saveToLocalStorage = useCallback(() => {
    try {
      const portfolioData = {
        baseCurrency,
        exchangeRate,
        lastUpdated,
        currentAssets,
        targetPortfolio,
        additionalBudget,
        version: '1.0.0', // データバージョン管理
        timestamp: new Date().toISOString()
      };
      
      // データの暗号化
      const encryptedData = encryptData(portfolioData);
      
      // ローカルストレージに保存
      localStorage.setItem('portfolioData', encryptedData);
      
      return true;
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗しました', error);
      return false;
    }
  }, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget]);

  // ローカルストレージからデータを読み込み
  const loadFromLocalStorage = useCallback(() => {
    try {
      // ローカルストレージからデータを取得
      const encryptedData = localStorage.getItem('portfolioData');
      if (!encryptedData) return null;
      
      // データの復号化
      const decryptedData = decryptData(encryptedData);
      if (!decryptedData) return null;
      
      return decryptedData;
    } catch (error) {
      console.error('ローカルストレージからの読み込みに失敗しました', error);
      return null;
    }
  }, []);

  // 通貨切替
  const toggleCurrency = useCallback(() => {
    setBaseCurrency(prev => {
      const newCurrency = prev === 'JPY' ? 'USD' : 'JPY';
      // 通貨切替後、自動保存
      setTimeout(() => saveToLocalStorage(), 0);
      return newCurrency;
    });
  }, [saveToLocalStorage]);

  // ローカルストレージにデータを保存
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = createDataStructure({
        baseCurrency,
        exchangeRate,
        lastUpdated,
        currentAssets,
        targetPortfolio,
        additionalBudget
      });
      
      // データの暗号化
      const encryptedData = encryptData(dataToSave);
      
      // ローカルストレージに保存
      localStorage.setItem('portfolioData', encryptedData);
      localStorage.setItem('portfolioDataTimestamp', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗しました', error);
      return false;
    }
  }, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget]);

  // ローカルストレージからデータを読み込み
  const loadFromLocalStorage = useCallback(() => {
    try {
      // ローカルストレージからデータを取得
      const encryptedData = localStorage.getItem('portfolioData');
      if (!encryptedData) return null;
      
      // データの復号化
      const decryptedData = decryptData(encryptedData);
      if (!decryptedData) return null;
      
      return decryptedData;
    } catch (error) {
      console.error('ローカルストレージからの読み込みに失敗しました', error);
      return null;
    }
  }, []);

  // Googleドライブにデータを保存
  const saveToGoogleDrive = useCallback(async () => {
    if (!isAuthenticated || !user) {
      addNotification('データをクラウドに保存するにはGoogleアカウントでログインしてください', 'warning');
      return false;
    }
    
    try {
      setIsSyncing(true);
      
      // Googleドライブに保存するデータ
      const dataToSave = createDataStructure({
        baseCurrency,
        exchangeRate,
        lastUpdated,
        currentAssets,
        targetPortfolio,
        additionalBudget
      });
      
      // Google Drive APIを使ってデータを保存する処理
      // 注: この部分は実際にGoogle Drive APIを呼び出す処理に置き換える必要があります
      console.log('クラウドへデータ保存:', dataToSave);
      
      // ここでGoogle Drive APIを呼び出す（API自体はまだ実装されていないため、シミュレーション）
      // 成功したと仮定
      setLastSyncTime(new Date().toISOString());
      setDataSource('cloud');
      addNotification('データをクラウドに保存しました', 'success');
      
      return true;
    } catch (error) {
      console.error('クラウドへの保存に失敗しました', error);
      addNotification('クラウドへの保存に失敗しました', 'error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user, baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, addNotification]);

  // Googleドライブからデータを読み込み
  const loadFromGoogleDrive = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return null;
    }
    
    try {
      setIsSyncing(true);
      
      // Google Drive APIを使ってデータを取得する処理
      // 注: この部分は実際にGoogle Drive APIを呼び出す処理に置き換える必要があります
      console.log('クラウドからデータ読み込み');
      
      // ここでGoogle Drive APIを呼び出す（API自体はまだ実装されていないため、シミュレーション）
      // 成功したと仮定し、ダミーデータを返す (実際の実装では削除してください)
      const dummyCloudData = null;
      
      if (dummyCloudData) {
        setLastSyncTime(new Date().toISOString());
        setDataSource('cloud');
        addNotification('クラウドからデータを読み込みました', 'success');
      }
      
      return dummyCloudData;
    } catch (error) {
      console.error('クラウドからの読み込みに失敗しました', error);
      addNotification('クラウドからの読み込みに失敗しました', 'error');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user, addNotification]);

  // 認証状態の変更を処理
  const handleAuthStateChange = useCallback((authState, userData) => {
    setIsAuthenticated(authState);
    setUser(userData);
    
    if (authState && userData) {
      // 認証成功時、クラウドデータと同期
      synchronizeData();
    } else {
      // ログアウト時、ローカルデータを使用
      setDataSource('local');
    }
  }, []);

  // データの同期（ローカルとクラウドの競合解決）
  const synchronizeData = useCallback(async () => {
    try {
      setIsSyncing(true);
      
      // ローカルデータの取得
      const localData = loadFromLocalStorage();
      const localTimestamp = localStorage.getItem('portfolioDataTimestamp');
      
      // クラウドデータの取得
      const cloudData = await loadFromGoogleDrive();
      
      if (!cloudData && !localData) {
        // どちらもデータがない場合は何もしない
        return;
      }
      
      if (!cloudData && localData) {
        // クラウドにデータがなく、ローカルにデータがある場合
        // ローカルデータを適用し、クラウドに保存
        applyData(localData);
        await saveToGoogleDrive();
        return;
      }
      
      if (cloudData && !localData) {
        // クラウドにデータがあり、ローカルにデータがない場合
        // クラウドデータを適用
        applyData(cloudData);
        saveToLocalStorage();
        return;
      }
      
      // 両方にデータがある場合、タイムスタンプを比較
      if (cloudData.timestamp > localTimestamp) {
        // クラウドデータの方が新しい場合
        applyData(cloudData);
        saveToLocalStorage();
        addNotification('クラウドの最新データを適用しました', 'info');
      } else {
        // ローカルデータの方が新しい場合
        applyData(localData);
        await saveToGoogleDrive();
        addNotification('ローカルの最新データをクラウドに同期しました', 'info');
      }
    } catch (error) {
      console.error('データ同期中にエラーが発生しました', error);
      addNotification('データの同期に失敗しました', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [loadFromLocalStorage, loadFromGoogleDrive, saveToGoogleDrive, saveToLocalStorage, addNotification]);

  // データを状態に適用する関数
  const applyData = useCallback((data) => {
    if (!data) return;
    
    // 各状態を更新
    if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
    if (data.exchangeRate) setExchangeRate(data.exchangeRate);
    if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    if (data.additionalBudget) setAdditionalBudget(data.additionalBudget);
    
    // アセットデータのインポート（個別株の手数料を0%に確保）
    if (Array.isArray(data.currentAssets)) {
      const validatedAssets = data.currentAssets.map(asset => {
        // 個別株の場合は手数料を0に設定
        if (asset.isStock || asset.fundType === 'STOCK' || asset.fundType === '個別株') {
          return {
            ...asset,
            annualFee: 0,
            feeSource: '個別株',
            feeIsEstimated: false,
            isStock: true
          };
        }
        return asset;
      });
      setCurrentAssets(validatedAssets);
    }
    
    // 目標配分データの適用
    if (Array.isArray(data.targetPortfolio)) {
      setTargetPortfolio(data.targetPortfolio);
    }
  }, []);

  // 市場データの更新（手数料更新機能を追加）
  const refreshMarketPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Refreshing market prices for all assets...');
      
      let feeChangesCount = 0;
      const feeChangeDetails = [];
      
      // 全ての保有銘柄の最新価格と手数料情報を取得
      const updatedAssets = await Promise.all(
        currentAssets.map(async (asset) => {
          try {
            // Alpha Vantageから直接データ取得
            const updatedData = await fetchTickerData(asset.ticker);
            console.log(`Updated data for ${asset.ticker}:`, updatedData);
            
            // 手数料情報の変更を確認
            const hasFeeChanged = asset.annualFee !== updatedData.annualFee;
            
            // 手数料変更があれば記録
            if (hasFeeChanged && !asset.isStock) {
              feeChangesCount++;
              feeChangeDetails.push({
                ticker: asset.ticker,
                name: asset.name,
                oldFee: asset.annualFee,
                newFee: updatedData.annualFee
              });
            }
            
            // 更新されたアセット情報を返す（個別株は常に手数料0%を維持）
            return {
              ...asset,
              price: updatedData.price,
              source: updatedData.source,
              lastUpdated: updatedData.lastUpdated,
              annualFee: asset.isStock ? 0 : updatedData.annualFee, // 個別株は常に0%
              fundType: updatedData.fundType || asset.fundType,
              feeSource: asset.isStock ? '個別株' : updatedData.feeSource,
              feeIsEstimated: asset.isStock ? false : updatedData.feeIsEstimated,
              region: updatedData.region || asset.region
            };
          } catch (error) {
            console.error(`銘柄 ${asset.ticker} の更新に失敗しました`, error);
            return asset;
          }
        })
      );

      setCurrentAssets(updatedAssets);
      setLastUpdated(new Date().toISOString());
      
      // データソースの統計を計算
      const sourceCounts = updatedAssets.reduce((acc, asset) => {
        acc[asset.source] = (acc[asset.source] || 0) + 1;
        return acc;
      }, {});
      
      // 通知メッセージを作成
      let message = '市場データを更新しました';
      if (sourceCounts['Alpha Vantage']) {
        message += ` (Alpha Vantage: ${sourceCounts['Alpha Vantage']}件`;
      }
      if (sourceCounts['Fallback']) {
        message += `, フォールバック: ${sourceCounts['Fallback']}件`;
      }
      message += ')';
      
      addNotification(message, 'success');
      
      // 手数料変更があった場合は別途通知
      if (feeChangesCount > 0) {
        let feeMessage = `${feeChangesCount}件のファンドで手数料情報が更新されました`;
        addNotification(feeMessage, 'info');
        
        // 詳細な変更内容も表示（最大3件まで）
        feeChangeDetails.slice(0, 3).forEach(detail => {
          addNotification(
            `「${detail.name || detail.ticker}」の手数料が${detail.oldFee.toFixed(2)}%から${detail.newFee.toFixed(2)}%に変更されました`,
            'info'
          );
        });
      }
      
      // データの自動保存
      await autoSaveData();
      
      return { success: true, message };
    } catch (error) {
      console.error('市場データの更新に失敗しました', error);
      addNotification('市場データの更新に失敗しました', 'error');
      return { success: false, message: '市場データの更新に失敗しました' };
    } finally {
      setIsLoading(false);
    }
  }, [currentAssets, addNotification, autoSaveData]);

  // データの自動保存（ローカルストレージとクラウド）
  const autoSaveData = useCallback(async () => {
    // ローカルストレージに保存
    saveToLocalStorage();
    
    // 認証済みの場合はクラウドにも保存
    if (isAuthenticated && user) {
      await saveToGoogleDrive();
    }
  }, [saveToLocalStorage, saveToGoogleDrive, isAuthenticated, user]);

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

      // Alpha Vantageから銘柄データ取得
      const tickerData = await fetchTickerData(ticker);
      console.log('Fetched ticker data:', tickerData);

      // ファンド情報を取得（手数料率など）
      const fundInfoResult = await fetchFundInfo(ticker);
      console.log('Fetched fund info:', fundInfoResult);
      
      // 自動取得した手数料情報のメッセージを作成
      let feeMessage = '';
      if (fundInfoResult.success) {
        const { fundType, annualFee, feeIsEstimated } = fundInfoResult;
        feeMessage = `${fundType} ファンドとして判定し、年間手数料率${annualFee}%を${feeIsEstimated ? '推定' : '設定'}しました`;
      }

      // 目標配分に追加
      setTargetPortfolio(prev => {
        const newItems = [...prev, {
          ...tickerData,
          targetPercentage: 0
        }];
        return newItems;
      });

      // 保有資産に追加（ファンド情報を含む）
      setCurrentAssets(prev => {
        const newItems = [...prev, {
          ...tickerData,
          holdings: 0,
          annualFee: tickerData.annualFee || 0,
          fundType: tickerData.fundType || 'unknown',
          feeSource: tickerData.feeSource || 'Estimated',
          feeIsEstimated: tickerData.feeIsEstimated || true,
          region: tickerData.region || 'unknown'
        }];
        return newItems;
      });

      // 手数料情報の通知を追加
      if (feeMessage) {
        addNotification(feeMessage, 'info');
      }
      
      // データの自動保存
      await autoSaveData();

      return { success: true, message: '銘柄を追加しました' };
    } catch (error) {
      console.error('銘柄の追加に失敗しました', error);
      addNotification(`銘柄「${ticker}」の追加に失敗しました`, 'error');
      return { success: false, message: '銘柄の追加に失敗しました' };
    }
  }, [targetPortfolio, currentAssets, addNotification, autoSaveData]);

  // 目標配分更新
  const updateTargetAllocation = useCallback((id, percentage) => {
    setTargetPortfolio(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, targetPercentage: parseFloat(percentage) } : item
      );
      
      // 変更後に自動保存
      setTimeout(() => autoSaveData(), 0);
      
      return updated;
    });
  }, [autoSaveData]);

  // 保有数量更新（小数点以下4桁まで対応）
  const updateHoldings = useCallback((id, holdings) => {
    setCurrentAssets(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, holdings: parseFloat(parseFloat(holdings).toFixed(4)) || 0 } : item
      );
      
      // 変更後に自動保存
      setTimeout(() => autoSaveData(), 0);
      
      return updated;
    });
  }, [autoSaveData]);

  // 銘柄削除
  const removeTicker = useCallback((id) => {
    setTargetPortfolio(prev => {
      const updated = prev.filter(item => item.id !== id);
      return updated;
    });
    
    setCurrentAssets(prev => {
      const updated = prev.filter(item => item.id !== id);
      
      // 変更後に自動保存
      setTimeout(() => autoSaveData(), 0);
      
      return updated;
    });
  }, [autoSaveData]);

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
    setCurrentAssets(prev => {
      const updated = prev.map(asset => 
        asset.id === tickerId 
          ? { ...asset, holdings: parseFloat((asset.holdings + parseFloat(units)).toFixed(4)) } 
          : asset
      );
      
      // 変更後に自動保存
      setTimeout(() => autoSaveData(), 0);
      
      return updated;
    });
  }, [autoSaveData]);

  // 一括購入処理
  const executeBatchPurchase = useCallback((simulationResult) => {
    simulationResult.forEach(result => {
      if (result.additionalUnits > 0) {
        executePurchase(result.id, result.additionalUnits);
      }
    });
    
    // データの自動保存
    autoSaveData();
  }, [executePurchase, autoSaveData]);

  // データのインポート（手数料情報の整合性を確保）
  const importData = useCallback((data) => {
    if (!data) return { success: false, message: 'データが無効です' };
    
    try {
      // 必須フィールドの検証
      if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
      
      // アセットデータのインポート（個別株の手数料を0%に確保）
      if (Array.isArray(data.currentAssets)) {
        const validatedAssets = data.currentAssets.map(asset => {
          // 個別株の場合は手数料を0に設定
          if (asset.isStock || asset.fundType === 'STOCK' || asset.fundType === '個別株') {
            return {
              ...asset,
              annualFee: 0,
              feeSource: '個別株',
              feeIsEstimated: false,
              isStock: true
            };
          }
          return asset;
        });
        setCurrentAssets(validatedAssets);
      }
      
      if (Array.isArray(data.targetPortfolio)) setTargetPortfolio(data.targetPortfolio);
      
      // データの自動保存
      autoSaveData();
      
      return { success: true, message: 'データをインポートしました' };
    } catch (error) {
      console.error('データのインポートに失敗しました', error);
      return { success: false, message: 'データのインポートに失敗しました' };
    }
  }, [autoSaveData]);

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

  // 為替レートの更新
  const updateExchangeRate = useCallback(async () => {
    try {
      if (baseCurrency === 'JPY') {
        const result = await fetchExchangeRate('USD', 'JPY');
        setExchangeRate({
          rate: result.rate,
          source: result.source,
          lastUpdated: result.lastUpdated
        });
      } else {
        const result = await fetchExchangeRate('JPY', 'USD');
        setExchangeRate({
          rate: result.rate,
          source: result.source,
          lastUpdated: result.lastUpdated
        });
      }
      
      // データの自動保存
      autoSaveData();
    } catch (error) {
      console.error('為替レートの更新に失敗しました', error);
      // 更新失敗時は既存のレートを維持
    }
  }, [baseCurrency, autoSaveData]);

  // 初期化時の処理: ローカルストレージから読み込み
  useEffect(() => {
    const initializeData = async () => {
      // ローカルストレージからデータを読み込み
      const localData = loadFromLocalStorage();
      
      if (localData) {
        // データが存在する場合は適用
        applyData(localData);
        addNotification('前回のデータを読み込みました', 'info');
      }
      
      // 認証済みの場合はクラウドとも同期
      if (isAuthenticated && user) {
        await synchronizeData();
      }
    };
    
    initializeData();
  }, []);

  // 通貨切替時に為替レートを更新
  useEffect(() => {
    updateExchangeRate();
  }, [baseCurrency, updateExchangeRate]);

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
    if (asset.isStock || asset.fundType === 'STOCK' || asset.fundType === '個別株') {
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

  // コンテキスト値（データ保存・同期関連を追加）
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
    isAuthenticated,
    user,
    isSyncing,
    lastSyncTime,
    dataSource,
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
    removeNotification,
    // 新規追加の関数
    handleAuthStateChange,
    synchronizeData,
    saveToLocalStorage,
    loadFromLocalStorage,
    saveToGoogleDrive,
    loadFromGoogleDrive
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
