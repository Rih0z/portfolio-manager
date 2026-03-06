/**
 * AnalysisPerspectiveTabs
 *
 * 3 つの分析観点（リスク分析 / コスト最適化 / 成長戦略）を
 * タブ切替で表示し、各観点ごとに最適化されたプロンプトを生成する。
 *
 * @file src/components/ai/AnalysisPerspectiveTabs.tsx
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabPanel } from '../ui/tabs';
import { Card } from '../ui/card';
import CopyToClipboard from './CopyToClipboard';
import ExternalAILinks from './ExternalAILinks';
import promptOrchestrationService from '../../services/PromptOrchestrationService';
import type { AnalysisPerspective } from '../../services/PromptOrchestrationService';
import type { EnrichedPortfolioData } from '../../utils/portfolioDataEnricher';

interface AnalysisPerspectiveTabsProps {
  enrichedData: EnrichedPortfolioData;
  userContext: Record<string, any>;
}

const PERSPECTIVES: Array<{
  id: AnalysisPerspective;
  labelJa: string;
  labelEn: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'risk_analysis',
    labelJa: 'リスク分析',
    labelEn: 'Risk Analysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  {
    id: 'cost_optimization',
    labelJa: 'コスト最適化',
    labelEn: 'Cost Optimization',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'growth_strategy',
    labelJa: '成長戦略',
    labelEn: 'Growth Strategy',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const AnalysisPerspectiveTabs: React.FC<AnalysisPerspectiveTabsProps> = ({
  enrichedData,
  userContext,
}) => {
  const { i18n } = useTranslation();
  const isJapanese = i18n.language === 'ja';
  const [activeTab, setActiveTab] = useState<string>('risk_analysis');

  const tabs = PERSPECTIVES.map((p) => ({
    id: p.id,
    label: isJapanese ? p.labelJa : p.labelEn,
    icon: p.icon,
  }));

  // Generate prompts lazily per perspective
  const generatedPrompts = useMemo(() => {
    const result: Record<string, string> = {};
    for (const p of PERSPECTIVES) {
      const prompt = promptOrchestrationService.generatePerspectivePrompt(
        p.id,
        enrichedData,
        userContext
      );
      result[p.id] = prompt.content;
    }
    return result;
  }, [enrichedData, userContext]);

  const currentPrompt = generatedPrompts[activeTab] || '';

  return (
    <Card elevation="medium" padding="medium">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">
          {isJapanese ? 'AI分析プロンプト' : 'AI Analysis Prompts'}
        </h3>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pills"
        />

        {PERSPECTIVES.map((p) => (
          <TabPanel key={p.id} tabId={p.id} activeTab={activeTab}>
            <div className="space-y-4">
              {/* Prompt display */}
              <div className="bg-muted rounded-lg p-4 border border-border">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-foreground">
                    {isJapanese ? '生成プロンプト' : 'Generated Prompt'}
                  </h4>
                  <CopyToClipboard text={currentPrompt} mode="button" />
                </div>
                <div className="bg-background rounded p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {currentPrompt}
                  </pre>
                </div>
              </div>

              {/* External AI links */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  {isJapanese ? 'AIで分析する' : 'Analyze with AI'}
                </h4>
                <ExternalAILinks textToCopy={currentPrompt} />
              </div>
            </div>
          </TabPanel>
        ))}
      </div>
    </Card>
  );
};

export default AnalysisPerspectiveTabs;
