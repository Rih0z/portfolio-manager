/**
 * ReferralStatsCard — リファラル詳細統計カード
 *
 * リファラルプログラムの詳細な統計情報を表示するカード。
 * 紹介数、成約数、獲得した無料月数をプログレスバー付きで表示。
 *
 * @file src/components/referral/ReferralStatsCard.tsx
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useReferralStats } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';

// ─── アイコン SVG ────────────────────────────────
const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── コンポーネント ──────────────────────────────
const ReferralStatsCard: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: stats, isPending: loading } = useReferralStats({ enabled: isAuthenticated });

  if (!isAuthenticated) return null;

  const rewardProgress = stats
    ? Math.round((stats.rewardMonths / stats.maxRewardMonths) * 100)
    : 0;

  return (
    <Card padding="large" data-testid="referral-stats-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {t('referral.statsTitle', 'リファラル実績')}
          </CardTitle>
          {stats && stats.rewardMonths > 0 && (
            <Badge variant="success">
              {stats.rewardMonths}{t('referral.monthsFree', 'ヶ月無料獲得')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading && !stats ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-8 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3 mx-auto" />
                </div>
              ))}
            </div>
            <div className="h-2 bg-muted rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 統計カード3列 */}
            <div className="grid grid-cols-3 gap-4">
              {/* 紹介数 */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 mx-auto mb-2 bg-primary-50 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
                  <UsersIcon className="w-4 h-4 text-primary-500" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {stats?.totalReferrals ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referral.totalReferrals', '紹介数')}
                </div>
              </div>

              {/* 成約数 */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 mx-auto mb-2 bg-success-50 dark:bg-success-500/10 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-success-500" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {stats?.successfulConversions ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referral.conversions', '成約')}
                </div>
              </div>

              {/* 獲得月数 */}
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 mx-auto mb-2 bg-warning-50 dark:bg-warning-500/10 rounded-full flex items-center justify-center">
                  <TrophyIcon className="w-4 h-4 text-warning-500" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {stats?.rewardMonths ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('referral.reward', '無料特典')}
                </div>
              </div>
            </div>

            {/* プログレスバー */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t('referral.progressLabel', '無料特典の進捗')}
                </span>
                <span className="font-mono tabular-nums">
                  {stats?.rewardMonths ?? 0} / {stats?.maxRewardMonths ?? 12}{' '}
                  {t('referral.months', 'ヶ月')}
                </span>
              </div>
              <Progress value={rewardProgress} />
            </div>

            {/* 説明テキスト */}
            <p className="text-xs text-muted-foreground text-center">
              {t(
                'referral.statsDescription',
                '友達が登録しStandardプランに加入すると、あなたと友達の両方に1ヶ月分の無料特典が付与されます（最大12ヶ月）。'
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralStatsCard;
