/**
 * InitialSetupWizard.jsx のユニットテスト
 * 初期設定ウィザードのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InitialSetupWizard from '../../../../components/common/InitialSetupWizard';
import { PortfolioContext } from '../../../../context/PortfolioContext';

// モックコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  setBaseCurrency: jest.fn(),
  setAdditionalBudget: jest.fn(),
  addNotification: jest.fn(),
  ...overrides
});

describe('InitialSetupWizard', () => {
  let mockOnComplete;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnComplete = jest.fn();
  });

  describe('ステップ1: 基本設定', () => {
    it('初期表示でステップ1が表示される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
      expect(screen.getByText('まず、基本的な設定から始めましょう。')).toBeInTheDocument();
      expect(screen.getByText('表示通貨を選択してください')).toBeInTheDocument();
      expect(screen.getByText('¥ 日本円')).toBeInTheDocument();
      expect(screen.getByText('$ 米ドル')).toBeInTheDocument();
    });

    it('デフォルトでJPYが選択されている', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      const jpyButton = screen.getByText('¥ 日本円').closest('button');
      const usdButton = screen.getByText('$ 米ドル').closest('button');

      expect(jpyButton).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(usdButton).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('通貨を切り替えることができる', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      // USDを選択
      fireEvent.click(screen.getByText('$ 米ドル').closest('button'));
      
      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('予算を入力せずに次へをクリックすると警告が表示される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      // ステップ2に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // 予算を入力
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });

      // 次へ
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(mockContext.setAdditionalBudget).toHaveBeenCalledWith(500000, 'JPY');
      expect(screen.getByText('投資スタイルの選択')).toBeInTheDocument();
    });

    it('戻るボタンでステップ1に戻る', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      goToStep3();

      expect(screen.getByText('投資スタイルの選択')).toBeInTheDocument();
      expect(screen.getByText('あなたの投資スタイルを教えてください。')).toBeInTheDocument();
      expect(screen.getByText('安定重視')).toBeInTheDocument();
      expect(screen.getByText('バランス型')).toBeInTheDocument();
      expect(screen.getByText('成長重視')).toBeInTheDocument();
      expect(screen.getByText('積極型')).toBeInTheDocument();
    });

    it('投資スタイルを選択せずに完了をクリックすると警告が表示される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      goToStep3();

      // 投資スタイルを選択せずに完了
      fireEvent.click(screen.getByRole('button', { name: '設定を完了' }));

      expect(mockContext.addNotification).toHaveBeenCalledWith(
        '投資スタイルを選択してください',
        'warning'
      );
    });

    it('投資スタイルを選択できる', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      goToStep3();

      // 異なるスタイルを試す
      const conservativeButton = screen.getByText('安定重視').closest('button');
      const balancedButton = screen.getByText('バランス型').closest('button');
      
      // 安定重視を選択
      fireEvent.click(conservativeButton);
      expect(conservativeButton).toHaveClass('border-blue-500', 'bg-blue-50');
      
      // バランス型に変更
      fireEvent.click(balancedButton);
      expect(balancedButton).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(conservativeButton).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('完了ボタンで設定が完了する', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      goToStep3();

      // 投資スタイルを選択
      fireEvent.click(screen.getByText('バランス型').closest('button'));

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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      // ステップ1
      expect(screen.getByText('基本設定')).toHaveClass('text-blue-600', 'font-semibold');
      expect(screen.getByText('投資予算')).toHaveClass('text-gray-400');
      expect(screen.getByText('投資スタイル')).toHaveClass('text-gray-400');
    });
  });

  describe('オーバーレイとモーダル', () => {
    it('オーバーレイが正しく表示される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      const overlay = screen.getByText('Portfolio Wiseへようこそ！').closest('.fixed');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
    });

    it('ModernCardが正しく使用される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      const card = screen.getByText('Portfolio Wiseへようこそ！').closest('.max-w-2xl');
      expect(card).toHaveClass('max-w-2xl', 'w-full', 'mx-4', 'max-h-[90vh]', 'overflow-y-auto');
    });
  });

  describe('エッジケース', () => {
    it('0や負の値の予算を入力した場合の処理', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
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

    it('アイコンが正しく表示される', () => {
      const mockContext = createMockContext();

      render(
        <PortfolioContext.Provider value={mockContext}>
          <InitialSetupWizard onComplete={mockOnComplete} />
        </PortfolioContext.Provider>
      );

      // ステップ3に進む
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
      const input = screen.getByPlaceholderText('300000');
      fireEvent.change(input, { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      // アイコンが表示される
      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('⚖️')).toBeInTheDocument();
      expect(screen.getByText('📈')).toBeInTheDocument();
      expect(screen.getByText('🚀')).toBeInTheDocument();
    });
  });
});