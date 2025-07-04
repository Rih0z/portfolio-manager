/**
 * useYAMLIntegration.js のユニットテスト
 * YAML統合フックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { useYAMLIntegration } from '../../../hooks/useYAMLIntegration';
import { PortfolioContext } from '../../../context/PortfolioContext';
import { AuthContext } from '../../../context/AuthContext';
import React from 'react';

// yamlIntegrationServiceをモック
jest.mock('../../../services/yamlIntegrationService', () => ({
  __esModule: true,
  default: {
    integrateYAMLData: jest.fn()
  }
}));

import yamlIntegrationService from '../../../services/yamlIntegrationService';

// React Context用のモックプロバイダー
const createMockProvider = (portfolioContextValue, authContextValue) => {
  return ({ children }) => (
    <PortfolioContext.Provider value={portfolioContextValue}>
      <AuthContext.Provider value={authContextValue}>
        {children}
      </AuthContext.Provider>
    </PortfolioContext.Provider>
  );
};

describe('useYAMLIntegration', () => {
  const mockPortfolioContext = {
    currentAssets: [],
    targetPortfolio: [],
    additionalBudget: { amount: 0 },
    setCurrentAssets: jest.fn(),
    setTargetPortfolio: jest.fn(),
    setAdditionalBudget: jest.fn(),
    saveToLocalStorage: jest.fn(),
    addNotification: jest.fn()
  };

  const mockAuthContext = {
    user: { id: 'test-user', name: 'Test User' }
  };

  const MockProvider = createMockProvider(mockPortfolioContext, mockAuthContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('integrateYAMLData', () => {
    it('YAML統合を正常に実行する', async () => {
      const mockYamlData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: []
        }
      };

      const mockIntegrationResult = {
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { type: 'metadata_update', description: 'メタデータを更新' }
        ],
        metadata: {
          transformedHoldings: []
        }
      };

      yamlIntegrationService.integrateYAMLData.mockResolvedValue(mockIntegrationResult);

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      let integrationResult;
      await act(async () => {
        integrationResult = await result.current.integrateYAMLData(
          mockYamlData,
          'portfolio'
        );
      });

      expect(yamlIntegrationService.integrateYAMLData).toHaveBeenCalledWith(
        mockYamlData,
        'portfolio',
        expect.objectContaining({
          portfolioContext: mockPortfolioContext,
          authContext: mockAuthContext
        }),
        expect.objectContaining({
          portfolioContext: mockPortfolioContext,
          authContext: mockAuthContext
        })
      );

      expect(integrationResult).toEqual(mockIntegrationResult);
      expect(result.current.lastIntegrationResult).toEqual(mockIntegrationResult);
      expect(result.current.integrationHistory).toHaveLength(1);
    });

    it('統合エラーを適切にハンドリングする', async () => {
      const mockYamlData = { invalid_data: {} };
      const mockError = new Error('統合エラー');

      yamlIntegrationService.integrateYAMLData.mockRejectedValue(mockError);

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      let integrationResult;
      await act(async () => {
        integrationResult = await result.current.integrateYAMLData(
          mockYamlData,
          'portfolio'
        );
      });

      expect(integrationResult.success).toBe(false);
      expect(integrationResult.errors).toHaveLength(1);
      expect(integrationResult.errors[0].message).toBe('統合エラー');
      expect(result.current.lastIntegrationResult.success).toBe(false);
    });

    it('バックアップを作成してから統合を実行する', async () => {
      const mockYamlData = {
        portfolio_data: {
          holdings: [{ symbol: 'VTI', quantity: 10 }]
        }
      };

      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      });

      const { result } = renderHook(() => useYAMLIntegration({
        backupBeforeIntegration: true
      }), {
        wrapper: MockProvider
      });

      await act(async () => {
        await result.current.integrateYAMLData(mockYamlData, 'portfolio');
      });

      expect(result.current.hasBackup).toBe(true);
    });
  });

  describe('applyPortfolioChanges', () => {
    it('ポートフォリオ変更を適切に適用する', async () => {
      const mockMetadata = {
        portfolioMetadata: [
          {
            field: 'monthlyInvestment',
            newValue: 100000
          }
        ],
        transformedHoldings: [
          { symbol: 'VTI', name: 'Vanguard ETF', quantity: 10 }
        ],
        transformedTargetAllocation: [
          { assetClass: 'US_Stocks', targetPercentage: 60 }
        ]
      };

      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [],
        metadata: mockMetadata
      });

      const { result } = renderHook(() => useYAMLIntegration({
        autoSave: true
      }), {
        wrapper: MockProvider
      });

      const mockYamlData = {
        portfolio_data: {
          metadata: { monthly_investment: 100000 },
          holdings: [{ symbol: 'VTI', quantity: 10 }]
        }
      };

      await act(async () => {
        await result.current.integrateYAMLData(mockYamlData, 'portfolio');
      });

      expect(mockPortfolioContext.setAdditionalBudget).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(mockPortfolioContext.setCurrentAssets).toHaveBeenCalledWith(
        mockMetadata.transformedHoldings
      );
      expect(mockPortfolioContext.setTargetPortfolio).toHaveBeenCalledWith(
        mockMetadata.transformedTargetAllocation
      );
      expect(mockPortfolioContext.saveToLocalStorage).toHaveBeenCalled();
    });
  });

  describe('rollbackToBackup', () => {
    it('バックアップからデータを復元する', async () => {
      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      });

      const { result } = renderHook(() => useYAMLIntegration({
        backupBeforeIntegration: true,
        autoSave: true
      }), {
        wrapper: MockProvider
      });

      // まずバックアップを作成するために統合を実行
      await act(async () => {
        await result.current.integrateYAMLData(
          { portfolio_data: { holdings: [] } },
          'portfolio'
        );
      });

      expect(result.current.hasBackup).toBe(true);

      // ロールバックを実行
      await act(async () => {
        await result.current.rollbackToBackup();
      });

      expect(mockPortfolioContext.setCurrentAssets).toHaveBeenCalled();
      expect(mockPortfolioContext.saveToLocalStorage).toHaveBeenCalled();
      expect(result.current.integrationHistory.length).toBeGreaterThan(1);
    });

    it('バックアップが無い場合エラーを投げる', async () => {
      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      await expect(
        act(async () => {
          await result.current.rollbackToBackup();
        })
      ).rejects.toThrow('復元可能なバックアップが見つかりません');
    });
  });

  describe('createDataBackup', () => {
    it('現在のデータのバックアップを作成する', async () => {
      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      let backup;
      await act(async () => {
        backup = await result.current.createDataBackup();
      });

      expect(backup).toMatchObject({
        timestamp: expect.any(String),
        portfolioData: {
          currentAssets: [],
          targetPortfolio: [],
          additionalBudget: { amount: 0 },
          portfolio: null
        },
        userData: {
          user: { id: 'test-user', name: 'Test User' }
        }
      });

      expect(result.current.hasBackup).toBe(true);
    });
  });

  describe('通知機能', () => {
    it('成功時に通知を表示する', async () => {
      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { type: 'test', description: 'テスト変更' }
        ],
        metadata: {}
      });

      const { result } = renderHook(() => useYAMLIntegration({
        showNotifications: true
      }), {
        wrapper: MockProvider
      });

      await act(async () => {
        await result.current.integrateYAMLData(
          { portfolio_data: {} },
          'portfolio'
        );
      });

      expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith({
        type: 'success',
        message: expect.stringContaining('データの統合が完了'),
        duration: 5000
      });
    });

    it('エラー時に通知を表示する', async () => {
      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: false,
        errors: [{ message: 'テストエラー' }],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      });

      const { result } = renderHook(() => useYAMLIntegration({
        showNotifications: true
      }), {
        wrapper: MockProvider
      });

      await act(async () => {
        await result.current.integrateYAMLData(
          { invalid_data: {} },
          'portfolio'
        );
      });

      expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'テストエラー',
        duration: 8000
      });
    });
  });

  describe('複合データの統合', () => {
    it('複合データを順次統合する', async () => {
      const mockCompositeData = {
        portfolio_data: {
          metadata: { total_assets: 1000000 }
        },
        user_profile: {
          basic_info: { age_group: '30-40' }
        }
      };

      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { type: 'portfolio_update', description: 'ポートフォリオ更新' },
          { type: 'user_profile_update', description: 'ユーザープロファイル更新' }
        ],
        metadata: {
          transformedHoldings: [],
          transformedUserProfile: {}
        }
      });

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      await act(async () => {
        await result.current.integrateYAMLData(
          mockCompositeData,
          'composite'
        );
      });

      expect(yamlIntegrationService.integrateYAMLData).toHaveBeenCalledWith(
        mockCompositeData,
        'composite',
        expect.any(Object),
        expect.any(Object)
      );

      expect(result.current.lastIntegrationResult.success).toBe(true);
    });
  });

  describe('統計情報', () => {
    it('統合履歴の統計を正しく計算する', async () => {
      yamlIntegrationService.integrateYAMLData
        .mockResolvedValueOnce({
          success: true,
          errors: [],
          warnings: [],
          appliedChanges: [],
          metadata: {}
        })
        .mockResolvedValueOnce({
          success: false,
          errors: [{ message: 'エラー' }],
          warnings: [],
          appliedChanges: [],
          metadata: {}
        });

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      // 成功ケース
      await act(async () => {
        await result.current.integrateYAMLData(
          { portfolio_data: {} },
          'portfolio'
        );
      });

      // 失敗ケース
      await act(async () => {
        await result.current.integrateYAMLData(
          { invalid_data: {} },
          'portfolio'
        );
      });

      expect(result.current.totalIntegrations).toBe(2);
      expect(result.current.successfulIntegrations).toBe(1);
      expect(result.current.failedIntegrations).toBe(1);
    });
  });

  describe('clearIntegrationHistory', () => {
    it('統合履歴をクリアする', async () => {
      yamlIntegrationService.integrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      });

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      // まず統合を実行して履歴を作成
      await act(async () => {
        await result.current.integrateYAMLData(
          { portfolio_data: {} },
          'portfolio'
        );
      });

      expect(result.current.integrationHistory).toHaveLength(1);

      // 履歴をクリア
      act(() => {
        result.current.clearIntegrationHistory();
      });

      expect(result.current.integrationHistory).toHaveLength(0);
      expect(result.current.hasBackup).toBe(false);
    });
  });

  describe('状態管理', () => {
    it('統合中の状態を正しく管理する', async () => {
      let resolveIntegration;
      const integrationPromise = new Promise((resolve) => {
        resolveIntegration = resolve;
      });

      yamlIntegrationService.integrateYAMLData.mockReturnValue(integrationPromise);

      const { result } = renderHook(() => useYAMLIntegration(), {
        wrapper: MockProvider
      });

      // 統合開始
      const integrationCall = act(async () => {
        return result.current.integrateYAMLData({ portfolio_data: {} }, 'portfolio');
      });

      // 統合中の状態を確認
      expect(result.current.isIntegrating).toBe(true);

      // 統合完了
      resolveIntegration({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      });

      await integrationCall;

      expect(result.current.isIntegrating).toBe(false);
    });
  });
});