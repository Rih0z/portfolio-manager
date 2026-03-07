/**
 * 価格アラート作成ダイアログ
 *
 * 新しいアラートルールを作成するためのモーダルダイアログ。
 * アラートタイプ、ティッカー、目標値を入力し、
 * notificationStore.addAlertRule() で保存する。
 *
 * @file src/components/notifications/PriceAlertDialog.tsx
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../stores/notificationStore';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/input';
import type { AlertRuleType } from '../../types/notification.types';

// ─── Props ────────────────────────────────────────────

interface PriceAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Alert type options ───────────────────────────────

const ALERT_TYPE_OPTIONS = [
  { value: 'price_above', label: '価格が以上になった時' },
  { value: 'price_below', label: '価格が以下になった時' },
  { value: 'rebalance_drift', label: 'リバランス乖離' },
] as const;

// ─── Component ────────────────────────────────────────

const PriceAlertDialog: React.FC<PriceAlertDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const addAlertRule = useNotificationStore((s) => s.addAlertRule);

  // Form state
  const [type, setType] = useState<AlertRuleType>('price_above');
  const [ticker, setTicker] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ─── Validation ─────────────────────────────────────

  const validate = useCallback((): string[] => {
    const validationErrors: string[] = [];

    if (!type) {
      validationErrors.push(
        t('notifications.errors.typeRequired', 'アラートタイプを選択してください')
      );
    }

    const trimmedTicker = ticker.trim();
    if (!trimmedTicker) {
      validationErrors.push(
        t('notifications.errors.tickerRequired', 'ティッカーを入力してください')
      );
    }

    const numericValue = Number(targetValue);
    if (!targetValue || isNaN(numericValue) || numericValue <= 0) {
      validationErrors.push(
        t('notifications.errors.targetValueInvalid', '目標値は0より大きい数値を入力してください')
      );
    }

    return validationErrors;
  }, [type, ticker, targetValue, t]);

  // ─── Submit ─────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validate();
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setSubmitting(true);
      setErrors([]);

      try {
        const result = await addAlertRule({
          type,
          ticker: ticker.trim().toUpperCase(),
          targetValue: Number(targetValue),
          enabled: true,
        });

        if (result.success) {
          // Reset form and close
          setType('price_above');
          setTicker('');
          setTargetValue('');
          setErrors([]);
          onClose();
        } else {
          setErrors(
            result.errors || [
              result.limitReached
                ? t('notifications.errors.limitReached', 'アラートルール数の上限に達しています')
                : t('notifications.errors.createFailed', 'アラートルールの作成に失敗しました'),
            ]
          );
        }
      } catch {
        setErrors([
          t('notifications.errors.createFailed', 'アラートルールの作成に失敗しました'),
        ]);
      } finally {
        setSubmitting(false);
      }
    },
    [type, ticker, targetValue, validate, addAlertRule, onClose, t]
  );

  // ─── Close handler (reset form state) ───────────────

  const handleClose = useCallback(() => {
    setType('price_above');
    setTicker('');
    setTargetValue('');
    setErrors([]);
    onClose();
  }, [onClose]);

  // ─── Target value label ─────────────────────────────

  const targetLabel =
    type === 'rebalance_drift'
      ? t('notifications.thresholdPercent', '乖離閾値 (%)')
      : t('notifications.targetPrice', '目標価格');

  const targetPlaceholder =
    type === 'rebalance_drift' ? '5' : '150.00';

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <form onSubmit={handleSubmit} data-testid="price-alert-dialog">
        <DialogHeader onClose={handleClose}>
          <DialogTitle>
            {t('notifications.addAlert', 'アラートルールを追加')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Error messages */}
          {errors.length > 0 && (
            <div
              className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2"
              role="alert"
            >
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs text-danger-500">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Alert type */}
          <Select
            label={t('notifications.alertType', 'アラートタイプ')}
            id="alert-type"
            options={ALERT_TYPE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            value={type}
            onChange={(e) => setType(e.target.value as AlertRuleType)}
            required
            data-testid="alert-type-select"
          />

          {/* Ticker */}
          <Input
            label={t('notifications.ticker', 'ティッカー')}
            id="alert-ticker"
            type="text"
            placeholder="AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            required
            disabled={type === 'rebalance_drift'}
            helperText={
              type === 'rebalance_drift'
                ? t('notifications.rebalanceDriftHint', 'リバランス乖離はポートフォリオ全体を対象とします')
                : undefined
            }
            data-testid="alert-ticker-input"
          />

          {/* Target value */}
          <Input
            label={targetLabel}
            id="alert-target-value"
            type="number"
            step="any"
            min="0.01"
            placeholder={targetPlaceholder}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            required
            data-testid="alert-target-value-input"
          />
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={submitting}
            data-testid="alert-cancel-button"
          >
            {t('common.cancel', 'キャンセル')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            data-testid="alert-submit-button"
          >
            {t('notifications.create', '作成')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default PriceAlertDialog;
