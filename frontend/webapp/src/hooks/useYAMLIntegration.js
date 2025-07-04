/**
 * YAML統合フック
 * 
 * YAMLデータをReactコンテキストに統合するためのカスタムフック
 * PortfolioContext、AuthContext等との連携を提供
 * 
 * 機能:
 * - YAMLデータのコンテキスト統合
 * - 統合状態の管理
 * - エラーハンドリング
 * - ロールバック機能
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import { useState, useCallback, useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { AuthContext } from '../context/AuthContext';
import yamlIntegrationService from '../services/yamlIntegrationService';

/**
 * YAML統合フック
 * @param {Object} options - フックオプション
 * @returns {Object} 統合機能と状態
 */
export const useYAMLIntegration = (options = {}) => {
  const {
    autoSave = true,
    showNotifications = true,
    backupBeforeIntegration = true
  } = options;

  // Context の取得
  const portfolioContext = useContext(PortfolioContext);
  const authContext = useContext(AuthContext);

  // 状態管理
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationHistory, setIntegrationHistory] = useState([]);
  const [lastIntegrationResult, setLastIntegrationResult] = useState(null);
  const [dataBackup, setDataBackup] = useState(null);

  /**
   * YAMLデータをアプリケーションに統合
   * @param {Object} yamlData - パース済みYAMLデータ
   * @param {string} dataType - データタイプ
   * @param {Object} integrationOptions - 統合オプション
   * @returns {Promise<Object>} 統合結果
   */
  const integrateYAMLData = useCallback(async (yamlData, dataType, integrationOptions = {}) => {
    setIsIntegrating(true);
    
    try {
      // バックアップの作成
      if (backupBeforeIntegration) {
        await createDataBackup();
      }

      // 現在のコンテキストを準備
      const currentContext = {
        portfolioContext,
        authContext,
        user: authContext?.user || null
      };

      // 統合処理の実行
      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData, 
        dataType, 
        currentContext,
        {
          ...integrationOptions,
          portfolioContext,
          authContext
        }
      );

      // 統合結果の処理
      if (result.success) {
        await applyIntegrationResult(result, dataType);
        
        // 履歴に追加
        setIntegrationHistory(prev => [...prev, {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          dataType,
          result,
          yamlData: yamlData // 必要に応じてサニタイズ
        }]);

        if (showNotifications) {
          showSuccessNotification(result);
        }
      } else {
        if (showNotifications) {
          showErrorNotification(result);
        }
      }

      setLastIntegrationResult(result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        errors: [{ message: error.message }],
        warnings: [],
        appliedChanges: [],
        metadata: {}
      };
      
      setLastIntegrationResult(errorResult);
      
      if (showNotifications) {
        showErrorNotification(errorResult);
      }
      
      return errorResult;
    } finally {
      setIsIntegrating(false);
    }
  }, [portfolioContext, authContext, backupBeforeIntegration, showNotifications]);

  /**
   * 統合結果をアプリケーションに適用
   * @param {Object} result - 統合結果
   * @param {string} dataType - データタイプ
   */
  const applyIntegrationResult = useCallback(async (result, dataType) => {
    const { metadata } = result;

    switch (dataType) {
      case 'portfolio':
        await applyPortfolioChanges(metadata);
        break;
      case 'user_profile':
        await applyUserProfileChanges(metadata);
        break;
      case 'app_config':
        await applyAppConfigChanges(metadata);
        break;
      case 'allocation_templates':
        await applyAllocationTemplateChanges(metadata);
        break;
      case 'composite':
        // 複合データの場合、各データタイプを順次適用
        if (metadata.transformedHoldings) {
          await applyPortfolioChanges(metadata);
        }
        if (metadata.transformedUserProfile) {
          await applyUserProfileChanges(metadata);
        }
        if (metadata.transformedAppConfig) {
          await applyAppConfigChanges(metadata);
        }
        if (metadata.transformedAllocationTemplates) {
          await applyAllocationTemplateChanges(metadata);
        }
        break;
      default:
        console.warn(`未対応のデータタイプ: ${dataType}`);
    }

    // 自動保存
    if (autoSave && portfolioContext?.saveToLocalStorage) {
      portfolioContext.saveToLocalStorage();
    }
  }, [portfolioContext, autoSave]);

  /**
   * ポートフォリオ変更の適用
   */
  const applyPortfolioChanges = useCallback(async (metadata) => {
    if (!portfolioContext) return;

    // メタデータの更新
    if (metadata.portfolioMetadata) {
      const changes = metadata.portfolioMetadata;
      changes.forEach(change => {
        switch (change.field) {
          case 'monthlyInvestment':
            if (portfolioContext.setAdditionalBudget) {
              portfolioContext.setAdditionalBudget(prev => ({
                ...prev,
                amount: change.newValue
              }));
            }
            break;
          // 他のフィールドも必要に応じて追加
        }
      });
    }

    // 保有資産の更新
    if (metadata.transformedHoldings) {
      if (portfolioContext.setCurrentAssets) {
        portfolioContext.setCurrentAssets(metadata.transformedHoldings);
      }
    }

    // 目標配分の更新
    if (metadata.transformedTargetAllocation) {
      if (portfolioContext.setTargetPortfolio) {
        portfolioContext.setTargetPortfolio(metadata.transformedTargetAllocation);
      }
    }
  }, [portfolioContext]);

  /**
   * ユーザープロファイル変更の適用
   */
  const applyUserProfileChanges = useCallback(async (metadata) => {
    if (!metadata.transformedUserProfile) return;

    // ユーザープロファイルの更新
    // この部分は既存のユーザープロファイル管理システムに応じて実装
    console.log('ユーザープロファイル更新:', metadata.transformedUserProfile);
  }, []);

  /**
   * アプリ設定変更の適用
   */
  const applyAppConfigChanges = useCallback(async (metadata) => {
    if (!metadata.transformedAppConfig) return;

    // アプリ設定の更新
    // この部分は既存の設定管理システムに応じて実装
    console.log('アプリ設定更新:', metadata.transformedAppConfig);
  }, []);

  /**
   * 配分テンプレート変更の適用
   */
  const applyAllocationTemplateChanges = useCallback(async (metadata) => {
    if (!metadata.transformedAllocationTemplates) return;

    // 配分テンプレートの更新
    // この部分は配分テンプレート管理システムに応じて実装
    console.log('配分テンプレート更新:', metadata.transformedAllocationTemplates);
  }, []);

  /**
   * データバックアップの作成
   */
  const createDataBackup = useCallback(async () => {
    const backup = {
      timestamp: new Date().toISOString(),
      portfolioData: {
        currentAssets: portfolioContext?.currentAssets || [],
        targetPortfolio: portfolioContext?.targetPortfolio || [],
        additionalBudget: portfolioContext?.additionalBudget || null,
        portfolio: portfolioContext?.portfolio || null
      },
      userData: {
        user: authContext?.user || null
      }
    };

    setDataBackup(backup);
    return backup;
  }, [portfolioContext, authContext]);

  /**
   * データの復元（ロールバック）
   */
  const rollbackToBackup = useCallback(async () => {
    if (!dataBackup || !portfolioContext) {
      throw new Error('復元可能なバックアップが見つかりません');
    }

    const { portfolioData } = dataBackup;

    // ポートフォリオデータの復元
    if (portfolioContext.setCurrentAssets) {
      portfolioContext.setCurrentAssets(portfolioData.currentAssets);
    }
    if (portfolioContext.setTargetPortfolio) {
      portfolioContext.setTargetPortfolio(portfolioData.targetPortfolio);
    }
    if (portfolioContext.setAdditionalBudget) {
      portfolioContext.setAdditionalBudget(portfolioData.additionalBudget);
    }

    // 自動保存
    if (autoSave && portfolioContext.saveToLocalStorage) {
      portfolioContext.saveToLocalStorage();
    }

    // ロールバック履歴に追加
    setIntegrationHistory(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'rollback',
      backup: dataBackup
    }]);

    return true;
  }, [dataBackup, portfolioContext, autoSave]);

  /**
   * 成功通知の表示
   */
  const showSuccessNotification = useCallback((result) => {
    if (portfolioContext?.addNotification) {
      portfolioContext.addNotification({
        type: 'success',
        message: `データの統合が完了しました（${result.appliedChanges.length}件の変更）`,
        duration: 5000
      });
    }
  }, [portfolioContext]);

  /**
   * エラー通知の表示
   */
  const showErrorNotification = useCallback((result) => {
    if (portfolioContext?.addNotification) {
      const errorMessage = result.errors.length > 0 
        ? result.errors[0].message 
        : 'データの統合中にエラーが発生しました';
      
      portfolioContext.addNotification({
        type: 'error',
        message: errorMessage,
        duration: 8000
      });
    }
  }, [portfolioContext]);

  /**
   * 統合履歴のクリア
   */
  const clearIntegrationHistory = useCallback(() => {
    setIntegrationHistory([]);
    setDataBackup(null);
  }, []);

  return {
    // 主要機能
    integrateYAMLData,
    rollbackToBackup,
    createDataBackup,
    clearIntegrationHistory,

    // 状態
    isIntegrating,
    integrationHistory,
    lastIntegrationResult,
    hasBackup: Boolean(dataBackup),

    // 統計情報
    totalIntegrations: integrationHistory.length,
    successfulIntegrations: integrationHistory.filter(h => h.result?.success).length,
    failedIntegrations: integrationHistory.filter(h => h.result?.success === false).length
  };
};

export default useYAMLIntegration;