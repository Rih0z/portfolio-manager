/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/index.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2025-05-12 14:30:00 Koki Riho コメント修正
 * 
 * 説明: 
 * アプリケーションのエントリーポイント。
 * React DOMを使用してAppコンポーネントをルートDOMノードにレンダリングする。
 * また、パフォーマンス測定のためのWeb Vitalsレポート機能を含む。
 */

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// import './utils/resetCircuitBreaker'; // サーキットブレーカーリセット機能
// import './utils/fixExchangeRate'; // 為替レート修復機能
import { replaceConsoleLog } from './utils/logger'; // ログフィルタリング
// import { setupGlobalErrorHandlers } from './utils/errorHandler'; // エラーハンドリング

// 開発環境でのテスト機能の現代化
const loadDevelopmentFeatures = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      // 遅延読み込みで循環依存を回避
      setTimeout(async () => {
        try {
          await import('./services/testJapaneseTickers');
          await import('./utils/resetCircuitBreaker');
          await import('./utils/fixExchangeRate');
        } catch (error) {
          console.warn('開発機能の読み込みに失敗しました:', error);
        }
      }, 2000);
    } catch (error) {
      console.warn('開発機能の読み込みに失敗しました:', error);
    }
  }
};

// 本番環境でログをフィルタリング
try {
  replaceConsoleLog();
} catch (error) {
  console.warn('Logger setup failed:', error);
}

// グローバルエラーハンドラーの設定
// try {
//   setupGlobalErrorHandlers();
// } catch (error) {
//   console.warn('Error handler setup failed:', error);
// }

// React 18の安定したレンダリング方法を使用
const container = document.getElementById('root');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  container
);

// 開発機能の非同期読み込み
loadDevelopmentFeatures();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
