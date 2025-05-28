/**
 * サーキットブレーカーリセット用ユーティリティ
 * デバッグ用にwindowオブジェクトに公開
 */

import { resetAllCircuitBreakers } from './apiUtils';

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  window.resetCircuitBreakers = () => {
    resetAllCircuitBreakers();
    console.log('All circuit breakers have been reset');
  };
  
  console.log('Circuit breaker reset function available: window.resetCircuitBreakers()');
}

export { resetAllCircuitBreakers };