import React, { createContext, useState, useCallback, useEffect } from 'react';
import { 
  fetchTickerData, 
  fetchExchangeRate, 
  fetchFundInfo,
  loadFromGoogleDrive as apiLoadFromGoogleDrive,
  saveToGoogleDrive as apiSaveToGoogleDrive,
  initGoogleDriveAPI
} from '../services/api';

// 既存のコードは省略...

// Googleドライブにデータを保存
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
}, [baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, addNotification, setLastSyncTime, setDataSource]);

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
      if (cloudData.additionalBudget !== undefined) setAdditionalBudget(cloudData.additionalBudget);
      
      // アセットデータのインポート（個別株の手数料を0%に確保）
      if (Array.isArray(cloudData.currentAssets)) {
        const validatedAssets = cloudData.currentAssets.map(asset => {
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
}, [baseCurrency, addNotification, saveToLocalStorage, setBaseCurrency, setExchangeRate, setLastUpdated, setAdditionalBudget, setCurrentAssets, setTargetPortfolio, setLastSyncTime, setDataSource]);
