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

/**
 * エラーバウンダリーコンポーネント
 * React内の予期せぬエラーをキャッチし、フォールバックUIを表示する
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error) {
    // エラー発生時の状態を更新
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // エラー情報をログに記録
    console.error('Component error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // エラー情報を収集サービスに送信するなどの処理を追加可能
  }
  
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
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50 my-4">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            コンポーネントの読み込み中にエラーが発生しました
          </h2>
          <p className="text-red-600 mb-4">
            {error && error.toString()}
          </p>
          <details className="text-sm text-gray-700">
            <summary>詳細を表示</summary>
            <pre className="mt-2 whitespace-pre-wrap overflow-auto p-2 bg-gray-100 rounded">
              {errorInfo && errorInfo.componentStack}
            </pre>
          </details>
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

