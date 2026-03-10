/**
 * 通知設定パネル
 *
 * 設定ページに埋め込まれる通知プリファレンスUI。
 * 通知タイプごとのオン/オフ切替、
 * リバランス閾値の設定（Standard プランのみ調整可能）を提供する。
 *
 * @file src/components/notifications/NotificationPreferences.tsx
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsPremium } from '../../hooks/queries';
import { NOTIFICATION_LIMITS } from '../../types/notification.types';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────

interface NotificationPrefs {
  priceAlerts: boolean;
  goalNotifications: boolean;
  rebalanceSuggestions: boolean;
  rebalanceThreshold: number;
}

// ─── Constants ────────────────────────────────────────

const STORAGE_KEY = 'pfwise-notification-prefs';

const DEFAULT_PREFS: NotificationPrefs = {
  priceAlerts: true,
  goalNotifications: true,
  rebalanceSuggestions: true,
  rebalanceThreshold: NOTIFICATION_LIMITS.FREE.rebalanceThreshold,
};

// ─── Helpers ──────────────────────────────────────────

function loadPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFS;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage が使えない環境ではサイレントフェイル
  }
}

// ─── Component ────────────────────────────────────────

const NotificationPreferences: React.FC = () => {
  const { t } = useTranslation();
  const premium = useIsPremium();

  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);

  // Persist on change
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  // ─── Handlers ─────────────────────────────────────

  const updatePref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleThresholdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (isNaN(val)) return;

      const clamped = Math.min(
        Math.max(val, NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin),
        NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMax
      );
      updatePref('rebalanceThreshold', clamped);
    },
    [updatePref]
  );

  // ─── Render ─────────────────────────────────────

  return (
    <Card padding="none" data-testid="notification-preferences">
      <CardHeader className="px-5 pt-5 pb-0">
        <CardTitle className="text-base">
          {t('notifications.preferences', '通知設定')}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 py-4 space-y-4">
        {/* Price alerts toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('notifications.priceAlerts', '価格アラート')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'notifications.priceAlertsDesc',
                '設定した価格に到達した時に通知を受け取ります'
              )}
            </p>
          </div>
          <Switch
            checked={prefs.priceAlerts}
            onCheckedChange={(v) => updatePref('priceAlerts', v)}
            id="pref-price-alerts"
            aria-label={t('notifications.priceAlerts', '価格アラート')}
          />
        </div>

        {/* Goal notifications toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('notifications.goalNotifications', '目標達成通知')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'notifications.goalNotificationsDesc',
                '投資目標を達成した時に通知を受け取ります'
              )}
            </p>
          </div>
          <Switch
            checked={prefs.goalNotifications}
            onCheckedChange={(v) => updatePref('goalNotifications', v)}
            id="pref-goal-notifications"
            aria-label={t('notifications.goalNotifications', '目標達成通知')}
          />
        </div>

        {/* Rebalance suggestions toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('notifications.rebalanceSuggestions', 'リバランス提案')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'notifications.rebalanceSuggestionsDesc',
                'ポートフォリオの配分が目標から乖離した時に通知を受け取ります'
              )}
            </p>
          </div>
          <Switch
            checked={prefs.rebalanceSuggestions}
            onCheckedChange={(v) => updatePref('rebalanceSuggestions', v)}
            id="pref-rebalance-suggestions"
            aria-label={t('notifications.rebalanceSuggestions', 'リバランス提案')}
          />
        </div>

        {/* Rebalance threshold setting */}
        <div
          className={cn(
            'rounded-lg border border-border p-3 space-y-2',
            !prefs.rebalanceSuggestions && 'opacity-50 pointer-events-none'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {t('notifications.rebalanceThreshold', 'リバランス閾値')}
            </p>
            {!premium && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {t('notifications.premiumOnly', 'Standard')}
              </span>
            )}
          </div>

          {premium ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin}
                  max={NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMax}
                  step={1}
                  value={prefs.rebalanceThreshold}
                  onChange={handleThresholdChange}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary-500"
                  aria-label={t('notifications.rebalanceThreshold', 'リバランス閾値')}
                  data-testid="rebalance-threshold-slider"
                />
                <Input
                  type="number"
                  min={NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin}
                  max={NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMax}
                  step={1}
                  value={prefs.rebalanceThreshold}
                  onChange={handleThresholdChange}
                  fullWidth={false}
                  className="w-16 text-center"
                  aria-label={t('notifications.thresholdValue', '閾値')}
                  data-testid="rebalance-threshold-input"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  'notifications.thresholdHint',
                  '{{min}}%〜{{max}}% の範囲で設定できます',
                  {
                    min: NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin,
                    max: NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMax,
                  }
                )}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground">
                {NOTIFICATION_LIMITS.FREE.rebalanceThreshold}%
                <span className="text-xs text-muted-foreground ml-2">
                  ({t('notifications.fixedForFree', '無料プランでは固定')})
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  'notifications.upgradeForCustom',
                  'Standard プランにアップグレードすると、{{min}}%〜{{max}}% の範囲でカスタマイズできます',
                  {
                    min: NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin,
                    max: NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMax,
                  }
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
