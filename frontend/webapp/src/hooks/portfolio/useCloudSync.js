/**
 * クラウド同期用カスタムフック
 * 
 * Interface Segregation Principle: クラウド同期機能のみを公開
 */

import { useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';

/**
 * クラウド同期機能にアクセスするフック
 * @returns {Object} クラウド同期機能
 */
export const useCloudSync = () => {
  const context = useContext(PortfolioContext);
  
  if (!context) {
    throw new Error('useCloudSync must be used within a PortfolioProvider');
  }
  
  return {
    // 同期アクション
    saveToGoogleDrive: context.saveToGoogleDrive,
    loadFromGoogleDrive: context.loadFromGoogleDrive,
    
    // 同期状態
    dataSource: context.dataSource,
    lastSyncTime: context.lastSyncTime,
    
    // 認証状態
    currentUser: context.currentUser,
    handleAuthStateChange: context.handleAuthStateChange
  };
};