/**
 * ExternalAILinks smoke render tests
 *
 * 外部AIサービスリンクの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/ai/ExternalAILinks.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import ExternalAILinks from '../../../../components/ai/ExternalAILinks';

describe('ExternalAILinks', () => {
  it('should render all three AI service links', () => {
    render(<ExternalAILinks textToCopy="test prompt" />);
    expect(screen.getByTestId('external-ai-links')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
  });

  it('should display Japanese descriptions', () => {
    render(<ExternalAILinks textToCopy="test prompt" />);
    expect(screen.getByText('長期戦略・詳細分析')).toBeInTheDocument();
    expect(screen.getByText('最新情報・市場分析')).toBeInTheDocument();
    expect(screen.getByText('対話・創造的思考')).toBeInTheDocument();
  });
});
