/**
 * ReferralSection — ダッシュボード用リファラルカード
 *
 * ユーザーのリファラルコードを表示し、コピー機能を提供する。
 * 紹介統計も簡易表示する。
 *
 * @file src/components/referral/ReferralSection.tsx
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useReferralCode, useReferralStats } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import { trackEvent, AnalyticsEvents } from '../../utils/analytics';

// ─── アイコン SVG ────────────────────────────────
const GiftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// ─── コンポーネント ──────────────────────────────
const ReferralSection: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: referralCode, isPending: codeLoading } = useReferralCode({ enabled: isAuthenticated });
  const { data: stats } = useReferralStats({ enabled: isAuthenticated });
  const loading = codeLoading;
  const [copied, setCopied] = useState(false);

  const referralUrl = referralCode
    ? `${window.location.origin}/?ref=${referralCode.referralCode}`
    : '';

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      trackEvent(AnalyticsEvents.REFERRAL_CODE_COPY, {
        code: referralCode?.referralCode,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: 古いブラウザ対応
      const textarea = document.createElement('textarea');
      textarea.value = referralUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralUrl, referralCode]);

  if (!isAuthenticated) return null;

  return (
    <Card padding="large" data-testid="referral-section">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-500/10 rounded-lg flex items-center justify-center">
            <GiftIcon className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <CardTitle>
              {t('referral.sectionTitle', '友達を招待する')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('referral.sectionSubtitle', '紹介が成功すると1ヶ月分の無料特典')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && !referralCode ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* リファラルコード表示 + コピーボタン */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2.5 font-mono text-sm tracking-wider text-foreground select-all">
                {referralCode?.referralCode || '---'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!referralCode}
                className="flex items-center gap-1.5 min-w-[80px]"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-success-500" />
                    <span className="text-success-500">
                      {t('referral.copied', 'OK')}
                    </span>
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    <span>{t('referral.copy', 'コピー')}</span>
                  </>
                )}
              </Button>
            </div>

            {/* 紹介URLの表示 */}
            {referralUrl && (
              <p className="text-xs text-muted-foreground break-all">
                {referralUrl}
              </p>
            )}

            {/* 統計情報 */}
            {stats && (
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground font-mono tabular-nums">
                    {stats.totalReferrals}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('referral.totalReferrals', '紹介数')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground font-mono tabular-nums">
                    {stats.successfulConversions}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('referral.conversions', '成約')}
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant={stats.rewardMonths > 0 ? 'success' : 'secondary'}>
                    {stats.rewardMonths} / {stats.maxRewardMonths}{' '}
                    {t('referral.months', 'ヶ月')}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('referral.reward', '無料特典')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
