/**
 * 統合ポートフォリオプロバイダー
 * 
 * Composition: 複数のコンテキストを組み合わせて提供
 */

import React from 'react';
import { PortfolioDataProvider } from './PortfolioDataContext';
import { PortfolioActionsProvider } from './PortfolioActionsContext';
import { LocalStorageProvider } from '../../services/portfolio/storage/LocalStorageProvider';
import { GoogleDriveProvider } from '../../services/portfolio/storage/GoogleDriveProvider';

/**
 * ポートフォリオ機能を統合して提供するプロバイダー
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @param {Object} props.storageProvider - ストレージプロバイダー（オプション）
 * @param {Object} props.cloudProvider - クラウドプロバイダー（オプション）
 */
export const PortfolioProvider = ({ 
  children, 
  storageProvider = new LocalStorageProvider(),
  cloudProvider = new GoogleDriveProvider()
}) => {
  return (
    <PortfolioDataProvider storageProvider={storageProvider}>
      <PortfolioActionsProvider>
        {children}
      </PortfolioActionsProvider>
    </PortfolioDataProvider>
  );
};

/**
 * レガシーコードとの互換性のため、
 * 元のPortfolioContextを新しい構造にマッピング
 */
export { PortfolioContext } from './PortfolioCompatibilityContext';