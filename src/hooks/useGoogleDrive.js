/**
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/hooks/useGoogleDrive.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 12:00:00 
 * 
 * 更新履歴: 
 * - 2025-05-19 12:00:00 System Admin 初回作成
 * 
 * 説明: 
 * Google Driveとの連携機能を提供するReactカスタムフック。
 * ファイル一覧取得、ファイル保存、ファイル読み込みなどの
 * Google Drive連携機能をコンポーネントで簡単に利用できるように提供します。
 */

import { useState, useCallback } from 'react';
import { fetchDriveFiles, saveToDrive, loadFromDrive } from '../services/googleDriveService';
import { useAuth } from './useAuth';

export const useGoogleDrive = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ファイル一覧取得
  const listFiles = useCallback(async () => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchDriveFiles();
      
      if (result.success) {
        return result.files;
      } else {
        setError(result.error || '不明なエラー');
        
        // Drive OAuth認証が必要な場合
        if (result.needsDriveAuth && result.authUrl) {
          console.log('Drive API認証が必要です。リダイレクトします。');
          window.location.href = result.authUrl;
        }
        
        return null;
      }
    } catch (error) {
      console.error('Google Driveファイル一覧取得エラー:', error);
      setError(error.message || 'ファイル一覧取得エラー');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // ファイル保存
  const saveFile = useCallback(async (portfolioData) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await saveToDrive(portfolioData);
      
      if (result.success) {
        return result.file;
      } else {
        setError(result.error || '不明なエラー');
        
        // Drive OAuth認証が必要な場合
        if (result.needsDriveAuth && result.authUrl) {
          console.log('Drive API認証が必要です。リダイレクトします。');
          window.location.href = result.authUrl;
        } else if (result.needsAuth) {
          // 通常の認証が必要な場合の処理
        }
        
        return null;
      }
    } catch (error) {
      console.error('Google Driveファイル保存エラー:', error);
      setError(error.message || 'ファイル保存エラー');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // ファイル読み込み
  const loadFile = useCallback(async (fileId) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await loadFromDrive(fileId);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error || '不明なエラー');
        
        // Drive OAuth認証が必要な場合
        if (result.needsDriveAuth && result.authUrl) {
          console.log('Drive API認証が必要です。リダイレクトします。');
          window.location.href = result.authUrl;
        } else if (result.needsAuth) {
          // 通常の認証が必要な場合の処理
        }
        
        return null;
      }
    } catch (error) {
      console.error('Google Driveファイル読み込みエラー:', error);
      setError(error.message || 'ファイル読み込みエラー');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  return {
    listFiles,
    saveFile,
    loadFile,
    loading,
    error
  };
};

export default useGoogleDrive;
