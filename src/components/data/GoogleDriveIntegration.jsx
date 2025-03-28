import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const GoogleDriveIntegration = () => {
  const { user, saveToDrive, loadFromDrive, synchronizeData } = useAuth();
  const { 
    exportData, 
    importData, 
    dataSource, 
    lastSyncTime, 
    saveToLocalStorage
  } = usePortfolioContext();
  
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false);

  // 最終同期時間のフォーマット
  const formatSyncTime = (timeString) => {
    if (!timeString) return 'なし';
    
    const date = new Date(timeString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // ステータスメッセージの表示
  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => {
      setStatusMessage('');
      setStatusType('');
    }, 5000);
  };

  // Googleドライブにデータを保存
  const handleSaveToGoogleDrive = async () => {
    try {
      setIsLoading(true);
      
      // ポートフォリオデータの取得
      const portfolioData = exportData();
      
      // Googleドライブに保存
      const result = await saveToDrive(portfolioData);
      
      if (result.success) {
        showStatus(result.message || 'データをGoogleドライブに保存しました', 'success');
      } else {
        showStatus(result.message || 'データの保存に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Google Drive save error:', error);
      showStatus('Googleドライブへの保存中にエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Googleドライブからデータを読み込み
  const handleLoadFromGoogleDrive = async () => {
    try {
      setIsLoading(true);
      
      // Googleドライブからデータを読み込み
      const result = await loadFromDrive();
      
      if (result.success && result.data) {
        // データをインポート
        const importResult = importData(result.data);
        
        if (importResult.success) {
          showStatus('Googleドライブからデータを読み込みました', 'success');
          
          // ローカルストレージにも保存
          saveToLocalStorage();
        } else {
          showStatus(importResult.message || 'データのインポートに失敗しました', 'error');
        }
      } else {
        showStatus(result.message || 'データの読み込みに失敗しました', 'error');
      }
    } catch (error) {
      console.error('Google Drive load error:', error);
      showStatus('Googleドライブからの読み込み中にエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // データ同期の実行
  const handleSynchronize = async () => {
    try {
      setIsLoading(true);
      
      // データ同期を実行
      const result = await synchronizeData();
      
      if (result && result.success) {
        showStatus(result.message || 'データを同期しました', 'success');
      } else {
        showStatus(result?.message || 'データの同期に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Data synchronization error:', error);
      showStatus('データ同期中にエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 mb-2">
          Googleドライブ連携を使用するにはログインしてください。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <img
          src={user.picture}
          alt={user.name}
          className="w-8 h-8 rounded-full mr-2"
        />
        <p className="text-sm text-gray-700">
          {user.name} としてログイン中
        </p>
      </div>
      
      {/* データ同期ステータス */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <h3 className="text-md font-medium mb-2">同期ステータス</h3>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="text-gray-600">データソース:</div>
          <div>
            {dataSource === 'cloud' ? (
              <span className="text-blue-600 flex items-center">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                クラウド
              </span>
            ) : (
              <span className="text-amber-600 flex items-center">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                ローカル
              </span>
            )}
          </div>
          
          <div className="text-gray-600">最終同期:</div>
          <div>{formatSyncTime(lastSyncTime)}</div>
        </div>
        
        <button
          onClick={handleSynchronize}
          disabled={isLoading}
          className={`w-full ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white px-4 py-2 rounded mb-2`}
        >
          {isLoading ? '同期中...' : 'クラウドとローカルのデータを同期'}
        </button>
        
        <p className="text-xs text-gray-500">
          クラウドとローカルのデータを比較し、最新のデータを反映します。
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-md font-medium mb-2">データを保存</h3>
          <p className="text-sm text-gray-600 mb-3">
            現在のポートフォリオデータをGoogleドライブに保存します。
          </p>
          <button
            onClick={handleSaveToGoogleDrive}
            disabled={isLoading}
            className={`w-full ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded`}
          >
            {isLoading ? '保存中...' : 'Googleドライブに保存'}
          </button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-md font-medium mb-2">データを読み込み</h3>
          <p className="text-sm text-gray-600 mb-3">
            Googleドライブに保存されたポートフォリオデータを読み込みます。
          </p>
          <button
            onClick={handleLoadFromGoogleDrive}
            disabled={isLoading}
            className={`w-full ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded`}
          >
            {isLoading ? '読み込み中...' : 'Googleドライブから読み込み'}
          </button>
        </div>
      </div>
      
      {/* ステータスメッセージの表示 */}
      {statusMessage && (
        <div className={`mt-4 p-3 rounded text-sm ${
          statusType === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default GoogleDriveIntegration;
