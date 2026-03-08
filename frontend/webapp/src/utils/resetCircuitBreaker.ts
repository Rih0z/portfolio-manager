/**
 * サーキットブレーカーリセット用ユーティリティ
 * デバッグ用にwindowオブジェクトに公開
 */

import { resetAllCircuitBreakers } from './apiUtils';
import logger from './logger';

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).resetCircuitBreakers = (): void => {
    resetAllCircuitBreakers();
    logger.debug('All circuit breakers have been reset');
  };

  logger.debug('Circuit breaker reset function available: window.resetCircuitBreakers()');
}

export { resetAllCircuitBreakers };
