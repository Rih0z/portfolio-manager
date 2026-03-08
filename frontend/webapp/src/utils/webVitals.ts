/**
 * Web Vitals 計測
 *
 * Core Web Vitals (CLS, INP, LCP) + FCP, TTFB を計測し、
 * 既存の trackEvent() 経由で GA4 に送信する。
 */

import type { Metric } from 'web-vitals';
import { trackEvent } from './analytics';

/**
 * Web Vitals メトリクスを GA4 に送信するハンドラ
 */
function sendToAnalytics(metric: Metric): void {
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    metric_id: metric.id,
    metric_delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    navigation_type: metric.navigationType,
  });
}

/**
 * Web Vitals の計測を開始する
 * 本番環境でのみ実行される（web-vitals は動的 import で遅延ロード）
 */
export async function reportWebVitals(): Promise<void> {
  // 開発環境ではスキップ
  if (import.meta.env.DEV) return;

  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');

    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch {
    // web-vitals のロードに失敗してもアプリに影響を与えない
  }
}
