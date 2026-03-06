/**
 * ExternalAILinks
 *
 * 外部 AI サービスへの「コピーして開く」リンクカード。
 * クリップボードにコピー → 通知 → 新タブで AI サービスを開く。
 *
 * @file src/components/ai/ExternalAILinks.tsx
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface ExternalAILinksProps {
  textToCopy: string;
  className?: string;
}

interface AIService {
  id: string;
  name: string;
  url: string;
  icon: string;
  descJa: string;
  descEn: string;
  gradient: string;
}

const AI_SERVICES: AIService[] = [
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    icon: '🎯',
    descJa: '長期戦略・詳細分析',
    descEn: 'Long-term Strategy',
    gradient: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    icon: '🔍',
    descJa: '最新情報・市場分析',
    descEn: 'Latest Info & Markets',
    gradient: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    icon: '💬',
    descJa: '対話・創造的思考',
    descEn: 'Interactive & Creative',
    gradient: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
  },
];

const ExternalAILinks: React.FC<ExternalAILinksProps> = ({
  textToCopy,
  className,
}) => {
  const { i18n } = useTranslation();
  const isJapanese = i18n.language === 'ja';

  const handleCopyAndOpen = useCallback(
    async (service: AIService) => {
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      window.open(service.url, '_blank', 'noopener,noreferrer');
    },
    [textToCopy]
  );

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-3', className)}>
      {AI_SERVICES.map((service) => (
        <button
          key={service.id}
          onClick={() => handleCopyAndOpen(service)}
          className={cn(
            'p-3 rounded-lg transition-all duration-200 text-white text-center bg-gradient-to-br',
            service.gradient
          )}
        >
          <div className="text-lg mb-1">{service.icon}</div>
          <div className="font-medium">{service.name}</div>
          <div className="text-xs opacity-80">
            {isJapanese ? service.descJa : service.descEn}
          </div>
          <div className="text-[10px] opacity-60 mt-1">
            {isJapanese ? 'コピーして開く' : 'Copy & Open'}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ExternalAILinks;
