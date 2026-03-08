/**
 * StrengthsWeaknessCard smoke render tests
 *
 * ポートフォリオ強み/弱みカードの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/ai/StrengthsWeaknessCard.test.tsx
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import StrengthsWeaknessCard from '../../../../components/ai/StrengthsWeaknessCard';

describe('StrengthsWeaknessCard', () => {
  const enrichedData = {
    strengthLine: '地域分散が優れています',
    weaknessLine: '債券比率が低いです',
  } as any;

  it('should render strength and weakness lines', () => {
    render(<StrengthsWeaknessCard enrichedData={enrichedData} />);
    expect(screen.getByText('地域分散が優れています')).toBeInTheDocument();
    expect(screen.getByText('債券比率が低いです')).toBeInTheDocument();
  });

  it('should render strength and weakness badges', () => {
    render(<StrengthsWeaknessCard enrichedData={enrichedData} />);
    expect(screen.getByText('強み')).toBeInTheDocument();
    expect(screen.getByText('弱み')).toBeInTheDocument();
  });

  it('should render AI analysis link', () => {
    render(<StrengthsWeaknessCard enrichedData={enrichedData} />);
    expect(screen.getByText('AI分析を見る')).toBeInTheDocument();
  });

  it('should have proper test id', () => {
    render(<StrengthsWeaknessCard enrichedData={enrichedData} />);
    expect(
      screen.getByTestId('strengths-weakness-card')
    ).toBeInTheDocument();
  });
});
