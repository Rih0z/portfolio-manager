/**
 * アラートルール管理パネル
 *
 * 設定ページに埋め込まれるアラートルール一覧管理UI。
 * ルールの有効/無効切替、削除、新規追加ダイアログの起動、
 * プラン制限の表示を行う。
 *
 * @file src/components/notifications/AlertRulesManager.tsx
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlertRules, useDeleteAlertRule, useUpdateAlertRule, useIsPremium } from '../../hooks/queries';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import UpgradePrompt from '../common/UpgradePrompt';
import PriceAlertDialog from './PriceAlertDialog';
import type { AlertRule, AlertRuleType } from '../../types/notification.types';
import { NOTIFICATION_LIMITS } from '../../types/notification.types';
import { cn } from '../../lib/utils';

// ─── Helpers ──────────────────────────────────────────

/** アラートタイプの日本語ラベル */
function getAlertTypeLabel(type: AlertRuleType): string {
  switch (type) {
    case 'price_above':
      return '価格上昇';
    case 'price_below':
      return '価格下落';
    case 'rebalance_drift':
      return 'リバランス乖離';
    default:
      return type;
  }
}

/** アラートタイプのバッジバリアント */
function getAlertTypeBadgeVariant(
  type: AlertRuleType
): 'default' | 'success' | 'danger' | 'warning' {
  switch (type) {
    case 'price_above':
      return 'success';
    case 'price_below':
      return 'danger';
    case 'rebalance_drift':
      return 'warning';
    default:
      return 'default';
  }
}

// ─── Component ────────────────────────────────────────

const AlertRulesManager: React.FC = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: alertRules = [], isPending: loading } = useAlertRules();
  const deleteAlertRuleMutation = useDeleteAlertRule();
  const updateAlertRuleMutation = useUpdateAlertRule();

  const isPremium = useIsPremium();

  const maxRules = isPremium
    ? NOTIFICATION_LIMITS.STANDARD.maxAlertRules
    : NOTIFICATION_LIMITS.FREE.maxAlertRules;
  const currentCount = alertRules.length;
  const limitReached = currentCount >= maxRules;

  // ─── Handlers ─────────────────────────────────────

  const handleToggleEnabled = useCallback(
    (rule: AlertRule) => {
      updateAlertRuleMutation.mutate({ ruleId: rule.ruleId, updates: { enabled: !rule.enabled } });
    },
    [updateAlertRuleMutation]
  );

  const handleDelete = useCallback(
    (ruleId: string) => {
      deleteAlertRuleMutation.mutate(ruleId);
    },
    [deleteAlertRuleMutation]
  );

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <Card padding="none" data-testid="alert-rules-manager">
      <CardHeader className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t('notifications.alertRules', 'アラートルール')}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {currentCount}/{maxRules}{' '}
            {t('notifications.rulesUsed', 'ルール使用中')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-4 space-y-3">
        {/* Upgrade prompt when limit reached on Free plan */}
        {limitReached && !isPremium && (
          <UpgradePrompt
            feature={t('notifications.alertRules', 'アラートルール')}
            current={currentCount}
            limit={maxRules}
          />
        )}

        {/* Alert rules list */}
        {alertRules.length === 0 ? (
          <div className="text-center py-6">
            <svg
              className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              {t('notifications.noRules', 'アラートルールはありません')}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t(
                'notifications.noRulesHint',
                '「追加」ボタンからアラートルールを設定できます'
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {alertRules.map((rule) => (
              <div
                key={rule.ruleId}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 sm:px-4',
                  'min-h-[44px]',
                  !rule.enabled && 'opacity-60'
                )}
                data-testid="alert-rule-item"
              >
                {/* Rule info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {rule.ticker}
                    </span>
                    <Badge variant={getAlertTypeBadgeVariant(rule.type)}>
                      {getAlertTypeLabel(rule.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rule.type === 'rebalance_drift'
                      ? `${t('notifications.threshold', '閾値')}: ${rule.targetValue}%`
                      : `${t('notifications.target', '目標')}: ${rule.targetValue.toLocaleString()}`}
                  </p>
                </div>

                {/* Enable/disable switch */}
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => handleToggleEnabled(rule)}
                  disabled={loading}
                  id={`rule-toggle-${rule.ruleId}`}
                  aria-label={t(
                    'notifications.toggleRule',
                    '{{ticker}} のアラートを切替',
                    { ticker: rule.ticker }
                  )}
                />

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(rule.ruleId)}
                  disabled={loading}
                  className={cn(
                    'flex-shrink-0 p-1.5 rounded-md text-muted-foreground',
                    'hover:text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-900/30',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'min-h-[36px] min-w-[36px] flex items-center justify-center',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label={t('notifications.deleteRule', '{{ticker}} のアラートを削除', {
                    ticker: rule.ticker,
                  })}
                  data-testid="alert-rule-delete"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add rule button */}
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={handleOpenDialog}
          disabled={limitReached && !isPremium}
          data-testid="add-alert-rule-button"
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          {t('notifications.addRule', '追加')}
        </Button>
      </CardContent>

      {/* Price alert creation dialog */}
      <PriceAlertDialog isOpen={isDialogOpen} onClose={handleCloseDialog} />
    </Card>
  );
};

export default AlertRulesManager;
