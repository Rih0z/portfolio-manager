/**
 * NPSSurvey コンポーネント テスト
 * @file src/__tests__/unit/components/NPSSurvey.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NPSSurvey from '../../../components/survey/NPSSurvey';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
    i18n: { language: 'ja', changeLanguage: vi.fn() },
  }),
}));

// useNPSSurvey モック
const mockSubmit = vi.fn();
const mockDismiss = vi.fn();
let mockShouldShow = true;

vi.mock('../../../hooks/useNPSSurvey', () => ({
  useNPSSurvey: () => ({
    shouldShow: mockShouldShow,
    submit: mockSubmit,
    dismiss: mockDismiss,
  }),
  getNPSCategory: (score: number) => {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  },
}));

describe('NPSSurvey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldShow = true;
  });

  it('shouldShowがtrueのとき表示される', () => {
    render(<NPSSurvey />);
    expect(screen.getByTestId('nps-survey')).toBeInTheDocument();
  });

  it('shouldShowがfalseのとき非表示', () => {
    mockShouldShow = false;
    render(<NPSSurvey />);
    expect(screen.queryByTestId('nps-survey')).not.toBeInTheDocument();
  });

  it('タイトルが表示される', () => {
    render(<NPSSurvey />);
    expect(screen.getByText('PortfolioWise をおすすめしますか？')).toBeInTheDocument();
  });

  it('0-10のスコアボタンが表示される', () => {
    render(<NPSSurvey />);
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByRole('button', { name: `${i} 点` })).toBeInTheDocument();
    }
  });

  it('スコアボタンをクリックするとコメントステップに遷移する', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '9 点' }));
    // promoterメッセージが表示される
    expect(screen.getByText('嬉しいです！特に気に入っている点を教えてください。')).toBeInTheDocument();
  });

  it('detractorスコアでは適切なメッセージが表示される', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '3 点' }));
    expect(screen.getByText('申し訳ありません。どうすれば改善できるか教えてください。')).toBeInTheDocument();
  });

  it('passiveスコアでは適切なメッセージが表示される', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '7 点' }));
    expect(screen.getByText('もっと良くするために、改善点を教えてください。')).toBeInTheDocument();
  });

  it('送信ボタンをクリックするとsubmitが呼ばれる', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '10 点' }));
    fireEvent.click(screen.getByText('送信'));
    expect(mockSubmit).toHaveBeenCalledWith(10, undefined);
  });

  it('コメント入力後に送信するとコメント付きでsubmitが呼ばれる', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '8 点' }));
    const textarea = screen.getByLabelText('フィードバックコメント');
    fireEvent.change(textarea, { target: { value: 'とても使いやすい' } });
    fireEvent.click(screen.getByText('送信'));
    expect(mockSubmit).toHaveBeenCalledWith(8, 'とても使いやすい');
  });

  it('閉じるボタンをクリックするとdismissが呼ばれる', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByLabelText('閉じる'));
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('戻るボタンでスコア選択に戻れる', () => {
    render(<NPSSurvey />);
    fireEvent.click(screen.getByRole('button', { name: '5 点' }));
    expect(screen.getByText('戻る')).toBeInTheDocument();
    fireEvent.click(screen.getByText('戻る'));
    // スコアボタンが再表示される
    expect(screen.getByRole('button', { name: '5 点' })).toBeInTheDocument();
  });

  it('アクセシビリティ属性が設定されている', () => {
    render(<NPSSurvey />);
    const dialog = screen.getByTestId('nps-survey');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-label', 'NPS調査');
  });
});
