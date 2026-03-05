import { vi } from "vitest";
/**
 * InitialSetupWizard.jsx のユニットテスト
 * 初期設定ウィザードのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InitialSetupWizard from '../../../../components/common/InitialSetupWizard';

// usePortfolioContextのモック
vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';

// i18next のモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// モックコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  setBaseCurrency: vi.fn(),
  setAdditionalBudget: vi.fn(),
  addNotification: vi.fn(),
  ...overrides
});

describe('InitialSetupWizard', () => {
  let mockOnComplete;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnComplete = vi.fn();
  });

  describe('ステップ1: 基本設定', () => {
    it('初期表示でステップ1が表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
      expect(screen.getByText('まず、基本的な設定から始めましょう。')).toBeInTheDocument();
      expect(screen.getByText('表示通貨を選択してください')).toBeInTheDocument();
      expect(screen.getByText('¥ 日本円')).toBeInTheDocument();
      expect(screen.getByText('$ 米ドル')).toBeInTheDocument();
    });

    it('デフォルトでJPYが選択されている', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      const jpyButton = screen.getByText('¥ 日本円').closest('button');
      const usdButton = screen.getByText('$ 米ドル').closest('button');

      expect(jpyButton).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(usdButton).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('通貨を切り替えることができる', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      const jpyButton = screen.getByText('¥ 日本円').closest('button');
      const usdButton = screen.getByText('$ 米ドル').closest('button');
      
      // USDに切り替え
      fireEvent.click(usdButton);
      expect(usdButton).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(jpyButton).not.toHaveClass('border-blue-500', 'bg-blue-50');
      
      // JPYに戻す
      fireEvent.click(jpyButton);
      expect(jpyButton).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(usdButton).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('次へボタンでステップ2に進む', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // ステップ2の内容が表示される
      expect(screen.getByText('投資予算の設定')).toBeInTheDocument();
      expect(mockContext.setBaseCurrency).toHaveBeenCalledWith('JPY');
    });
  });

  describe('ステップ2: 投資予算', () => {
    it('ステップ2の内容が正しく表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(screen.getByText('投資予算の設定')).toBeInTheDocument();
      expect(screen.getByText('今回の投資に使用する予算を入力してください。')).toBeInTheDocument();
      // プレースホルダーでinput要素を確認
      expect(screen.getByPlaceholderText('300000')).toBeInTheDocument();
      expect(screen.getByText('¥')).toBeInTheDocument();
    });

    it('USDを選択した場合は$記号が表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // USDを選択
      fireEvent.click(screen.getByText('$ 米ドル').closest('button'));
      
      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('予算を入力せずに次へをクリックすると警告が表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 予算を入力せずに次へ
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '投資予算を入力してください',
        'warning'
      );
    });

    it('予算を入力して次へをクリックするとステップ3に進む', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 予算を入力
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });

      // 次へ
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(mockContext.setAdditionalBudget).toHaveBeenCalledWith(500000, 'JPY');
      expect(screen.getByText('投資対象の選択')).toBeInTheDocument();
    });

    it('戻るボタンでステップ1に戻る', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 戻るボタンをクリック
      fireEvent.click(screen.getByRole('button', { name: '戻る' }));

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
    });
  });

  describe('ステップ3: 投資スタイル', () => {
    const goToStep3 = () => {
      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
      
      // 予算を入力
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });
      
      // ステップ3に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    };

    it('ステップ3の内容が正しく表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      goToStep3();

      expect(screen.getByText('投資対象の選択')).toBeInTheDocument();
      expect(screen.getByText('どの市場に投資したいですか？複数選択可能です。')).toBeInTheDocument();
      expect(screen.getByText('米国市場')).toBeInTheDocument();
      expect(screen.getByText('日本市場')).toBeInTheDocument();
      expect(screen.getByText('全世界')).toBeInTheDocument();
      expect(screen.getByText('REIT')).toBeInTheDocument();
    });

    it('投資対象を選択せずに完了をクリックすると警告が表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      goToStep3();

      // 投資対象を選択せずに完了
      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '投資対象を選択してください',
        'warning'
      );
    });

    it('投資対象を選択できる', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      goToStep3();

      // 米国市場を選択
      const usButton = screen.getByText('米国市場').closest('button');
      fireEvent.click(usButton);
      
      // 選択状態の確認（MarketSelectionWizardの動作）
      expect(usButton).toHaveClass('scale-105');
    });

    it('完了ボタンで設定が完了する', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      goToStep3();

      // 投資対象を選択
      fireEvent.click(screen.getByText('米国市場').closest('button'));

      // 完了
      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '初期設定が完了しました',
        'success'
      );
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('プログレスバー', () => {
    it('各ステップでプログレスバーが正しく表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ1
      let progressBar = screen.getByText('基本設定').parentElement.nextElementSibling.firstChild;
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
      progressBar = screen.getByText('基本設定').parentElement.nextElementSibling.firstChild;
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' });

      // ステップ3に進む
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
      progressBar = screen.getByText('基本設定').parentElement.nextElementSibling.firstChild;
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('各ステップのラベルが正しくハイライトされる', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ1
      expect(screen.getByText('基本設定')).toHaveClass('text-blue-600', 'font-semibold');
      expect(screen.getByText('投資予算')).toHaveClass('text-gray-400');
      expect(screen.getByText('投資対象')).toHaveClass('text-gray-400');
    });
  });

  describe('オーバーレイとモーダル', () => {
    it('オーバーレイが正しく表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      const overlay = screen.getByText('Portfolio Wiseへようこそ！').closest('.fixed');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
    });

    it('ModernCardが正しく使用される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      const card = screen.getByText('Portfolio Wiseへようこそ！').closest('.max-w-2xl');
      expect(card).toHaveClass('max-w-2xl', 'w-full', 'mx-4', 'max-h-[90vh]', 'overflow-y-auto');
    });
  });

  describe('エッジケース', () => {
    it('0や負の値の予算を入力した場合の処理', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 0を入力
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '0' } });

      // 次へ
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '投資予算を入力してください',
        'warning'
      );
    });

    it('市場アイコンが正しく表示される', () => {
      const mockContext = createMockContext();

      usePortfolioContext.mockReturnValue(mockContext);
      render(
        <InitialSetupWizard onComplete={mockOnComplete} />
      );

      // ステップ3に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 市場アイコンが表示される
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });
  });
});