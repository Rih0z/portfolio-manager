/**
 * lazyWithRetry
 *
 * React.lazy のラッパー。チャンクロード失敗時にリトライし、
 * それでも失敗した場合はリロードを促すフォールバックコンポーネントを返す。
 *
 * @file src/utils/lazyWithRetry.ts
 */
import { lazy, type ComponentType } from 'react';
import logger from './logger';

type LazyImportFn = () => Promise<{ default: ComponentType<any> }>;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function lazyWithRetry(importFn: LazyImportFn): ReturnType<typeof lazy> {
  return lazy(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await wait(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        // All retries exhausted — return fallback component
        logger.error('チャンクロード失敗（リトライ上限到達）:', error);
        return {
          default: () => {
            const handleReload = () => window.location.reload();
            return (
              <div
                data-testid="chunk-error-fallback"
                className="flex items-center justify-center min-h-[200px] py-12"
              >
                <div className="text-center max-w-sm px-4">
                  <p className="text-foreground font-semibold mb-2">
                    ページの読み込みに失敗しました
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ネットワーク接続を確認して、もう一度お試しください。
                  </p>
                  <button
                    onClick={handleReload}
                    className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                  >
                    リロードする
                  </button>
                </div>
              </div>
            );
          },
        };
      }
    }
    // TypeScript: unreachable but required for return type
    throw new Error('Unexpected: retry loop exited without result');
  });
}
