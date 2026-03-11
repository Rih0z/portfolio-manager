/**
 * useAlertEvaluation — 市場データ更新時にアラート評価を実行するフック
 *
 * portfolioStore.lastUpdated の変更を監視し、
 * アラートルールと現在の資産データを比較して通知を生成する。
 *
 * @file src/hooks/useAlertEvaluation.ts
 */
import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useGoalStore } from '../stores/goalStore';
import { useAuthStore } from '../stores/authStore';

/**
 * 市場データ更新時にアラートルールを評価し、条件一致時に通知を生成する。
 * App.tsx の認証後に呼び出す。
 */
export const useAlertEvaluation = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastUpdated = usePortfolioStore((s) => s.lastUpdated);
  const currentAssets = usePortfolioStore((s) => s.currentAssets);
  const targetPortfolio = usePortfolioStore((s) => s.targetPortfolio);
  const baseCurrency = usePortfolioStore((s) => s.baseCurrency);
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate);
  const goals = useGoalStore((s) => s.goals);
  const evaluateAlerts = useNotificationStore((s) => s.evaluateAlerts);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const fetchAlertRules = useNotificationStore((s) => s.fetchAlertRules);

  const hasInitialized = useRef(false);

  // 認証時にサーバーから通知・ルールを取得
  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchNotifications(true);
      fetchAlertRules();
    }
    if (!isAuthenticated) {
      hasInitialized.current = false;
    }
  }, [isAuthenticated, fetchNotifications, fetchAlertRules]);

  // 市場データ更新時にアラート評価
  useEffect(() => {
    if (!isAuthenticated || !lastUpdated || currentAssets.length === 0) return;

    // 総資産額を計算（baseCurrency に換算）
    const rate = exchangeRate?.rate || 150;
    const totalValue = currentAssets.reduce((sum: number, asset: any) => {
      let value = (asset.price || 0) * (asset.holdings || 0);
      if (asset.currency && asset.currency !== baseCurrency) {
        if (asset.currency === 'USD' && baseCurrency === 'JPY') value *= rate;
        else if (asset.currency === 'JPY' && baseCurrency === 'USD') value /= rate;
      }
      return sum + value;
    }, 0);

    evaluateAlerts({
      currentAssets,
      targetPortfolio,
      goals,
      totalValue,
      exchangeRate: exchangeRate?.rate || 150,
      baseCurrency,
    });
  }, [lastUpdated]); // eslint-disable-line react-hooks/exhaustive-deps
};
