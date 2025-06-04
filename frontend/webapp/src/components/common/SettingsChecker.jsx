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
import { PortfolioContext } from '../../context/PortfolioContext';
import InitialSetupWizard from './InitialSetupWizard';

const SettingsChecker = ({ children }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  
  const { 
    currentAssets,
    targetPortfolio,
    additionalBudget
  } = useContext(PortfolioContext);

  useEffect(() => {
    // 初回チェック時のみ実行
    if (!hasChecked) {
      // 設定が何もない場合はウィザードを表示
      const hasNoSettings = 
        currentAssets.length === 0 && 
        targetPortfolio.length === 0 &&
        (!additionalBudget || additionalBudget.amount === 0);
      
      setShowWizard(hasNoSettings);
      setHasChecked(true);
    }
  }, [currentAssets, targetPortfolio, additionalBudget, hasChecked]);

  const handleWizardComplete = () => {
    setShowWizard(false);
  };

  return (
    <>
      {showWizard && <InitialSetupWizard onComplete={handleWizardComplete} />}
      {children}
    </>
  );
};

export default SettingsChecker;