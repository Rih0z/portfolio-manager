import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import AiPromptSettings from '@/components/settings/AiPromptSettings';

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

const DEFAULT_SUBSTRING = 'あなたは投資分析に特化した AI アシスタントです';

describe('AiPromptSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ legacyFakeTimers: true });
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders default template when no template is provided', () => {
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: null,
      updateAiPromptTemplate: vi.fn()
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain(DEFAULT_SUBSTRING);
  });

  it('allows editing and saving template', async () => {
    const updateAiPromptTemplate = vi.fn();
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: 'Initial Template',
      updateAiPromptTemplate
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Initial Template');

    const user = userEvent.setup();
    await user.clear(textarea);
    expect(textarea.value).toBe('');
    await user.type(textarea, 'New Template');

    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    expect(updateAiPromptTemplate).toHaveBeenCalledWith('New Template');
    expect(await screen.findByText('保存しました')).toBeInTheDocument();

    // タイマーでメッセージが非表示になる処理を即座に実行
    act(() => {
      vi.runAllTimers();
    });
  });

  it('reset button restores default template', async () => {
    usePortfolioContext.mockReturnValue({
      aiPromptTemplate: 'Custom Template',
      updateAiPromptTemplate: vi.fn()
    });

    render(<AiPromptSettings />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Custom Template');

    const resetButton = screen.getByText('デフォルトに戻す');
    const user = userEvent.setup();
    await user.click(resetButton);

    await waitFor(() => {
      expect(textarea.value).toContain(DEFAULT_SUBSTRING);
    });
  });
});
