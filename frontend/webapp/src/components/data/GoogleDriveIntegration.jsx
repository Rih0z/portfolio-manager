/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/data/GoogleDriveIntegration.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 更新日: 2025-05-19 13:15:00
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho バックエンド連携型認証に対応
 * - 2025-05-19 13:15:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * Google Driveとの連携機能を提供するコンポーネント。
 * ポートフォリオデータのクラウド保存、読み込み、同期機能を実装。
 * データソースの状態表示や最終同期時間の表示も行う。
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { logCookieStatus, testCookieSettings } from '../../utils/cookieDebugUtils';

const GoogleDriveIntegration = () => {
  const { isAuthenticated, user, hasDriveAccess, initiateDriveAuth } = useAuth();
  const { 
    listFiles, 
    saveFile, 
    loadFile, 
    loading, 
    error 
  } = useGoogleDrive();
  
  const { 
    currentAssets, 
    targetPortfolio, 
    baseCurrency, 
    additionalBudget,
    aiPromptTemplate,
    saveToLocalStorage
  } = usePortfolioContext();
  
  const [files, setFiles] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [operationResult, setOperationResult] = useState(null);
  
  // ファイル一覧を取得
  const fetchFiles = async () => {
    if (!isAuthenticated) return;
    
    const filesList = await listFiles();
    if (filesList) {
      setFiles(filesList);
    }
  };
  
  // 初期ロード時にファイル一覧を取得
  useEffect(() => {
    if (isAuthenticated && hasDriveAccess) {
      fetchFiles();
    }
  }, [isAuthenticated, hasDriveAccess]);
  
  // クラウドに保存
  const handleSaveToCloud = async () => {
    setSyncStatus('saving');
    setOperationResult(null);
    
    // ポートフォリオデータの構築
    const portfolioData = {
      baseCurrency,
      currentAssets,
      targetPortfolio,
      additionalBudget,
      aiPromptTemplate,
      timestamp: new Date().toISOString(),
      version: '6.0'
    };
    
    const result = await saveFile(portfolioData);
    if (result) {
      setSyncStatus('success');
      setLastSync(new Date());
      setOperationResult({
        success: true,
        message: 'Google Driveへの保存が完了しました',
        details: result
      });
    } else {
      setSyncStatus('error');
      setOperationResult({
        success: false,
        message: '保存中にエラーが発生しました',
        details: error
      });
    }
  };
  
  // ファイルから読み込み
  const handleLoadFile = async (fileId) => {
    setSyncStatus('loading');
    setOperationResult(null);
    
    const data = await loadFile(fileId);
    if (data) {
      // ポートフォリオコンテキストのデータを更新
      // 注：実際の実装ではportfolioContextのloadFromCloudのような関数を呼び出すべき
      
      setSyncStatus('success');
      setLastSync(new Date());
      setOperationResult({
        success: true,
        message: 'Google Driveからデータを読み込みました',
        details: {
          filename: files.find(f => f.id === fileId)?.name || 'Unknown file',
          timestamp: data.timestamp
        }
      });
      
      // ローカルストレージにも保存
      saveToLocalStorage();
    } else {
      setSyncStatus('error');
      setOperationResult({
        success: false,
        message: '読み込み中にエラーが発生しました',
        details: error
      });
    }
  };
  
  // 未認証時の表示
  if (!isAuthenticated) {
    return (
      <div className="google-drive-integration">
        <h2>Google Drive連携</h2>
        <p>Google Driveと連携するにはログインしてください。</p>
      </div>
    );
  }
  
  return (
    <div className="google-drive-integration">
      <h2>Google Drive連携</h2>
      
      {/* ユーザー情報 */}
      <div className="user-info">
        {user?.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
        <span>{user?.name || 'ユーザー'}としてログイン中</span>
      </div>
      
      {/* Drive API認証チェック - 通常は表示されないはず（ログイン時にDrive権限が必須のため） */}
      {!hasDriveAccess && (
        <div className="drive-auth-required bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p className="mb-2">Google Driveへのアクセス権限がありません。</p>
          <p className="mb-2 text-sm">アプリケーションを正常に使用するには、再度ログインしてGoogle Driveへのアクセスを許可してください。</p>
          <button
            onClick={() => {
              // 新しいOAuth認証フローで再ログインを促す
              const getRedirectUri = () => {
                const baseUrl = window.location.origin;
                return `${baseUrl}/auth/google/callback`;
              };
              
              const redirectUri = getRedirectUri();
              const scopes = [
                'openid',
                'email', 
                'profile',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive.appdata'
              ].join(' ');
              
              const params = new URLSearchParams({
                client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: scopes,
                access_type: 'offline',
                prompt: 'consent'
              });
              
              console.log('Redirect URI for re-login:', redirectUri); // デバッグ用
              window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            再度ログインする（Drive権限付き）
          </button>
        </div>
      )}
      
      {/* 操作ボタン */}
      {hasDriveAccess && (
        <div className="drive-actions">
          <button 
            onClick={handleSaveToCloud} 
            disabled={loading || syncStatus === 'saving'}
            className="btn btn-primary"
          >
            {loading && syncStatus === 'saving' ? '保存中...' : 'Google Driveに保存'}
          </button>
          
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="btn btn-secondary"
          >
            ファイル一覧更新
          </button>
        </div>
      )}
      
      {/* 同期ステータス */}
      {lastSync && (
        <div className="sync-status">
          <p>最終同期: {lastSync.toLocaleString()}</p>
        </div>
      )}
      
      {/* 操作結果 */}
      {operationResult && (
        <div className={`operation-result ${operationResult.success ? 'success' : 'error'}`}>
          <p>{operationResult.message}</p>
          {operationResult.details && (
            <pre>{JSON.stringify(operationResult.details, null, 2)}</pre>
          )}
        </div>
      )}
      
      {/* ファイル一覧 */}
      {hasDriveAccess && (
        <div className="files-list">
          <h3>保存済みファイル</h3>
        {loading && syncStatus === 'loading' ? (
          <p>ファイル読み込み中...</p>
        ) : files.length === 0 ? (
          <p>保存されたファイルはありません</p>
        ) : (
          <ul>
            {files.map(file => (
              <li key={file.id} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-date">{new Date(file.createdAt).toLocaleString()}</span>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => handleLoadFile(file.id)}
                    disabled={loading}
                    className="btn btn-sm"
                  >
                    読み込む
                  </button>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-link"
                    >
                      表示
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      )}
      
      {/* エラー表示 */}
      {error && (
        <div className="error-message">
          <p>エラー: {error}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveIntegration;
