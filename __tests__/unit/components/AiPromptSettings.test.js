import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiPromptSettings from '@/components/settings/AiPromptSettings';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

const DEFAULT_SUBSTRING = 'あなたは投資分析に特化した AI アシスタントです';

describe('AiPromptSettings', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders default template when no template is provided', () => {
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: null,
      updateAiPromptTemplate: jest.fn()
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain(DEFAULT_SUBSTRING);
  });

  it('allows editing and saving template', async () => {
    const updateAiPromptTemplate = jest.fn();
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: 'Initial Template',
      updateAiPromptTemplate
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Initial Template');

    await userEvent.clear(textarea);
    expect(textarea.value).toBe('');
    await userEvent.type(textarea, 'New Template');

    const saveButton = screen.getByText('保存');
    await userEvent.click(saveButton);

    expect(updateAiPromptTemplate).toHaveBeenCalledWith('New Template');
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('reset button restores default template', async () => {
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: 'Custom Template',
      updateAiPromptTemplate: jest.fn()
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Custom Template');

    const resetButton = screen.getByText('デフォルトに戻す');
    await userEvent.click(resetButton);

    expect(textarea.value).toContain(DEFAULT_SUBSTRING);
  });
});
