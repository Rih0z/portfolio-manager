import { vi } from "vitest";
/**
 * InitialSetupWizard.jsx のユニットテスト
 * 1画面統合版の初期設定ウィザードテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InitialSetupWizard from '../../../../components/common/InitialSetupWizard';

// usePortfolioContextのモック
vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';

// モックコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  setBaseCurrency: vi.fn(),
  setAdditionalBudget: vi.fn(),
  addNotification: vi.fn(),
  ...overrides
});

// detectCurrency()はnavigator.languageを使うため、テスト環境でのデフォルト通貨を把握
const getDefaultCurrency = () => {
  const lang = navigator.language || 'ja';
  return lang.startsWith('ja') ? 'JPY' : 'USD';
};

describe('InitialSetupWizard', () => {
  let mockOnComplete;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnComplete = vi.fn();
  });

  describe('初期表示', () => {
    it('ウェルカムメッセージが表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
      expect(screen.getByText(/基本設定を行いましょう/)).toBeInTheDocument();
    });

    it('通貨選択ボタンが表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('表示通貨')).toBeInTheDocument();
      expect(screen.getByText('¥ 日本円')).toBeInTheDocument();
      expect(screen.getByText('$ 米ドル')).toBeInTheDocument();
    });

    it('予算入力フィールドが表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('投資予算（任意）')).toBeInTheDocument();
    });

    it('投資対象市場セクションが表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('投資対象市場')).toBeInTheDocument();
    });

    it('設定完了ボタンとスキップリンクが表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByRole('button', { name: '設定を完了' })).toBeInTheDocument();
      expect(screen.getByText('スキップしてダッシュボードへ')).toBeInTheDocument();
    });
  });

  describe('通貨選択', () => {
    it('デフォルト通貨が選択されている', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      const defaultCurrency = getDefaultCurrency();
      const selectedLabel = defaultCurrency === 'JPY' ? '¥ 日本円' : '$ 米ドル';
      const selectedButton = screen.getByText(selectedLabel).closest('button');
      expect(selectedButton).toHaveClass('border-primary-500');
    });

    it('通貨を切り替えることができる', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      // 初期と反対の通貨を選択
      const defaultCurrency = getDefaultCurrency();
      const targetLabel = defaultCurrency === 'JPY' ? '$ 米ドル' : '¥ 日本円';
      const targetButton = screen.getByText(targetLabel).closest('button');
      fireEvent.click(targetButton);

      expect(targetButton).toHaveClass('border-primary-500');
    });

    it('JPYを選択するとプレースホルダーが300000になる', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      // JPYを明示的に選択
      fireEvent.click(screen.getByText('¥ 日本円').closest('button'));

      expect(screen.getByPlaceholderText('300000')).toBeInTheDocument();
    });

    it('USDを選択するとプレースホルダーが2000になる', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      // USDを明示的に選択
      fireEvent.click(screen.getByText('$ 米ドル').closest('button'));

      expect(screen.getByPlaceholderText('2000')).toBeInTheDocument();
    });
  });

  describe('設定完了', () => {
    it('設定完了ボタンで通貨が設定され完了する', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      const defaultCurrency = getDefaultCurrency();
      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.setBaseCurrency).toHaveBeenCalledWith(defaultCurrency);
      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '初期設定が完了しました',
        'success'
      );
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('予算を入力して完了すると予算も設定される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      // JPYを明示的に選択してプレースホルダーを安定化
      fireEvent.click(screen.getByText('¥ 日本円').closest('button'));

      // 予算を入力
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });

      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.setAdditionalBudget).toHaveBeenCalledWith(500000, 'JPY');
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('予算未入力でも完了できる（任意フィールド）', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.setAdditionalBudget).not.toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('USDを選択して完了するとUSDで設定される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      // USDに切り替え
      fireEvent.click(screen.getByText('$ 米ドル').closest('button'));

      // 予算入力
      const input = screen.getByPlaceholderText('2000');
      fireEvent.change(input, { target: { value: '3000' } });

      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.setBaseCurrency).toHaveBeenCalledWith('USD');
      expect(mockContext.setAdditionalBudget).toHaveBeenCalledWith(3000, 'USD');
    });
  });

  describe('スキップ機能', () => {
    it('スキップボタンでデフォルト値で完了する', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      fireEvent.click(screen.getByText('スキップしてダッシュボードへ'));

      expect(mockContext.setBaseCurrency).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('オーバーレイとモーダル', () => {
    it('オーバーレイが正しく表示される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      const overlay = screen.getByTestId('initial-setup-wizard');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black/50', 'backdrop-blur-sm', 'flex', 'items-center', 'justify-center', 'z-50');
    });

    it('Cardコンポーネントが正しく使用される', () => {
      const mockContext = createMockContext();
      usePortfolioContext.mockReturnValue(mockContext);
      render(<InitialSetupWizard onComplete={mockOnComplete} />);

      const card = screen.getByText('Portfolio Wiseへようこそ！').closest('.max-w-2xl');
      expect(card).toHaveClass('max-w-2xl', 'w-full', 'mx-4', 'max-h-[90vh]', 'overflow-y-auto');
    });
  });
});
