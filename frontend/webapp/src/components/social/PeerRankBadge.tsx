/**
 * PeerRankBadge — ピアランキングバッジ
 *
 * ユーザーのポートフォリオスコアが同年代で上位何%かを表示する。
 * Top 10%: ゴールド, Top 25%: シルバー, Top 50%: ブロンズ
 *
 * @file src/components/social/PeerRankBadge.tsx
 */
import React from 'react';
import { cn } from '../../lib/utils';

interface PeerRankBadgeProps {
  percentile: number; // 1-100 (1 = top 1%, 100 = bottom)
  className?: string;
}

const PeerRankBadge: React.FC<PeerRankBadgeProps> = ({ percentile, className }) => {
  const getTier = () => {
    if (percentile <= 10) {
      return {
        label: `Top ${percentile}%`,
        tier: 'gold',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mr-1"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
        style: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
      };
    }
    if (percentile <= 25) {
      return {
        label: `Top ${percentile}%`,
        tier: 'silver',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mr-1"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
        style: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
      };
    }
    if (percentile <= 50) {
      return {
        label: `Top ${percentile}%`,
        tier: 'bronze',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mr-1"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
        style: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30',
      };
    }
    return {
      label: `Top ${percentile}%`,
      tier: 'participant',
      icon: null,
      style: 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20',
    };
  };

  const tier = getTier();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
        tier.style,
        className
      )}
      title={`ポートフォリオスコアランキング: 上位 ${percentile}%`}
    >
      {tier.icon}
      {tier.label}
    </div>
  );
};

export default PeerRankBadge;
