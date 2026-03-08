/**
 * Sentry エラー監視統合（Free Tier）
 *
 * 本番環境でのみ初期化。センシティブデータを beforeSend でスクラブし、
 * 無料枠（5K errors/月）を超えないよう tracesSampleRate: 0.1 に設定。
 */

import * as Sentry from '@sentry/react';

/** Sentry の初期化状態 */
let sentryInitialized = false;

/** センシティブなヘッダー・Cookie をスクラブするキーのパターン */
const SENSITIVE_KEYS = /^(authorization|cookie|set-cookie|x-api-key|x-csrf-token|session|token)$/i;

/**
 * Sentry を初期化する（本番環境のみ）
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // DSN が設定されていない or 開発環境ではスキップ
  if (!dsn || import.meta.env.DEV) {
    return;
  }

  if (sentryInitialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    release: import.meta.env.VITE_APP_VERSION || undefined,

    // 無料枠節約: 10% サンプリング
    tracesSampleRate: 0.1,

    // セッションリプレイは無効（無料枠節約）
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // ノイズとなるエラーを無視
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network Error',
      'Load failed',
      'Failed to fetch',
      'ChunkLoadError',
      'Loading chunk',
      // Google OAuth 関連
      'Script error.',
      'Non-Error promise rejection captured',
    ],

    // センシティブデータのスクラブ
    beforeSend(event) {
      // リクエストヘッダーからセンシティブ情報を除去
      if (event.request?.headers) {
        const headers = event.request.headers;
        for (const key of Object.keys(headers)) {
          if (SENSITIVE_KEYS.test(key)) {
            headers[key] = '[FILTERED]';
          }
        }
      }

      // Cookie を除去
      if (event.request?.cookies) {
        event.request.cookies = {};
      }

      // ユーザー情報からセンシティブデータを除去（email は保持）
      if (event.user) {
        delete (event.user as any).ip_address;
      }

      return event;
    },

    // breadcrumb からセンシティブ情報を除去
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        // Authorization ヘッダーを含むリクエストの詳細を除去
        if (breadcrumb.data) {
          delete breadcrumb.data.request_body;
          delete breadcrumb.data.response_body;
        }
      }
      return breadcrumb;
    },
  });

  sentryInitialized = true;
}

/**
 * Sentry にユーザー情報を設定する
 */
export function setSentryUser(user: { id?: string; email?: string } | null): void {
  if (!sentryInitialized) return;

  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Sentry にエラーを送信する
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): void {
  if (!sentryInitialized) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Sentry にメッセージを送信する
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (!sentryInitialized) return;

  Sentry.captureMessage(message, level);
}

/**
 * Sentry が初期化済みかどうかを返す
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}
