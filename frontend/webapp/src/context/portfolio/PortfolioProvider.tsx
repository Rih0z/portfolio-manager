/**
 * 統合ポートフォリオプロバイダー
 *
 * Composition: 複数のコンテキストを組み合わせて提供
 */

import React, { ReactNode } from 'react';
import { PortfolioDataProvider } from './PortfolioDataContext';
import { PortfolioActionsProvider } from './PortfolioActionsContext';
import { LocalStorageProvider } from '../../services/portfolio/storage/LocalStorageProvider';
import { GoogleDriveProvider } from '../../services/portfolio/storage/GoogleDriveProvider';

interface PortfolioProviderProps {
  children: ReactNode;
  storageProvider?: any;
  cloudProvider?: any;
}

/**
 * ポートフォリオ機能を統合して提供するプロバイダー
 */
export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({
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
