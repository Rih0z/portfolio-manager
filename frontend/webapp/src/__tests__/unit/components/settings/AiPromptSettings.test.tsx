/**
 * AiPromptSettings smoke render tests
 *
 * AI分析プロンプト設定の基本レンダリングと操作を検証する。
 * @file src/__tests__/unit/components/settings/AiPromptSettings.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
const mockPortfolioContext: Record<string, any> = {
  aiPromptTemplate: null,
  updateAiPromptTemplate: vi.fn(),
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

import AiPromptSettings from '../../../../components/settings/AiPromptSettings';

describe('AiPromptSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.aiPromptTemplate = null;
    mockPortfolioContext.updateAiPromptTemplate = vi.fn();
  });

  it('should render heading and description', () => {
    render(<AiPromptSettings />);
    expect(screen.getByText('AI分析プロンプト設定')).toBeInTheDocument();
    expect(
      screen.getByText(/シミュレーションタブで使用するAI分析プロンプト/)
    ).toBeInTheDocument();
  });

  it('should render textarea with default template', () => {
    render(<AiPromptSettings />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toContain(
      'あなたは投資分析に特化した AI アシスタントです'
    );
  });

  it('should render save and reset buttons', () => {
    render(<AiPromptSettings />);
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('デフォルトに戻す')).toBeInTheDocument();
  });

  it('should call updateAiPromptTemplate when save is clicked', () => {
    render(<AiPromptSettings />);
    fireEvent.click(screen.getByText('保存'));
    expect(mockPortfolioContext.updateAiPromptTemplate).toHaveBeenCalled();
  });

  it('should render placeholder explanations', () => {
    render(<AiPromptSettings />);
    // The placeholder list uses code elements for variable names
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(4);
  });

  it('should render info section about AI prompt usage', () => {
    render(<AiPromptSettings />);
    expect(screen.getByText('AI分析プロンプトについて')).toBeInTheDocument();
  });
});
