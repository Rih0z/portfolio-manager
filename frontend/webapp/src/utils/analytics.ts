import logger from './logger';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

let initialized = false;

export const AnalyticsEvents = {
  LOGIN: 'login',
  CSV_IMPORT: 'csv_import',
  LANDING_VIEW: 'landing_view',
  DASHBOARD_VIEW: 'dashboard_view',
  PRICING_VIEW: 'pricing_view',
  CHECKOUT_START: 'checkout_start',
  SIMULATION_RUN: 'simulation_run',
  PNL_VIEW: 'pnl_view',
  PORTFOLIO_SYNC: 'portfolio_sync',
  GOAL_CREATE: 'goal_create',
  GOAL_UPDATE: 'goal_update',
  GOAL_DELETE: 'goal_delete',
  // Phase 5-C-1: 通知
  ALERT_RULE_CREATE: 'alert_rule_create',
  ALERT_RULE_DELETE: 'alert_rule_delete',
  ALERT_TRIGGERED: 'alert_triggered',
  NOTIFICATION_READ: 'notification_read',
  // Phase 5-C-2: ソーシャル
  SHARE_CREATE: 'share_create',
  SHARE_VIEW: 'share_view',
  SHARE_DELETE: 'share_delete',
  PEER_COMPARISON_VIEW: 'peer_comparison_view',
  SHARE_CTA_CLICK: 'share_cta_click',
  // Phase 5-C-3: リファラル
  REFERRAL_CODE_COPY: 'referral_code_copy',
  REFERRAL_CODE_APPLY: 'referral_code_apply',
  REFERRAL_SIGNUP: 'referral_signup',
} as const;

/**
 * GA4を初期化する（本番環境のみ）
 */
export const initGA = (measurementId?: string): void => {
  const id = measurementId || import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id || initialized) return;

  // 開発環境ではスキップ
  if (import.meta.env.DEV) {
    logger.debug('[Analytics] Skipping GA4 initialization in development mode');
    return;
  }

  try {
    // gtag.js の動的インジェクト
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false // 手動でページビューを送信する
    });

    initialized = true;
  } catch (error) {
    logger.warn('[Analytics] Failed to initialize GA4:', error);
  }
};

/**
 * GA4イベントを送信する
 */
export const trackEvent = (name: string, params?: Record<string, any>): void => {
  if (!initialized || !window.gtag) return;

  try {
    window.gtag('event', name, params);
  } catch {
    // サイレントフェイル
  }
};

/**
 * ページビューを計測する
 */
export const trackPageView = (path: string): void => {
  if (!initialized || !window.gtag) return;

  try {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title
    });
  } catch {
    // サイレントフェイル
  }
};
