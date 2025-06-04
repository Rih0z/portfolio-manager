/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/settings/ResetSettings.jsx
 * 
 * 作成者: Claude
 * 作成日: 2025-02-06
 * 
 * 説明: 
 * 設定のリセット機能を提供するコンポーネント。
 * 現在の保有資産と理想のポートフォリオの両方をリセットする。
 * リセット後は初期設定ウィザードが表示される。
 */

import React, { useState, useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';
import ModernButton from '../common/ModernButton';
import ModernCard from '../common/ModernCard';

const ResetSettings = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const {
    clearLocalStorage,
    addNotification,
    currentAssets,
    targetPortfolio
  } = useContext(PortfolioContext);

  const hasData = currentAssets.length > 0 || targetPortfolio.length > 0;

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // ローカルストレージをクリア
      clearLocalStorage();
      
      // 成功通知
      addNotification('すべての設定をリセットしました。ページを再読み込みします。', 'success');
      
      // 1秒後にページをリロード
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('設定のリセットに失敗しました:', error);
      addNotification('設定のリセットに失敗しました', 'error');
      setIsResetting(false);
    }
  };

  return (
    <ModernCard className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">設定のリセット</h2>
          <p className="text-gray-600 text-sm">
            すべての保有資産、目標配分、AI設定をリセットします。
            この操作は取り消せません。
          </p>
        </div>

        {hasData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-yellow-800 text-sm">
              <strong>警告:</strong> 現在設定されている以下のデータがすべて削除されます：
            </p>
            <ul className="list-disc list-inside text-yellow-700 text-sm mt-2">
              {currentAssets.length > 0 && (
                <li>{currentAssets.length}件の保有資産データ</li>
              )}
              {targetPortfolio.length > 0 && (
                <li>{targetPortfolio.length}件の目標配分設定</li>
              )}
              <li>AI分析プロンプト設定</li>
              <li>その他すべての設定</li>
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <ModernButton
            variant="danger"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isResetting}
          >
            設定をリセット
          </ModernButton>
        </div>
      </div>

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">本当にリセットしますか？</h3>
            <p className="text-gray-600 mb-6">
              この操作により、すべての設定データが削除されます。
              削除されたデータは復元できません。
            </p>
            
            <div className="flex space-x-3 justify-end">
              <ModernButton
                variant="secondary"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isResetting}
              >
                キャンセル
              </ModernButton>
              <ModernButton
                variant="danger"
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleReset();
                }}
                loading={isResetting}
                loadingText="リセット中..."
              >
                リセットする
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </ModernCard>
  );
};

export default ResetSettings;