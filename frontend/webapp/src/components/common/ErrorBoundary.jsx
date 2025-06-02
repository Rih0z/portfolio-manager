/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/common/ErrorBoundary.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * Reactのエラーバウンダリコンポーネント。
 * 子コンポーネントで発生した例外をキャッチし、アプリケーション全体のクラッシュを防止する。
 * フォールバックUIの表示と再読み込み機能を提供する。
 */
// src/components/common/ErrorBoundary.jsx

import React, { Component } from 'react';
import { logErrorToService, sanitizeError } from '../../utils/errorHandler';

/**
 * 現代的なエラーバウンダリーコンポーネント
 * React内の予期せぬエラーをキャッチし、フォールバックUIを表示する
 * React 18対応、エラー詳細情報の表示制御、自動リトライ機能を含む
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error) {
    // エラー発生時の状態を更新（React 18対応）
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // エラー情報をログに記録（非同期で処理）
    this.logErrorAsync(error, errorInfo);
    this.setState({ errorInfo });
  }

  // エラーログを非同期で処理
  logErrorAsync = async (error, errorInfo) => {
    try {
      await logErrorToService(error, errorInfo);
    } catch (loggingError) {
      // ログ送信に失敗した場合はコンソールにフォールバック
      console.error('エラーログの送信に失敗:', loggingError);
      console.error('元のエラー:', error);
    }
  };
  
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;
    
    if (hasError) {
      // カスタムフォールバックが提供されている場合はそれを使用
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, errorInfo, this.resetError)
          : fallback;
      }
      
      // デフォルトのエラー表示
      const sanitized = sanitizeError(error);
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50 my-4">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-red-600 mb-4">
            {sanitized.message}
          </p>
          {isDevelopment && (
            <details className="text-sm text-gray-700">
              <summary>詳細を表示</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-auto p-2 bg-gray-100 rounded">
                {error && error.toString()}
                {errorInfo && errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={this.resetError}
          >
            再読み込み
          </button>
        </div>
      );
    }
    
    return children;
  }
  
  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
}

export default ErrorBoundary;

