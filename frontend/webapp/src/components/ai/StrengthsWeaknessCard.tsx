/**
 * StrengthsWeaknessCard
 *
 * PF スコアの最強 / 最弱指標をローカル計算で 1 行ずつ表示するカード。
 * 「AI分析を見る」リンクで /ai-advisor へナビゲートする。
 *
 * @file src/components/ai/StrengthsWeaknessCard.tsx
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { EnrichedPortfolioData } from '../../utils/portfolioDataEnricher';

interface StrengthsWeaknessCardProps {
  enrichedData: EnrichedPortfolioData;
}

const StrengthsWeaknessCard: React.FC<StrengthsWeaknessCardProps> = ({
  enrichedData,
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isJapanese = i18n.language === 'ja';

  return (
    <Card
      elevation="low"
      padding="medium"
      data-testid="strengths-weakness-card"
    >
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {isJapanese ? 'ポートフォリオ・インサイト' : 'Portfolio Insights'}
        </h3>

        <div className="space-y-2">
          {/* Strength */}
          <div className="flex items-start gap-2">
            <Badge variant="success" className="shrink-0 mt-0.5">
              {isJapanese ? '強み' : 'Strength'}
            </Badge>
            <span className="text-sm text-foreground leading-snug">
              {enrichedData.strengthLine}
            </span>
          </div>

          {/* Weakness */}
          <div className="flex items-start gap-2">
            <Badge variant="danger" className="shrink-0 mt-0.5">
              {isJapanese ? '弱み' : 'Weakness'}
            </Badge>
            <span className="text-sm text-foreground leading-snug">
              {enrichedData.weaknessLine}
            </span>
          </div>
        </div>

        {/* AI Analysis Link */}
        <button
          onClick={() => navigate('/ai-advisor')}
          className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 transition-colors font-medium pt-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          {isJapanese ? 'AI分析を見る' : 'View AI Analysis'}
        </button>
      </div>
    </Card>
  );
};

export default StrengthsWeaknessCard;
