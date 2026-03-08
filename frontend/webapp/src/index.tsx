/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/index.tsx
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
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import logger, { replaceConsoleLog } from './utils/logger';
import { initSentry } from './utils/sentry';
import { reportWebVitals } from './utils/webVitals';

// 開発環境でのテスト機能の現代化
const loadDevelopmentFeatures = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      // 遅延読み込みで循環依存を回避
      setTimeout(async () => {
        try {
          await import('./utils/resetCircuitBreaker');
          await import('./utils/fixExchangeRate');
        } catch (error) {
          logger.warn('開発機能の読み込みに失敗しました:', error);
        }
      }, 2000);
    } catch (error) {
      logger.warn('開発機能の読み込みに失敗しました:', error);
    }
  }
};

// Sentry エラー監視の初期化（React render 前）
initSentry();

// 本番環境でログをフィルタリング
try {
  replaceConsoleLog();
} catch (error) {
  logger.warn('Logger setup failed:', error);
}

// グローバルエラーハンドラーの設定
import { setupGlobalErrorHandlers } from './utils/errorHandler';
try {
  setupGlobalErrorHandlers();
} catch {
  // セットアップ失敗時はサイレントフォールバック
}

// React 18の推奨レンダリング方法を使用
const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 開発機能の非同期読み込み
loadDevelopmentFeatures();

// Web Vitals 計測（本番のみ、非同期で遅延ロード）
reportWebVitals();
