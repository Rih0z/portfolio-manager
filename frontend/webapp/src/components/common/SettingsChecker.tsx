/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/common/SettingsChecker.jsx
 * 
 * 作成者: Claude
 * 作成日: 2025-02-06
 * 
 * 説明: 
 * 設定の有無をチェックし、設定がない場合は初期設定ウィザードを表示する。
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../../context/PortfolioContext';

const SettingsChecker = ({ children }) => {
  const [hasChecked, setHasChecked] = useState(false);
  
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { 
    currentAssets,
    targetPortfolio,
    additionalBudget
  } = useContext(PortfolioContext);

  useEffect(() => {
    // 初回チェック時のみ実行
    if (!hasChecked) {
      try {
        // 設定が何もない場合はAIアドバイザーを表示
        const hasNoSettings = 
          currentAssets.length === 0 && 
          targetPortfolio.length === 0 &&
          (!additionalBudget || additionalBudget.amount === 0);
        
        // 初期設定完了フラグもチェック
        const initialSetupCompleted = localStorage.getItem('initialSetupCompleted');
        
        if (hasNoSettings && !initialSetupCompleted) {
          // AIアドバイザーページに直接遷移
          navigate('/ai-advisor');
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('SettingsChecker error:', error);
        setHasChecked(true);
      }
    }
  }, [currentAssets, targetPortfolio, additionalBudget, hasChecked, navigate]);

  // 設定がある場合は通常のアプリを表示
  return children;
};

export default SettingsChecker;