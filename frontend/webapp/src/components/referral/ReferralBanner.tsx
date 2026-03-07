/**
 * ReferralBanner — ランディングページ用リファラルバナー
 *
 * ?ref= パラメータが URL に含まれている場合に
 * 招待特典の情報を表示するバナーコンポーネント。
 *
 * @file src/components/referral/ReferralBanner.tsx
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { validateReferralCode } from '../../services/referralService';

// ─── アイコン SVG ────────────────────────────────
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// ─── コンポーネント ──────────────────────────────
const ReferralBanner: React.FC = () => {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode && refCode.trim().length > 0) {
      const normalized = refCode.trim().toUpperCase();
      setReferralCode(normalized);

      // コードの有効性を非同期で検証
      validateReferralCode(normalized)
        .then((result) => setIsValid(result.valid))
        .catch(() => setIsValid(false));
    }
  }, []);

  // ?ref= がない場合は何も表示しない
  if (!referralCode) return null;

  // 検証中
  if (isValid === null) {
    return (
      <div className="mb-6 max-w-3xl mx-auto" data-testid="referral-banner">
        <Card padding="medium" className="border-primary-500/30 bg-primary-50/50 dark:bg-primary-500/5">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-10 h-10 bg-primary-100 dark:bg-primary-500/20 rounded-full" />
            <div className="animate-pulse flex-1 space-y-2">
              <div className="h-4 bg-primary-100 dark:bg-primary-500/20 rounded w-3/4" />
              <div className="h-3 bg-primary-100 dark:bg-primary-500/20 rounded w-1/2" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 無効なコード
  if (!isValid) return null;

  return (
    <div className="mb-6 max-w-3xl mx-auto" data-testid="referral-banner">
      <Card padding="medium" className="border-primary-500/30 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-500/10 dark:to-primary-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/10 dark:bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t('referral.bannerTitle', '招待リンクからのアクセスです')}
              </h3>
              <Badge variant="success">
                {t('referral.bannerBadge', '特典あり')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'referral.bannerDescription',
                '今すぐ無料登録すると、あなたと紹介者の両方にStandardプラン1ヶ月分の無料特典が付与されます。'
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReferralBanner;
